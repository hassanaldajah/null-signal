import { baseName, bytesOf, type VNode } from '../vfs';
import { globToRegExp } from './parse';
import type { CommandContext, CommandResult } from './shell';

export interface Command {
  summary: string;
  usage: string;
  run: (ctx: CommandContext) => CommandResult;
}

/** Null prototype: a typed name like "__proto__" or "constructor" is never mistaken for a command. */
export const commands: Record<string, Command> = Object.create(null);

/** Later acts add their own tools (base64, sha256sum, strings, xxd...) through this. */
export function register(name: string, command: Command): void {
  commands[name] = command;
}

const C = {
  reset: '\x1b[0m',
  dir: '\x1b[1;34m',
  exec: '\x1b[1;32m',
  match: '\x1b[1;31m',
  file: '\x1b[35m',
  line: '\x1b[32m',
  sep: '\x1b[36m',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- helpers ------------------------------------------------------------------

interface Flags {
  flags: Set<string>;
  values: Record<string, string>;
  rest: string[];
}

/** Parses "-la", "-n 5", "-n5". `withValue` lists flags that take a value. */
export function parseFlags(args: string[], withValue = ''): Flags {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith('--')) {
      flags.add(arg);
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1 && !/^-\d+$/.test(arg)) {
      for (let j = 1; j < arg.length; j++) {
        const flag = arg[j];
        if (withValue.includes(flag)) {
          values[flag] = arg.slice(j + 1) || args[++i] || '';
          break;
        }
        flags.add(flag);
      }
      continue;
    }
    if (/^-\d+$/.test(arg)) {
      values.n = arg.slice(1);
      continue;
    }
    rest.push(arg);
  }
  return { flags, values, rest };
}

export function lines(text: string): string[] {
  if (!text) return [];
  const result = text.split('\n');
  if (result[result.length - 1] === '') result.pop();
  return result;
}

export function joinLines(items: string[]): string {
  return items.join('\n');
}

export const fail = (err: string): CommandResult => ({ out: '', err });

/** Reads files from args, or stdin when there are none. Returns [label, text] pairs. */
export function inputs(ctx: CommandContext, files: string[], command: string): { sources: [string, string][]; errors: string[] } {
  const errors: string[] = [];
  const sources: [string, string][] = [];
  if (files.length === 0) {
    sources.push(['(standard input)', ctx.stdin ?? '']);
    return { sources, errors };
  }
  for (const file of files) {
    const path = ctx.vfs.resolve(ctx.shell.cwd, file);
    const node = ctx.vfs.get(path);
    if (!node) errors.push(`${command}: ${file}: No such file or directory`);
    else if (node.type === 'dir') errors.push(`${command}: ${file}: Is a directory`);
    else sources.push([file, ctx.vfs.read(path) ?? '']);
  }
  return { sources, errors };
}

function permissionBits(mode: string): number {
  let bits = 0;
  for (const c of mode.slice(1, 10)) bits = (bits << 1) | (c === '-' ? 0 : 1);
  return bits;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, ' ')} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function colorName(node: VNode, name: string, tty: boolean): string {
  if (!tty) return name;
  if (node.type === 'dir') return `${C.dir}${name}${C.reset}`;
  if (node.file?.mode.includes('x')) return `${C.exec}${name}${C.reset}`;
  return name;
}

const MAX_PATTERN = 256;
/** A quantified group that is itself quantified, e.g. (a+)+ or (x*)* : catastrophic backtracking. */
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d)/;
/** A repeated group with alternatives, e.g. (a|aa)+ : the same text can match many ways. */
const REPEATED_ALTERNATION = /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,)/;
/** More unbounded repeats than this (e.g. .*.*.*.*x) backtrack polynomially on long lines. */
const MAX_REPEATS = 3;

/** Counts *, + and {n,} outside character classes and escapes. */
function unboundedRepeats(source: string): number {
  let count = 0;
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\\') i++;
    else if (inClass) inClass = c !== ']';
    else if (c === '[') inClass = true;
    else if (c === '*' || c === '+' || (c === '{' && /^\{\d+,\}/.test(source.slice(i)))) count++;
  }
  return count;
}

