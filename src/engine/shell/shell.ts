import type { Vfs } from '../vfs';
import { baseName } from '../vfs';
import { commands } from './commands';
import './forensics';
import './metadata';
import { globToRegExp, ParseError, parseLine } from './parse';

export interface CommandResult {
  out: string;
  err?: string;
  clear?: boolean;
}

export interface CommandContext {
  shell: Shell;
  vfs: Vfs;
  args: string[];
  /** Output of the previous command in a pipeline, or null when reading from the keyboard. */
  stdin: string | null;
  /** True for the last command of a pipeline (colors and columns are allowed). */
  tty: boolean;
}

export interface ShellEnv {
  user: string;
  host: string;
  now: Date;
  cwd?: string;
}

/** A small command interpreter over the virtual filesystem. It never runs a real shell. */
export class Shell {
  cwd: string;
  readonly history: string[] = [];

  constructor(
    readonly vfs: Vfs,
    readonly env: ShellEnv,
  ) {
    this.cwd = env.cwd ? vfs.resolve(vfs.home, env.cwd) : vfs.home;
  }

  displayPath(path: string): string {
    if (path === this.vfs.home) return '~';
    return path.startsWith(`${this.vfs.home}/`) ? `~${path.slice(this.vfs.home.length)}` : path;
  }

  /** Prompt with ANSI colors, e.g. "analyst@nexus:~/cases$ ". */
  prompt(): string {
    return `\x1b[1;32m${this.env.user}@${this.env.host}\x1b[0m:\x1b[1;34m${this.displayPath(this.cwd)}\x1b[0m$ `;
  }

  run(line: string): CommandResult {
    const trimmed = line.trim();
    if (!trimmed) return { out: '' };
    this.history.push(trimmed);
    let parsed;
    try {
      parsed = parseLine(trimmed, { HOME: this.vfs.home, USER: this.env.user, PWD: this.cwd, HOSTNAME: this.env.host });
    } catch (error) {
      if (error instanceof ParseError) return { out: '', err: `bash: ${error.message}` };
      throw error;
    }
    if (parsed.redirect !== undefined) {
      return {
        out: '',
        err: `bash: ${parsed.redirect}: Read-only file system\n` +
          '(evidence is mounted read-only: investigators never modify the original data)',
      };
    }
    const errors: string[] = [];
    let stdin: string | null = null;
    let clear = false;
    parsed.pipeline.forEach((tokens, index) => {
      const args = tokens.flatMap((token) => (token.glob ? this.expandGlob(token.value) : [token.value]));
      const [name, ...rest] = args;
      const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
      if (!command) {
        errors.push(`${name}: command not found. Type 'help' to list commands.`);
        stdin = '';
        return;
      }
      let result: CommandResult;
      try {
        result = command.run({ shell: this, vfs: this.vfs, args: rest, stdin, tty: index === parsed.pipeline.length - 1 });
      } catch {
        // Safety net: a bug in one command must never break the terminal.
        result = { out: '', err: `${name}: could not handle that input` };
      }
      if (result.err) errors.push(result.err);
      if (result.clear) clear = true;
      stdin = result.out;
    });
    const out = stdin ?? '';
    return { out, err: errors.length ? errors.join('\n') : undefined, clear };
  }

  /** Expands *, ? in the last path segment. Returns the pattern itself when nothing matches (bash default). */
  expandGlob(pattern: string): string[] {
    const slash = pattern.lastIndexOf('/');
    const dirPart = slash >= 0 ? pattern.slice(0, slash + 1) : '';
    const namePart = pattern.slice(slash + 1);
    const dir = this.vfs.resolve(this.cwd, dirPart || '.');
    if (!this.vfs.isDir(dir)) return [pattern];
    const regex = globToRegExp(namePart);
    const matches = this.vfs
      .list(dir)
      .map((node) => baseName(node.path))
      .filter((name) => regex.test(name) && (namePart.startsWith('.') || !name.startsWith('.')))
      .map((name) => dirPart + name);
    return matches.length ? matches : [pattern];
  }

  /** Tab completion for the last word (commands first word, paths afterwards). */
  complete(line: string): string {
    const words = line.split(' ');
    const last = words[words.length - 1];
    let candidates: string[];
    if (words.length === 1) {
      candidates = Object.keys(commands).filter((name) => name.startsWith(last));
    } else {
      const slash = last.lastIndexOf('/');
      const dirPart = slash >= 0 ? last.slice(0, slash + 1) : '';
      const dir = this.vfs.resolve(this.cwd, dirPart || '.');
      candidates = this.vfs
        .list(dir)
        .map((node) => dirPart + baseName(node.path) + (node.type === 'dir' ? '/' : ''))
        .filter((name) => name.startsWith(last) && (last.includes('/.') || last.startsWith('.') || !baseName(name.replace(/\/$/, '')).startsWith('.')));
    }
    if (candidates.length === 0) return line;
    let common = candidates[0];
    for (const candidate of candidates) {
      while (!candidate.startsWith(common)) common = common.slice(0, -1);
    }
    words[words.length - 1] = candidates.length === 1 && !common.endsWith('/') ? `${common} ` : common;
    return words.join(' ');
  }
}
