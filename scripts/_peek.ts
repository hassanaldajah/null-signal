// Maintainer helper: runs shell commands inside a level's world and prints the output.
// Run: npx tsx scripts/_peek.ts L22 "ls -a" "cat .bash_aliases"
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LevelConfig } from '../src/engine/schema';
import { Shell } from '../src/engine/shell/shell';
import { Vfs } from '../src/engine/vfs';

const [id, ...commands] = process.argv.slice(2);
const root = join(import.meta.dirname, '..', 'src', 'levels');
const act = readdirSync(root).find((name) => /^act\d+$/.test(name) && readdirSync(join(root, name)).includes(`${id.toLowerCase()}.ts`));
if (!act) throw new Error(`level ${id} not found`);
const config = ((await import(pathToFileURL(join(root, act, `${id.toLowerCase()}.ts`)).href)) as { default: LevelConfig }).default;
const shell = new Shell(new Vfs(config.world), { user: config.world.user, host: config.world.host, cwd: config.world.cwd, now: new Date(config.world.now ?? '2026-03-14T12:00:00Z') });
for (const command of commands) {
  const result = shell.run(command);
  console.log(`$ ${command}\n${result.out}${result.err ? `\n[err] ${result.err}` : ''}\n`);
}
