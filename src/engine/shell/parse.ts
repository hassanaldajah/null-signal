// Bash-like command line parser: quotes, escapes, $VARS, pipes, globs and `>` detection.

export interface Token {
  value: string;
  /** True when the token had unquoted * or ? characters (eligible for glob expansion). */
  glob: boolean;
}

export interface ParsedLine {
  pipeline: Token[][];
  /** Target of a `>` / `>>` redirection (the filesystem is read-only, so this is reported). */
  redirect?: string;
}

export class ParseError extends Error {}

export function parseLine(line: string, vars: Record<string, string>): ParsedLine {
  const pipeline: Token[][] = [[]];
  let current = '';
  let started = false;
  let glob = false;
  let quote: '"' | "'" | null = null;
  let redirect: string | undefined;
  let expectRedirect = false;

  const push = () => {
    if (!started) return;
    if (expectRedirect) {
      redirect = current;
      expectRedirect = false;
    } else {
      pipeline[pipeline.length - 1].push({ value: current, glob });
    }
    current = '';
    started = false;
    glob = false;
  };

  const readVar = (i: number): [string, number] => {
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i + 1));
    if (!match) return ['$', i];
    return [vars[match[0]] ?? '', i + match[0].length];
  };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (quote === '"' && c === '\\' && i + 1 < line.length && '"\\$'.includes(line[i + 1])) current += line[++i];
      else if (quote === '"' && c === '$') {
        const [value, end] = readVar(i);
        current += value;
        i = end;
      } else current += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      started = true;
    } else if (c === '\\' && i + 1 < line.length) {
      current += line[++i];
      started = true;
    } else if (c === ' ' || c === '\t') {
      push();
    } else if (c === '|') {
      push();
      if (pipeline[pipeline.length - 1].length === 0) throw new ParseError("syntax error near unexpected token `|'");
      pipeline.push([]);
    } else if (c === '>') {
      push();
      if (line[i + 1] === '>') i++;
      expectRedirect = true;
    } else if (c === '$') {
      const [value, end] = readVar(i);
      current += value;
      i = end;
      started = true;
    } else {
      if (c === '*' || c === '?') glob = true;
      current += c;
      started = true;
    }
  }
  if (quote) throw new ParseError(`unexpected EOF while looking for matching \`${quote}'`);
  push();
  if (expectRedirect) throw new ParseError("syntax error near unexpected token `newline'");
  if (pipeline[pipeline.length - 1].length === 0 && pipeline.length > 1) {
    throw new ParseError("syntax error near unexpected token `|'");
  }
  return { pipeline, redirect };
}

/** Converts a shell glob (*, ?, [abc]) into an anchored RegExp. */
export function globToRegExp(glob: string, ignoreCase = false): RegExp {
  let source = '';
  for (const c of glob) {
    if (c === '*') source += '.*';
    else if (c === '?') source += '.';
    else if (c === '[' || c === ']') source += c;
    else source += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`, ignoreCase ? 'i' : '');
}
