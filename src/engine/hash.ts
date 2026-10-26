// Synchronous MD5 / SHA-1 / SHA-256 (the shell is synchronous, Web Crypto is not).
// Input bytes follow the VFS model (chars up to 0xFF are raw bytes, others UTF-8), the same bytes
// xxd and the Hex viewer show; plain text hashes exactly like UTF-8. Outputs match the real
// algorithms, so in-game hashes can be checked with any external tool.
import { bytesOf } from './vfs';

const toBytes = (text: string) => Uint8Array.from(bytesOf(text));

const hex = (words: number[], littleEndian: boolean) =>
  words.map((word) => {
    const value = littleEndian ? ((word & 0xff) << 24) | ((word >>> 8 & 0xff) << 16) | ((word >>> 16 & 0xff) << 8) | (word >>> 24) : word;
    return (value >>> 0).toString(16).padStart(8, '0');
  }).join('');

/** Message padded to 64-byte blocks, split into 32-bit words (big- or little-endian). */
function blocks(bytes: Uint8Array, littleEndian: boolean): Uint32Array {
  const length = (((bytes.length + 8) >> 6) + 1) * 16;
  const words = new Uint32Array(length);
  const put = (index: number, byte: number) => {
    const shift = littleEndian ? (index % 4) * 8 : (3 - (index % 4)) * 8;
    words[index >> 2] |= byte << shift;
  };
  bytes.forEach((byte, index) => put(index, byte));
  put(bytes.length, 0x80);
  const bits = bytes.length * 8;
  if (littleEndian) {
    words[length - 2] = bits >>> 0;
    words[length - 1] = Math.floor(bits / 2 ** 32);
  } else {
    words[length - 2] = Math.floor(bits / 2 ** 32);
    words[length - 1] = bits >>> 0;
  }
  return words;
}

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

const MD5_S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(text: string): string {
  const x = blocks(toBytes(text), true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let offset = 0; offset < x.length; offset += 16) {
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      const round = i >> 4;
      let f: number;
      let g: number;
      if (round === 0) [f, g] = [(b & c) | (~b & d), i];
      else if (round === 1) [f, g] = [(d & b) | (~d & c), (5 * i + 1) % 16];
      else if (round === 2) [f, g] = [b ^ c ^ d, (3 * i + 5) % 16];
      else [f, g] = [c ^ (b | ~d), (7 * i) % 16];
      const sum = (a + f + MD5_K[i] + x[offset + g]) | 0;
      [a, d, c] = [d, c, b];
      b = (b + rotl(sum, MD5_S[(round << 2) | (i & 3)])) | 0;
    }
    [a0, b0, c0, d0] = [(a0 + a) | 0, (b0 + b) | 0, (c0 + c) | 0, (d0 + d) | 0];
  }
  return hex([a0, b0, c0, d0], true);
}

export function sha1(text: string): string {
  const x = blocks(toBytes(text), false);
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const w = new Array<number>(80);
  for (let offset = 0; offset < x.length; offset += 16) {
    for (let i = 0; i < 80; i++) w[i] = i < 16 ? x[offset + i] : rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f + e + k + w[i]) | 0;
      [e, d, c, b, a] = [d, c, rotl(b, 30), a, t];
    }
    [a, b, c, d, e].forEach((value, i) => { h[i] = (h[i] + value) | 0; });
  }
  return hex(h, false);
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256(text: string): string {
  const x = blocks(toBytes(text), false);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64);
  for (let offset = 0; offset < x.length; offset += 16) {
    for (let i = 0; i < 64; i++) {
      if (i < 16) w[i] = x[offset + i];
      else {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [hh, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
    }
    [a, b, c, d, e, f, g, hh].forEach((value, i) => { h[i] = (h[i] + value) | 0; });
  }
  return hex(h, false);
}
