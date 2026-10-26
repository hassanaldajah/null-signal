// Binary file content for the VFS, where each char of a string is one byte (0-255).
// These are just the headers forensic tools read (magic bytes, gzip name) plus filler:
// nothing here is a working program, image or archive.
import { seeded } from './logs';

export function bin(...parts: (string | number[])[]): string {
  return parts.map((part) => (typeof part === 'string' ? part : String.fromCharCode(...part))).join('');
}

export const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
export const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** Deterministic random-looking bytes, like compressed or encrypted data. */
export function noise(length: number, seed: number): number[] {
  const rand = seeded(seed);
  return Array.from({ length }, () => Math.floor(rand() * 256));
}

/** gzip header (RFC 1952) with FNAME: the original name and time survive any rename. */
export function gzipStub(originalName: string, modified: string, size: number, seed: number): string {
  return bin([0x1f, 0x8b, 0x08, 0x08], le32(Date.parse(modified) / 1000), [0x00, 0x03], `${originalName}\0`, noise(size, seed));
}

/** First bytes of a 64-bit Linux program (ELF header fields), then placeholder text. No code. */
export function elfStub(text: string): string {
  return bin([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], Array(8).fill(0), [0x02, 0x00, 0x3e, 0x00, 0x01, 0x00, 0x00, 0x00], Array(40).fill(0), text);
}

/** PNG signature and IHDR chunk header, then filler. */
export function pngStub(width: number, height: number, size: number, seed: number): string {
  return bin([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0, 0, 0, 13], 'IHDR', be32(width), be32(height), [8, 6, 0, 0, 0], noise(size, seed));
}

const be16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];

/** Like noise() but never printable, so `strings` only finds the text placed on purpose. */
export function opaque(length: number, seed: number): number[] {
  return noise(length, seed).map((byte) => (byte >= 0x20 && byte < 0x7f ? byte | 0x80 : byte));
}

type TiffValue = { type: 2; text: string } | { type: 3 | 4; nums: number[] } | { type: 5; rationals: [number, number][] };
type Ifd = [tag: number, value: TiffValue][];

const ascii = (text: string): TiffValue => ({ type: 2, text });

function tiffBytes(value: TiffValue): number[] {
  if (value.type === 2) return [...Array.from(value.text, (c) => c.charCodeAt(0)), 0];
  if (value.type === 5) return value.rationals.flatMap(([num, den]) => [...be32(num), ...be32(den)]);
  return value.nums.flatMap(value.type === 3 ? be16 : be32);
}

const tiffCount = (value: TiffValue) => (value.type === 2 ? value.text.length + 1 : value.type === 5 ? value.rationals.length : value.nums.length);

/** Big-endian TIFF block: IFDs written one after another, each followed by its long values. */
function tiff(ifds: Ifd[], links: [from: number, tag: number, to: number][]): number[] {
  const pointers = links.map(([from, tag]) => { const value = { type: 4 as const, nums: [0] }; ifds[from].push([tag, value]); return value; });
  const sizes = ifds.map((ifd) => 6 + ifd.length * 12 + ifd.reduce((sum, [, v]) => { const n = tiffBytes(v).length; return sum + (n > 4 ? n + (n % 2) : 0); }, 0));
  const starts = sizes.map((_, i) => 8 + sizes.slice(0, i).reduce((a, b) => a + b, 0));
  links.forEach(([, , to], i) => { pointers[i].nums[0] = starts[to]; });
  const out: number[] = [0x4d, 0x4d, 0x00, 0x2a, ...be32(8)];
  ifds.forEach((ifd, i) => {
    ifd.sort((a, b) => a[0] - b[0]);
    let data = starts[i] + 2 + ifd.length * 12 + 4;
    const tail: number[] = [];
    out.push(...be16(ifd.length));
    for (const [tag, value] of ifd) {
      const bytes = tiffBytes(value);
      out.push(...be16(tag), ...be16(value.type), ...be32(tiffCount(value)));
      if (bytes.length <= 4) out.push(...bytes, ...Array(4 - bytes.length).fill(0));
      else {
        out.push(...be32(data));
        tail.push(...bytes, ...(bytes.length % 2 ? [0] : []));
        data += bytes.length + (bytes.length % 2);
      }
    }
    out.push(...be32(0), ...tail);
  });
  return out;
}

export interface PhotoMeta {
  make: string;
  model: string;
  software: string;
  artist: string;
  description: string;
  /** EXIF date "YYYY:MM:DD HH:MM:SS" (local camera time) and its UTC offset "+02:00". */
  taken: string;
  offset: string;
  width: number;
  height: number;
  /** Degrees, minutes, seconds (seconds keep two decimals). */
  lat: [number, number, number];
  lon: [number, number, number];
}

const dms = ([d, m, s]: [number, number, number]): TiffValue => ({ type: 5, rationals: [[d, 1], [m, 1], [Math.round(s * 100), 100]] });

/** JPEG start + an EXIF APP1 block (camera, author, date, GPS), then filler instead of a picture. */
export function jpegExif(meta: PhotoMeta, size: number, seed: number): string {
  const ifd0: Ifd = [
    [0x010e, ascii(meta.description)], [0x010f, ascii(meta.make)], [0x0110, ascii(meta.model)],
    [0x0131, ascii(meta.software)], [0x0132, ascii(meta.taken)], [0x013b, ascii(meta.artist)],
  ];
  const exif: Ifd = [[0x9003, ascii(meta.taken)], [0x9011, ascii(meta.offset)], [0xa002, { type: 4, nums: [meta.width] }], [0xa003, { type: 4, nums: [meta.height] }]];
  const gps: Ifd = [[0x0001, ascii('N')], [0x0002, dms(meta.lat)], [0x0003, ascii('E')], [0x0004, dms(meta.lon)]];
  const block = [...Array.from('Exif\0\0', (c) => c.charCodeAt(0)), ...tiff([ifd0, exif, gps], [[0, 0x8769, 1], [0, 0x8825, 2]])];
  return bin([0xff, 0xd8, 0xff, 0xe1], be16(block.length + 2), block, [0xff, 0xdb, 0x00, 0x43, 0x00], noise(size, seed), [0xff, 0xd9]);
}

/** A re-saved JPEG: JFIF header and a comment, no EXIF (what most "optimize for web" tools write). */
export function jpegPlain(comment: string, size: number, seed: number): string {
  return bin([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 'JFIF\0', [0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00], [0xff, 0xfe], be16(comment.length + 2), comment, [0xff, 0xdb, 0x00, 0x43, 0x00], noise(size, seed), [0xff, 0xd9]);
}

/** First bytes of a 64-bit Windows program (MZ, DOS stub, PE header, section names) with the given strings. No code. */
export function peStub(texts: string[], seed: number): string {
  const parts: (string | number[])[] = [
    'MZ', [0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff], Array(46).fill(0), le32(0x80),
    [0x0e, 0x1f, 0xba, 0x0e, 0x00, 0xb4, 0x09, 0xcd, 0x21, 0xb8, 0x01, 0x4c, 0xcd, 0x21], 'This program cannot be run in DOS mode.\r\r\n$', Array(7).fill(0),
    Array(128 - 64 - 14 - 42 - 7).fill(0),
    'PE\0\0', [0x64, 0x86, 0x03, 0x00], Array(16).fill(0),
    '.text\0\0\0', opaque(32, seed), '.rdata\0\0', opaque(32, seed + 1), '.data\0\0\0', opaque(48, seed + 2),
  ];
  texts.forEach((text, i) => parts.push(`${text}\0`, opaque(24 + ((i * 7) % 17), seed + 10 + i)));
  return bin(...parts);
}
