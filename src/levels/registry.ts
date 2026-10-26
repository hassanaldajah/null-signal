import type { LevelConfig } from '../engine/schema';

// Each level file is its own chunk: only the level being played is downloaded.
const loaders = import.meta.glob<{ default: LevelConfig }>('./act*/l*.ts');

function loaderKey(id: string): string | undefined {
  if (!/^L\d{2}$/.test(id)) return undefined;
  const file = `/${id.toLowerCase()}.ts`;
  return Object.keys(loaders).find((key) => key.endsWith(file));
}

export function hasLevel(id: string): boolean {
  return loaderKey(id) !== undefined;
}

export async function loadLevel(id: string): Promise<LevelConfig> {
  const key = loaderKey(id);
  if (!key) throw new Error(`Level ${id} is not built yet`);
  return (await loaders[key]()).default;
}
