// Readers for what files carry besides their content (Act 5-6): EXIF metadata in photos
// and printable strings in programs. Registered on import. Parsing only, nothing is executed.
import { baseName, bytesOf } from '../vfs';
import { detectFileType, fail, inputs, joinLines, parseFlags, register } from './commands';

type Tags = [name: string, value: string][];

const TIFF_TYPES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

const TAG_NAMES: Record<number, string> = {
  0x010e: 'Image Description',
  0x010f: 'Make',
  0x0110: 'Camera Model Name',
  0x0131: 'Software',
  0x0132: 'Modify Date',
  0x013b: 'Artist',
  0x8298: 'Copyright',
  0x9003: 'Date/Time Original',
  0x9011: 'Offset Time Original',
  0xa002: 'Exif Image Width',
  0xa003: 'Exif Image Height',
  0xa430: 'Owner Name',
  0xa431: 'Serial Number',
  0x0001: 'GPS Latitude Ref',
  0x0002: 'GPS Latitude',
  0x0003: 'GPS Longitude Ref',
  0x0004: 'GPS Longitude',
};

const EXIF_IFD = 0x8769;
const GPS_IFD = 0x8825;
const REFS: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' };

/** Reads one TIFF IFD (the structure inside an EXIF block) into tag -> raw values. */
function readIfd(tiff: number[], offset: number, big: boolean): Map<number, (string | number)[]> {
  const u16 = (at: number) => (big ? (tiff[at] << 8) | tiff[at + 1] : tiff[at] | (tiff[at + 1] << 8));
  const u32 = (at: number) => (big ? ((tiff[at] << 24) | (tiff[at + 1] << 16) | (tiff[at + 2] << 8) | tiff[at + 3]) >>> 0 : (tiff[at] | (tiff[at + 1] << 8) | (tiff[at + 2] << 16) | (tiff[at + 3] << 24)) >>> 0);
  const out = new Map<number, (string | number)[]>();
  if (offset + 2 > tiff.length) return out;
  const count = Math.min(u16(offset), 64);
  for (let i = 0; i < count; i++) {
    const entry = offset + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const n = Math.min(u32(entry + 4), 256);
    const size = (TIFF_TYPES[type] ?? 1) * n;
    const at = size <= 4 ? entry + 8 : u32(entry + 8);
    if (at + size > tiff.length) continue;
    if (type === 2) {
      out.set(tag, [String.fromCharCode(...tiff.slice(at, at + n)).replace(/\0+$/, '')]);
    } else if (type === 5 || type === 10) {
      out.set(tag, Array.from({ length: n }, (_, k) => u32(at + k * 8) / (u32(at + k * 8 + 4) || 1)));
    } else if (type === 3) {
      out.set(tag, Array.from({ length: n }, (_, k) => u16(at + k * 2)));
    } else if (type === 4) {
      out.set(tag, Array.from({ length: n }, (_, k) => u32(at + k * 4)));
    }
  }
  return out;
}

const trim = (n: number) => String(Number(n.toFixed(2)));

function gps(values: (string | number)[], ref: string, decimal: boolean): string {
  const [d = 0, m = 0, s = 0] = values as number[];
  if (decimal) {
    const value = d + m / 60 + s / 3600;
    return (ref === 'S' || ref === 'W' ? -value : value).toFixed(6);
  }
  return `${d} deg ${m}' ${trim(s)}" ${ref}`;
}

/** EXIF tags from a JPEG's APP1 segment, plus JPEG comments, in exiftool's wording. */
function jpegTags(bytes: number[], decimal: boolean): Tags {
  const tags: Tags = [];
  let at = 2;
  while (at + 4 <= bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    const body = bytes.slice(at + 4, at + 2 + length);
    if (marker === 0xe0 && String.fromCharCode(...body.slice(0, 5)) === 'JFIF\0') {
      tags.push(['JFIF Version', `${body[5]}.${String(body[6]).padStart(2, '0')}`]);
    }
    if (marker === 0xfe) tags.push(['Comment', String.fromCharCode(...body)]);
    if (marker === 0xe1 && String.fromCharCode(...body.slice(0, 6)) === 'Exif\0\0') {
      const tiff = body.slice(6);
      const big = tiff[0] === 0x4d;
      const first = big ? ((tiff[4] << 24) | (tiff[5] << 16) | (tiff[6] << 8) | tiff[7]) >>> 0 : (tiff[4] | (tiff[5] << 8) | (tiff[6] << 16) | (tiff[7] << 24)) >>> 0;
      const ifd0 = readIfd(tiff, first, big);
      tags.push(['Exif Byte Order', big ? 'Big-endian (Motorola, MM)' : 'Little-endian (Intel, II)']);
      const add = (ifd: Map<number, (string | number)[]>) => {
        for (const [tag, values] of ifd) {
          const name = TAG_NAMES[tag];
          if (name && tag > 4) tags.push([name, values.map(String).join(' ')]);
        }
      };
      add(ifd0);
      const exif = ifd0.get(EXIF_IFD);
      if (exif) add(readIfd(tiff, Number(exif[0]), big));
      const gpsAt = ifd0.get(GPS_IFD);
      if (gpsAt) {
        const g = readIfd(tiff, Number(gpsAt[0]), big);
        const latRef = String(g.get(1)?.[0] ?? 'N');
        const lonRef = String(g.get(3)?.[0] ?? 'E');
        tags.push(['GPS Latitude Ref', decimal ? latRef : REFS[latRef] ?? latRef], ['GPS Longitude Ref', decimal ? lonRef : REFS[lonRef] ?? lonRef]);
        const lat = g.get(2);
        const lon = g.get(4);
        if (lat && lon) {
          tags.push(['GPS Latitude', gps(lat, latRef, decimal)], ['GPS Longitude', gps(lon, lonRef, decimal)]);
          tags.push(['GPS Position', `${gps(lat, latRef, decimal)}${decimal ? ' ' : ', '}${gps(lon, lonRef, decimal)}`]);
        }
      }
    }
    at += 2 + length;
  }
  return tags;
}

