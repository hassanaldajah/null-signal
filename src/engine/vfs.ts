import type { VFile, World } from './schema';

export interface VNode {
  path: string;
  type: 'file' | 'dir';
  file?: Required<Pick<VFile, 'content' | 'mode' | 'owner' | 'mtime'>> & Pick<VFile, 'encoding'>;
}

const DEFAULT_MTIME = '2026-03-14T09:12:00Z';

/** In-memory, read-only virtual filesystem built from a level's World. No real disk access. */
export class Vfs {
  readonly home: string;
  private nodes = new Map<string, VNode>();

  constructor(world: World) {
    this.home = normalize(world.home);
    this.addDir('/');
    this.addDir(this.home);
    for (const dir of world.dirs ?? []) this.addDir(normalize(dir));
    for (const [rawPath, value] of Object.entries(world.files ?? {})) {
      const path = normalize(rawPath);
      const file = typeof value === 'string' ? { content: value } : value;
      this.addDir(parentOf(path));
      this.nodes.set(path, {
        path,
        type: 'file',
        file: {
          content: file.content,
          encoding: file.encoding,
          mode: file.mode ?? '-rw-r--r--',
          owner: file.owner ?? world.user,
          mtime: file.mtime ?? DEFAULT_MTIME,
        },
      });
    }
  }

  private addDir(path: string): void {
    if (this.nodes.has(path)) return;
    if (path !== '/') this.addDir(parentOf(path));
    this.nodes.set(path, { path, type: 'dir' });
  }

  /** Resolves `target` (absolute, relative, ~) against `cwd`. */
  resolve(cwd: string, target: string): string {
    if (!target || target === '~') return this.home;
    if (target.startsWith('~/')) target = this.home + target.slice(1);
    return normalize(target.startsWith('/') ? target : `${cwd}/${target}`);
  }

  get(path: string): VNode | undefined {
    return this.nodes.get(path);
  }

  isDir(path: string): boolean {
    return this.nodes.get(path)?.type === 'dir';
  }

  /** Direct children (names), sorted like `ls`. */
  list(dir: string): VNode[] {
    const prefix = dir === '/' ? '/' : `${dir}/`;
    const children: VNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.path !== dir && node.path.startsWith(prefix) && !node.path.slice(prefix.length).includes('/')) {
        children.push(node);
      }
    }
    return children.sort((a, b) => baseName(a.path).localeCompare(baseName(b.path)));
  }

  /** Every node under `dir` (recursive), including `dir` itself. */
  walk(dir: string): VNode[] {
    const prefix = dir === '/' ? '/' : `${dir}/`;
    return [...this.nodes.values()]
      .filter((node) => node.path === dir || node.path.startsWith(prefix))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  read(path: string): string | undefined {
    const node = this.nodes.get(path);
    if (node?.type !== 'file' || !node.file) return undefined;
    return node.file.encoding === 'base64' ? atob(node.file.content) : node.file.content;
  }

  size(node: VNode): number {
    if (node.type === 'dir') return 4096;
    return bytesOf(this.read(node.path) ?? '').length;
  }
}

export function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function parentOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

export function baseName(path: string): string {
  return path === '/' ? '/' : path.slice(path.lastIndexOf('/') + 1);
}

/** Bytes of a VFS string: chars up to 0xFF are raw bytes, anything else is UTF-8 encoded. */
export function bytesOf(text: string): number[] {
  const out: number[] = [];
  const utf8 = new TextEncoder();
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code <= 0xff) out.push(code);
    else out.push(...utf8.encode(char));
  }
  return out;
}
