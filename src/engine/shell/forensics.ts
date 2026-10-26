// Encoding, hashing, password-audit (Act 3) and byte-level tools (Act 5). Registered on import.
import { md5, sha1, sha256 } from '../hash';
import { bytesOf } from '../vfs';
import { fail, inputs, joinLines, lines, parseFlags, register } from './commands';

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

function toBase64(text: string): string {
  let binary = '';
  for (const byte of utf8.encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/.{76}(?=.)/g, '$&\n');
}

function fromBase64(text: string): string | null {
  const clean = text.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) return null;
  const binary = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='));
  return fromUtf8.decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

register('base64', {
  summary: 'encode or decode base64 (an encoding, not encryption)',
  usage: 'base64 [-d] [file]\n-d  decode\nexample: echo aGVsbG8= | base64 -d',
  run: (ctx) => {
    const { flags, rest } = parseFlags(ctx.args);
    const { sources, errors } = inputs(ctx, rest, 'base64');
    if (errors.length) return fail(joinLines(errors));
    const text = sources.map(([, body]) => body).join('');
    if (!flags.has('d')) return { out: toBase64(text) };
    const decoded = fromBase64(text);
    return decoded === null ? fail('base64: invalid input') : { out: decoded.replace(/\n$/, '') };
  },
});

for (const [name, digest] of [['md5sum', md5], ['sha1sum', sha1], ['sha256sum', sha256]] as const) {
  register(name, {
    summary: `print the ${name.replace('sum', '').toUpperCase()} checksum of files`,
    usage: `${name} <file...>   (or pipe text in; this sandbox's echo adds no trailing newline)`,
    run: (ctx) => {
      const { sources, errors } = inputs(ctx, ctx.args, name);
      const out = sources.map(([label, body]) => `${digest(body)}  ${label === '(standard input)' ? '-' : label}`);
      return { out: joinLines(out), err: errors.length ? joinLines(errors) : undefined };
    },
  });
}

const XXD_DEFAULT = 256;

register('xxd', {
  summary: 'hex dump: the raw bytes of a file (its first bytes are its signature)',
  usage: [
    'xxd [-l LEN] [-s OFFSET] <file>',
    '-l  number of bytes to show     -s  start at this byte offset',
    'example: xxd -l 16 photo.jpg   (ff d8 ff = JPEG, 89 50 4e 47 = PNG, 1f 8b = gzip, 7f 45 4c 46 = ELF)',
  ].join('\n'),
  run: (ctx) => {
    const { values, rest } = parseFlags(ctx.args, 'ls');
    if (rest.length > 1) return fail('xxd: one file at a time');
    const { sources, errors } = inputs(ctx, rest, 'xxd');
    if (errors.length) return fail(joinLines(errors));
    const bytes = bytesOf(sources[0][1]);
    const start = values.s === undefined ? 0 : Number.parseInt(values.s, 10);
    const length = values.l === undefined ? XXD_DEFAULT : Number.parseInt(values.l, 10);
    if (Number.isNaN(start) || start < 0) return fail(`xxd: invalid offset '${values.s}'`);
    if (Number.isNaN(length) || length < 0) return fail(`xxd: invalid length '${values.l}'`);
    const slice = bytes.slice(start, start + Math.min(length, 4096));
    const out: string[] = [];
    for (let i = 0; i < slice.length; i += 16) {
      const row = slice.slice(i, i + 16);
      const hex = Array.from({ length: 8 }, (_, pair) => row.slice(pair * 2, pair * 2 + 2).map((byte) => byte.toString(16).padStart(2, '0')).join('').padEnd(4));
      const ascii = row.map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.')).join('');
      out.push(`${(start + i).toString(16).padStart(8, '0')}: ${hex.join(' ')}  ${ascii}`);
    }
    if (values.l === undefined && bytes.length > start + XXD_DEFAULT) out.push(`(first ${XXD_DEFAULT} bytes shown: use -l LEN or -s OFFSET for more)`);
    return { out: joinLines(out) };
  },
});

export type HashKind ='md5' | 'sha1' | 'sha256' | 'sha512' | 'bcrypt' | 'sha512crypt' | 'md5crypt' | 'argon2' | 'unknown';

/** Candidate algorithms for a hash string, like the hashid tool. */
export function identify(hash: string): { kind: HashKind; names: string[] } {
  if (/^\$2[aby]?\$\d\d\$[./A-Za-z0-9]{53}$/.test(hash)) return { kind: 'bcrypt', names: ['bcrypt', 'Blowfish(OpenBSD)'] };
  if (/^\$6\$/.test(hash)) return { kind: 'sha512crypt', names: ['SHA-512 Crypt'] };
  if (/^\$1\$/.test(hash)) return { kind: 'md5crypt', names: ['MD5 Crypt', 'Cisco-IOS(MD5)'] };
  if (/^\$argon2(id|i|d)\$/.test(hash)) return { kind: 'argon2', names: ['Argon2'] };
  if (/^[a-f0-9]{32}$/i.test(hash)) return { kind: 'md5', names: ['MD5', 'MD4', 'NTLM', 'LM'] };
  if (/^[a-f0-9]{40}$/i.test(hash)) return { kind: 'sha1', names: ['SHA-1', 'RIPEMD-160', 'Haval-160'] };
  if (/^[a-f0-9]{64}$/i.test(hash)) return { kind: 'sha256', names: ['SHA-256', 'SHA3-256', 'BLAKE2s-256'] };
  if (/^[a-f0-9]{128}$/i.test(hash)) return { kind: 'sha512', names: ['SHA-512', 'SHA3-512', 'Whirlpool'] };
  return { kind: 'unknown', names: [] };
}

/** "user:hash" lines keep the user apart; a bare hash has no user. */
function splitEntry(line: string): { user: string; hash: string } {
  const at = line.indexOf(':');
  return at > 0 && !line.startsWith('$') ? { user: line.slice(0, at), hash: line.slice(at + 1).trim() } : { user: '?', hash: line.trim() };
}

register('hashid', {
  summary: 'identify the possible algorithm of a hash',
  usage: 'hashid <hash | file>   (a file is analyzed line by line, "user:hash" allowed)',
  run: ({ shell, vfs, args }) => {
    if (!args.length) return fail('Usage: hashid <hash | file>');
    const node = vfs.get(vfs.resolve(shell.cwd, args[0]));
    const entries = node?.type === 'file' ? lines(vfs.read(node.path) ?? '').filter((line) => line.trim()) : [args[0]];
    const out = entries.map((entry) => {
      const { names } = identify(splitEntry(entry).hash);
      return [`Analyzing '${entry}'`, ...(names.length ? names.map((name) => `[+] ${name}`) : ['[+] Unknown hash'])].join('\n');
    });
    return { out: out.join('\n\n') };
  },
});