/** Compiles a player-typed regex, refusing patterns that could freeze the tab (ReDoS). */
export function safeRegExp(source: string, flags: string): RegExp | string {
  if (source.length > MAX_PATTERN) return `pattern too long (max ${MAX_PATTERN} characters)`;
  if (NESTED_QUANTIFIER.test(source)) return 'pattern rejected: nested quantifiers like (a+)+ can hang the search';
  if (REPEATED_ALTERNATION.test(source)) return 'pattern rejected: a repeated group of alternatives like (a|aa)+ can hang the search';
  if (unboundedRepeats(source) > MAX_REPEATS) return `pattern rejected: more than ${MAX_REPEATS} unbounded repeats (* + {n,}) can hang the search`;
  try {
    return new RegExp(source, flags);
  } catch {
    return 'Invalid regular expression';
  }
}

/** GNU grep uses basic regular expressions: + ? | ( ) { } are literal unless escaped. */
function basicToJs(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      const next = pattern[++i];
      out += '+?|(){}'.includes(next) ? next : `\\${next}`;
    } else out += '+?|(){}'.includes(c) ? `\\${c}` : c;
  }
  return out;
}

// --- commands -----------------------------------------------------------------

register('help', {
  summary: 'list available commands',
  usage: 'help',
  run: () => ({
    out: joinLines([
      'NEXUS OS shell — simulated, read-only evidence environment.',
      '',
      ...Object.entries(commands)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, command]) => `  ${name.padEnd(10)} ${command.summary}`),
      '',
      "Type 'man <command>' for usage and examples.",
    ]),
  }),
});

register('man', {
  summary: 'show the manual for a command',
  usage: 'man <command>',
  run: ({ args }) => {
    const command = commands[args[0]];
    if (!args[0]) return fail('What manual page do you want?\nFor example, try \'man ls\'.');
    if (!command) return fail(`No manual entry for ${args[0]}`);
    return { out: `${args[0].toUpperCase()} — ${command.summary}\n\nUSAGE\n  ${command.usage.split('\n').join('\n  ')}` };
  },
});

register('clear', { summary: 'clear the screen', usage: 'clear', run: () => ({ out: '', clear: true }) });

register('pwd', { summary: 'print working directory', usage: 'pwd', run: ({ shell }) => ({ out: shell.cwd }) });

register('whoami', { summary: 'print the current user', usage: 'whoami', run: ({ shell }) => ({ out: shell.env.user }) });

register('hostname', { summary: 'print the machine name', usage: 'hostname', run: ({ shell }) => ({ out: shell.env.host }) });

register('id', {
  summary: 'print user and group ids',
  usage: 'id',
  run: ({ shell }) => ({ out: `uid=1000(${shell.env.user}) gid=1000(${shell.env.user}) groups=1000(${shell.env.user}),27(sudo)` }),
});

register('date', {
  summary: 'print the system date, or convert a Unix timestamp',
  usage: 'date [-u] [-d @SECONDS]\n-d @N  show the date of Unix time N (seconds since 1970-01-01 UTC)\nexample: date -d @1773373510',
  run: ({ shell, args }) => {
    const { flags, values } = parseFlags(args, 'd');
    const long = [...flags].find((flag) => flag.startsWith('--date='));
    const when = values.d ?? long?.slice('--date='.length);
    if (when === undefined) return { out: shell.env.now.toUTCString().replace('GMT', 'UTC') };
    const epoch = /^@(\d{1,11})$/.exec(when);
    if (!epoch) return fail(`date: invalid date '${when}' (this sandbox reads Unix time: date -d @SECONDS)`);
    return { out: new Date(Number(epoch[1]) * 1000).toUTCString().replace('GMT', 'UTC') };
  },
});

register('echo', { summary: 'print text', usage: 'echo [text...]', run: ({ args }) => ({ out: args.join(' ') }) });

register('history', {
  summary: 'show previous commands',
  usage: 'history',
  run: ({ shell }) => ({ out: joinLines(shell.history.map((line, i) => `${String(i + 1).padStart(5)}  ${line}`)) }),
});