/** PNG width and height from the IHDR chunk, plus tEXt chunks. */
function pngTags(bytes: number[]): Tags {
  const be = (at: number) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  const tags: Tags = [['Image Width', String(be(16))], ['Image Height', String(be(20))]];
  let at = 8;
  while (at + 12 <= bytes.length) {
    const length = be(at);
    const type = String.fromCharCode(...bytes.slice(at + 4, at + 8));
    if (type === 'tEXt') {
      const [key, value] = String.fromCharCode(...bytes.slice(at + 8, at + 8 + length)).split('\0');
      tags.push([key, value ?? '']);
    }
    if (type === 'IEND' || length > bytes.length) break;
    at += 12 + length;
  }
  return tags;
}

const MIME: [test: RegExp, type: string, mime: string][] = [
  [/^JPEG/, 'JPEG', 'image/jpeg'],
  [/^PNG/, 'PNG', 'image/png'],
  [/^PDF/, 'PDF', 'application/pdf'],
  [/^gzip/, 'GZIP', 'application/x-gzip'],
  [/^ELF/, 'ELF executable', 'application/octet-stream'],
  [/^PE32/, 'Win64 EXE', 'application/octet-stream'],
];

register('exiftool', {
  summary: 'read metadata (EXIF) hidden inside photos and files',
  usage: [
    'exiftool [-n] [-TAG...] <file...>',
    '-n     numbers as numbers: GPS in decimal degrees instead of deg/min/sec',
    '-TAG   show only that tag, e.g. exiftool -Artist -GPSPosition photo.jpg',
    'GPS by hand: decimal = deg + min/60 + sec/3600',
  ].join('\n'),
  run: ({ shell, vfs, args }) => {
    const filters = args.filter((arg) => arg.startsWith('-') && arg !== '-n').map((arg) => arg.slice(1).toLowerCase().replace(/[^a-z0-9]/g, ''));
    const { flags, rest } = parseFlags(args.filter((arg) => !arg.startsWith('-') || arg === '-n'));
    if (!rest.length) return fail('Usage: exiftool [-n] [-TAG] <file...>');
    const blocks: string[] = [];
    const errors: string[] = [];
    for (const target of rest) {
      const node = vfs.get(vfs.resolve(shell.cwd, target));
      if (!node || node.type !== 'file') {
        errors.push(`Error: File not found - ${target}`);
        continue;
      }
      const data = vfs.read(node.path) ?? '';
      const bytes = bytesOf(data);
      const kind = detectFileType(data);
      const [, type, mime] = MIME.find(([test]) => test.test(kind)) ?? [null, 'TXT', 'text/plain'];
      let tags: Tags = [
        ['File Name', baseName(node.path)],
        ['File Size', `${bytes.length} bytes`],
        ['File Modification Date/Time', node.file!.mtime.replace(/-/g, ':').replace('T', ' ').replace('Z', '+00:00')],
        ['File Permissions', node.file!.mode],
        ['File Type', type],
        ['MIME Type', mime],
      ];
      if (type === 'JPEG') tags.push(...jpegTags(bytes, flags.has('n')));
      if (type === 'PNG') tags.push(...pngTags(bytes));
      if (filters.length) tags = tags.filter(([name]) => filters.includes(name.toLowerCase().replace(/[^a-z0-9]/g, '')));
      const body = tags.map(([name, value]) => `${name.padEnd(32)}: ${value}`);
      blocks.push(rest.length > 1 ? `======== ${target}\n${joinLines(body)}` : joinLines(body));
    }
    return { out: blocks.join('\n'), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('strings', {
  summary: 'print the readable text inside a binary file',
  usage: 'strings [-n MIN] <file>   (runs of at least MIN printable characters, default 4)\nexample: strings sample.exe | grep -i http',
  run: (ctx) => {
    const { values, rest } = parseFlags(ctx.args, 'n');
    const min = Number.parseInt(values.n ?? '4', 10);
    if (Number.isNaN(min) || min < 1) return fail(`strings: invalid minimum string length '${values.n}'`);
    const { sources, errors } = inputs(ctx, rest, 'strings');
    if (errors.length) return fail(joinLines(errors));
    const out: string[] = [];
    for (const [, text] of sources) {
      let run = '';
      for (const byte of bytesOf(text)) {
        if ((byte >= 0x20 && byte < 0x7f) || byte === 0x09) run += String.fromCharCode(byte);
        else {
          if (run.length >= min) out.push(run);
          run = '';
        }
      }
      if (run.length >= min) out.push(run);
    }
    return { out: joinLines(out) };
  },
});