register('cd', {
  summary: 'change directory',
  usage: 'cd [dir]     (cd .. goes up, cd ~ goes home, cd - goes back)',
  run: ({ shell, vfs, args }) => {
    const target = vfs.resolve(shell.cwd, args[0] ?? '~');
    const node = vfs.get(target);
    if (!node) return fail(`bash: cd: ${args[0]}: No such file or directory`);
    if (node.type !== 'dir') return fail(`bash: cd: ${args[0]}: Not a directory`);
    shell.cwd = target;
    return { out: '' };
  },
});

register('ls', {
  summary: 'list directory contents',
  usage: 'ls [-a] [-l] [path...]\n-a  show hidden files (names starting with .)\n-l  long format: permissions, owner, size, date',
  run: ({ shell, vfs, args, tty }) => {
    const { flags, rest } = parseFlags(args);
    const all = flags.has('a') || flags.has('A');
    const long = flags.has('l');
    const targets = rest.length ? rest : ['.'];
    const blocks: string[] = [];
    const errors: string[] = [];
    for (const target of targets) {
      const path = vfs.resolve(shell.cwd, target);
      const node = vfs.get(path);
      if (!node) {
        errors.push(`ls: cannot access '${target}': No such file or directory`);
        continue;
      }
      const entries: [VNode, string][] = node.type === 'file'
        ? [[node, target]]
        : vfs.list(path).map((child) => [child, baseName(child.path)] as [VNode, string]);
      if (node.type === 'dir' && flags.has('a')) {
        entries.unshift([node, '.'], [vfs.get(path === '/' ? '/' : path.slice(0, path.lastIndexOf('/')) || '/') ?? node, '..']);
      }
      const visible = entries.filter(([, name]) => all || !name.startsWith('.'));
      let body: string;
      if (long) {
        const rows = visible.map(([child, name]) => {
          const mode = child.type === 'dir' ? 'drwxr-xr-x' : child.file!.mode;
          const owner = child.file?.owner ?? shell.env.user;
          const date = formatDate(child.file?.mtime ?? '2026-03-14T09:12:00Z');
          return `${mode} 1 ${owner.padEnd(8)} ${owner.padEnd(8)} ${String(vfs.size(child)).padStart(6)} ${date} ${colorName(child, name, tty)}`;
        });
        body = joinLines([`total ${visible.length * 4}`, ...rows]);
      } else {
        const names = visible.map(([child, name]) => colorName(child, name, tty));
        body = tty ? names.join('  ') : joinLines(names);
      }
      blocks.push(targets.length > 1 && node.type === 'dir' ? `${target}:\n${body}` : body);
    }
    return { out: blocks.filter(Boolean).join('\n\n'), err: errors.length ? joinLines(errors) : undefined };
  },
});

/** cat -v: control characters as ^X and high bytes as M-X, so nothing can hide on screen. */
function showControl(text: string, ends: boolean): string {
  return joinLines(lines(text).map((line) => {
    let out = '';
    for (const char of line) {
      let code = char.codePointAt(0)!;
      if (code > 0xff) {
        out += char;
        continue;
      }
      if (code >= 0x80) {
        out += 'M-';
        code -= 0x80;
      }
      if (code === 0x09 && !ends) out += '\t';
      else if (code < 0x20) out += `^${String.fromCharCode(code + 64)}`;
      else if (code === 0x7f) out += '^?';
      else out += String.fromCharCode(code);
    }
    return ends ? `${out}$` : out;
  }));
}

register('cat', {
  summary: 'print file contents',
  usage: [
    'cat [-v] [-A] <file...>',
    '-v  show invisible control characters (^M = carriage return, ^[ = escape)',
    '-A  like -v, plus tabs as ^I and a $ at the end of every line',
  ].join('\n'),
  run: (ctx) => {
    const { flags, rest } = parseFlags(ctx.args);
    const { sources, errors } = inputs(ctx, rest, 'cat');
    const all = flags.has('A') || flags.has('e');
    const reveal = all || flags.has('v') || flags.has('t');
    const out = sources.map(([, text]) => (reveal ? showControl(text, all) : text.replace(/\n$/, ''))).join('\n');
    return { out, err: errors.length ? joinLines(errors) : undefined };
  },
});

for (const name of ['head', 'tail'] as const) {
  register(name, {
    summary: name === 'head' ? 'print the first lines' : 'print the last lines',
    usage: `${name} [-n N] <file...>   (default N=10${name === 'tail' ? ', -n +N starts at line N' : ''})`,
    run: (ctx) => {
      const { values, rest } = parseFlags(ctx.args, 'n');
      const raw = values.n ?? '10';
      const count = Number.parseInt(raw.replace('+', ''), 10);
      if (Number.isNaN(count)) return fail(`${name}: invalid number of lines: '${raw}'`);
      const { sources, errors } = inputs(ctx, rest, name);
      const blocks = sources.map(([label, text]) => {
        const all = lines(text);
        let slice: string[];
        if (name === 'head') slice = all.slice(0, count);
        else slice = raw.startsWith('+') ? all.slice(count - 1) : all.slice(Math.max(0, all.length - count));
        const body = joinLines(slice);
        return sources.length > 1 ? `==> ${label} <==\n${body}` : body;
      });
      return { out: blocks.join('\n\n'), err: errors.length ? joinLines(errors) : undefined };
    },
  });
}

register('wc', {
  summary: 'count lines, words and bytes',
  usage: 'wc [-l] [-w] [-c] <file...>',
  run: (ctx) => {
    const { flags, rest } = parseFlags(ctx.args);
    const pick = ['l', 'w', 'c'].filter((flag) => flags.has(flag));
    const show = pick.length ? pick : ['l', 'w', 'c'];
    const { sources, errors } = inputs(ctx, rest, 'wc');
    const rows = sources.map(([label, raw]) => {
      // Piped output has no trailing newline; real commands would have printed one. Files count as they are.
      const piped = label === '(standard input)';
      const text = piped && raw && !raw.endsWith('\n') ? `${raw}\n` : raw;
      const counts: Record<string, number> = {
        l: (text.match(/\n/g) ?? []).length,
        w: text.split(/\s+/).filter(Boolean).length,
        c: bytesOf(text).length,
      };
      const numbers = show.map((flag) => (show.length > 1 ? String(counts[flag]).padStart(7) : String(counts[flag])));
      return rest.length ? `${numbers.join(' ')} ${label}` : numbers.join(' ');
    });
    return { out: joinLines(rows), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('grep', {
  summary: 'search text for a pattern',
  usage: [
    'grep [options] <pattern> [file...]',
    '-i  ignore case        -n  show line numbers   -c  count matching lines',
    '-v  invert match       -l  list matching files -r  search directories recursively',
    '-w  whole words        -E  extended regex      -F  fixed string (no regex)',
    'Example: grep -rn "password" ~/documents',
  ].join('\n'),
  run: (ctx) => {
    const { flags, values, rest } = parseFlags(ctx.args, 'e');
    const pattern = values.e ?? rest.shift();
    if (pattern === undefined) return fail('Usage: grep [OPTION]... PATTERNS [FILE]...');
    let source = flags.has('F') ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : flags.has('E') ? pattern : basicToJs(pattern);
    if (flags.has('w')) source = `\\b(?:${source})\\b`;
    const regex = safeRegExp(source, flags.has('i') ? 'gi' : 'g');
    if (typeof regex === 'string') return fail(`grep: ${regex}`);
    const recursive = flags.has('r') || flags.has('R');
    const errors: string[] = [];
    const sources: [string, string][] = [];
    if (recursive) {
      for (const target of rest.length ? rest : ['.']) {
        const root = ctx.vfs.resolve(ctx.shell.cwd, target);
        if (!ctx.vfs.get(root)) {
          errors.push(`grep: ${target}: No such file or directory`);
          continue;
        }
        for (const node of ctx.vfs.walk(root)) {
          if (node.type !== 'file') continue;
          const relative = node.path === root ? target : node.path.slice(root === '/' ? 1 : root.length + 1);
          const label = rest.length ? (node.path === root ? target : `${target.replace(/\/$/, '')}/${relative}`) : relative;
          sources.push([label, ctx.vfs.read(node.path) ?? '']);
        }
      }
    } else {
      const read = inputs(ctx, rest, 'grep');
      sources.push(...read.sources);
      errors.push(...read.errors);
    }
    const showNames = recursive || sources.length > 1;
    const output: string[] = [];
    for (const [label, text] of sources) {
      let count = 0;
      lines(text).forEach((line, index) => {
        regex.lastIndex = 0;
        const matched = regex.test(line) !== flags.has('v');
        if (!matched) return;
        count++;
        if (flags.has('c') || flags.has('l')) return;
        regex.lastIndex = 0;
        const body = ctx.tty && !flags.has('v') ? line.replace(regex, (m) => `${C.match}${m}${C.reset}`) : line;
        const name = showNames ? (ctx.tty ? `${C.file}${label}${C.reset}${C.sep}:${C.reset}` : `${label}:`) : '';
        const number = flags.has('n') ? (ctx.tty ? `${C.line}${index + 1}${C.reset}${C.sep}:${C.reset}` : `${index + 1}:`) : '';
        output.push(name + number + body);
      });
      if (flags.has('l') && count > 0) output.push(label);
      if (flags.has('c')) output.push(showNames ? `${label}:${count}` : String(count));
    }
    return { out: joinLines(output), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('find', {
  summary: 'search for files by name, type, time or permissions',
  usage: [
    'find [path] [tests...]',
    '-name "*.log"     match name (glob, quote it!)   -iname  same, ignore case',
    '-type f|d         files or directories',
    '-mtime -N | +N | N  modified less than / more than / exactly N days ago',
    '-newermt YYYY-MM-DD  modified after a date',
    '-perm 777 | -perm -002  exact permission bits | all of these bits set',
    '-user NAME        owned by NAME',
    'Example: find / -type f -perm -002     (world-writable files)',
  ].join('\n'),
  run: ({ shell, vfs, args }) => {
    let index = 0;
    const roots: string[] = [];
    while (index < args.length && !args[index].startsWith('-')) roots.push(args[index++]);
    if (roots.length === 0) roots.push('.');
    const tests: ((node: VNode) => boolean)[] = [];
    const now = shell.env.now.getTime();
    while (index < args.length) {
      const test = args[index++];
      const value = args[index++];
      if (value === undefined) return fail(`find: missing argument to \`${test}'`);
      switch (test) {
        case '-name':
        case '-iname': {
          const regex = globToRegExp(value, test === '-iname');
          tests.push((node) => regex.test(baseName(node.path)));
          break;
        }
        case '-type':
          if (value !== 'f' && value !== 'd') return fail(`find: Unknown argument to -type: ${value}`);
          tests.push((node) => (value === 'f' ? node.type === 'file' : node.type === 'dir'));
          break;
        case '-mtime': {
          const days = Number.parseInt(value, 10);
          if (Number.isNaN(days)) return fail(`find: invalid argument \`${value}' to \`-mtime'`);
          tests.push((node) => {
            if (!node.file) return false;
            const age = Math.floor((now - new Date(node.file.mtime).getTime()) / 86_400_000);
            if (value.startsWith('-')) return age < Math.abs(days);
            if (value.startsWith('+')) return age > days;
            return age === days;
          });
          break;
        }
        case '-newermt': {
          const limit = new Date(value).getTime();
          if (Number.isNaN(limit)) return fail(`find: I cannot figure out how to interpret \`${value}' as a date or time`);
          tests.push((node) => !!node.file && new Date(node.file.mtime).getTime() > limit);
          break;
        }
        case '-perm': {
          const mode = value.replace(/^[-/]/, '');
          if (!/^[0-7]{3,4}$/.test(mode)) return fail(`find: invalid mode \`${value}'`);
          const wanted = Number.parseInt(mode.slice(-3), 8);
          tests.push((node) => {
            const bits = permissionBits(node.type === 'dir' ? 'drwxr-xr-x' : node.file!.mode);
            if (value.startsWith('-')) return (bits & wanted) === wanted;
            if (value.startsWith('/')) return (bits & wanted) !== 0;
            return bits === wanted;
          });
          break;
        }
        case '-user':
          tests.push((node) => (node.file?.owner ?? shell.env.user) === value);
          break;
        default:
          return fail(`find: unknown predicate \`${test}'`);
      }
    }
    const output: string[] = [];
    const errors: string[] = [];
    for (const root of roots) {
      const path = vfs.resolve(shell.cwd, root);
      if (!vfs.get(path)) {
        errors.push(`find: '${root}': No such file or directory`);
        continue;
      }
      for (const node of vfs.walk(path)) {
        if (!tests.every((test) => test(node))) continue;
        const suffix = node.path === path ? '' : node.path.slice(path === '/' ? 0 : path.length);
        output.push(root === '/' ? node.path : root.replace(/\/$/, '') + suffix);
      }
    }
    return { out: joinLines(output), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('sort', {
  summary: 'sort lines',
  usage: 'sort [-n] [-r] [-u] [-t SEP -k N] [file]',
  run: (ctx) => {
    const { flags, values, rest } = parseFlags(ctx.args, 'tk');
    const { sources, errors } = inputs(ctx, rest, 'sort');
    const field = values.k ? Number.parseInt(values.k, 10) - 1 : -1;
    const keyOf = (line: string) => (field >= 0 ? (values.t ? line.split(values.t) : line.trim().split(/\s+/))[field] ?? '' : line);
    let all = sources.flatMap(([, text]) => lines(text));
    all.sort((a, b) => (flags.has('n') ? Number.parseFloat(keyOf(a)) - Number.parseFloat(keyOf(b)) : keyOf(a).localeCompare(keyOf(b))));
    if (flags.has('r')) all.reverse();
    if (flags.has('u')) all = [...new Set(all)];
    return { out: joinLines(all), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('uniq', {
  summary: 'collapse repeated adjacent lines',
  usage: 'uniq [-c] [file]   (tip: sort first, then uniq -c to count)',
  run: (ctx) => {
    const { flags, rest } = parseFlags(ctx.args);
    const { sources, errors } = inputs(ctx, rest, 'uniq');
    const groups: [string, number][] = [];
    for (const line of sources.flatMap(([, text]) => lines(text))) {
      const last = groups[groups.length - 1];
      if (last && last[0] === line) last[1]++;
      else groups.push([line, 1]);
    }
    const out = groups.map(([line, count]) => (flags.has('c') ? `${String(count).padStart(7)} ${line}` : line));
    return { out: joinLines(out), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('cut', {
  summary: 'cut fields out of each line',
  usage: 'cut -d SEP -f LIST [file]   e.g. cut -d " " -f 1,4   or   -f 2-',
  run: (ctx) => {
    const { values, rest } = parseFlags(ctx.args, 'df');
    if (!values.f) return fail('cut: you must specify a list of fields');
    const separator = values.d ?? '\t';
    if (separator.length !== 1) return fail('cut: the delimiter must be a single character');
    // Ranges stay as [start, end] pairs: "-f 1-999999999" must not build a billion-item list.
    const ranges: [number, number][] = [];
    for (const part of values.f.split(',')) {
      const match = /^(\d{0,9})(-?)(\d{0,9})$/.exec(part);
      if (!match || (!match[1] && !match[3])) return fail(`cut: invalid field value '${part}'`);
      const start = match[1] ? Number(match[1]) : 1;
      const end = match[2] ? (match[3] ? Number(match[3]) : Infinity) : start;
      if (start < 1 || end < 1) return fail('cut: fields are numbered from 1');
      if (end < start) return fail('cut: invalid decreasing range');
      ranges.push([start, end]);
    }
    const { sources, errors } = inputs(ctx, rest, 'cut');
    // Like GNU cut: each selected field once, in the order it appears in the line.
    const out = sources.flatMap(([, text]) => lines(text)).map((line) =>
      line.split(separator).filter((_, i) => ranges.some(([start, end]) => i + 1 >= start && i + 1 <= end)).join(separator));
    return { out: joinLines(out), err: errors.length ? joinLines(errors) : undefined };
  },
});

register('file', {
  summary: 'guess the type of a file',
  usage: 'file <file...>',
  run: ({ shell, vfs, args }) => {
    if (!args.length) return fail('Usage: file <file...>');
    const out = args.map((arg) => {
      const node = vfs.get(vfs.resolve(shell.cwd, arg));
      if (!node) return `${arg}: cannot open \`${arg}' (No such file or directory)`;
      if (node.type === 'dir') return `${arg}: directory`;
      return `${arg}: ${detectFileType(vfs.read(node.path) ?? '')}`;
    });
    return { out: joinLines(out) };
  },
});

/** File type by content, like `file`. Later acts register more signatures. */
export const fileSignatures: { test: (data: string) => boolean; label: string }[] = [
  { test: (data) => data.startsWith('%PDF-'), label: 'PDF document' },
  { test: (data) => data.startsWith('\x89PNG\r\n\x1a\n'), label: 'PNG image data' },
  { test: (data) => data.startsWith('\xff\xd8\xff'), label: 'JPEG image data' },
  { test: (data) => data.startsWith('GIF8'), label: 'GIF image data' },
  { test: (data) => data.startsWith('PK\x03\x04'), label: 'Zip archive data' },
  { test: (data) => data.startsWith('\x7fELF'), label: 'ELF 64-bit LSB executable, x86-64' },
  { test: (data) => data.startsWith('MZ'), label: 'PE32 executable (GUI) Intel 80386, for MS Windows' },
  { test: (data) => data.startsWith('!<arch>\ndebian-binary'), label: 'Debian binary package (format 2.0)' },
  { test: (data) => /^\s*<(!doctype html|html)/i.test(data), label: 'HTML document, ASCII text' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** RFC 1952 header: flags, mtime and (with FNAME) the original file name survive a rename. */
function gzipLabel(data: string): string {
  const flags = data.charCodeAt(3);
  const mtime = (data.charCodeAt(4) | (data.charCodeAt(5) << 8) | (data.charCodeAt(6) << 16) | (data.charCodeAt(7) << 24)) >>> 0;
  const parts = ['gzip compressed data'];
  let offset = 10;
  if (flags & 0x04) offset += 2 + (data.charCodeAt(10) | (data.charCodeAt(11) << 8));
  if (flags & 0x08) {
    const end = data.indexOf('\0', offset);
    if (end > offset) parts.push(`was "${data.slice(offset, end)}"`);
  }
  if (mtime) {
    const d = new Date(mtime * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    parts.push(`last modified: ${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${d.getUTCFullYear()}`);
  }
  if (data.charCodeAt(9) === 3) parts.push('from Unix');
  return parts.join(', ');
}

export function detectFileType(data: string): string {
  if (!data.length) return 'empty';
  if (data.startsWith('\x1f\x8b')) return gzipLabel(data);
  for (const signature of fileSignatures) if (signature.test(data)) return signature.label;
  if (/^#!.*\b(ba)?sh\b/.test(data)) return 'Bourne-Again shell script, ASCII text executable';
  if (/[^\x09\x0a\x0d\x20-\x7e]/.test(data)) return /[\u0080-￿]/.test(data) ? 'UTF-8 Unicode text' : 'data';
  const kind = data.startsWith('<?xml') ? 'XML 1.0 document, ASCII text' : 'ASCII text';
  // A lone carriage return sends the cursor back to the line start: what follows prints over what came before.
  return /\r(?!\n)/.test(data) ? `${kind}, with CR, LF line terminators` : kind;
}

register('sudo', {
  summary: 'run a command as administrator',
  usage: 'sudo <command>',
  run: ({ shell }) => fail(`${shell.env.user} is not in the sudoers file. This incident will be reported.`),
});

register('crontab', {
  summary: "show a user's scheduled jobs (read-only here)",
  usage: 'crontab -l [-u USER]\nUser jobs live in /var/spool/cron/crontabs/USER; system jobs in /etc/crontab and /etc/cron.d/',
  run: ({ shell, vfs, args }) => {
    const { flags, values } = parseFlags(args, 'u');
    if (!flags.has('l')) return fail('crontab: this evidence copy is read-only: use crontab -l [-u USER]');
    const user = values.u ?? shell.env.user;
    const text = vfs.read(`/var/spool/cron/crontabs/${user}`);
    return text === undefined ? fail(`no crontab for ${user}`) : { out: text.replace(/\n$/, '') };
  },
});
