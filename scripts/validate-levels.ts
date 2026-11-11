// Validates every level config: schema rules, evidence dependency graph, discoverable answers,
// and runs each level's selfTest inside its own simulated shell.
// Run: npm run validate
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EvidenceDef, L, LevelConfig } from '../src/engine/schema';
import { guideCost } from '../src/engine/guide';
import { Shell } from '../src/engine/shell/shell';
import { Vfs } from '../src/engine/vfs';
import { PLACEHOLDERS_AR } from '../src/i18n/placeholders';
import { levelsInOrder } from '../src/levels/manifest';
import { IMPLEMENTED_APPS } from '../src/os/apps/implemented';

const errors: string[] = [];
const warnings: string[] = [];
const err = (id: string, message: string) => errors.push(`${id}: ${message}`);
const warn = (id: string, message: string) => warnings.push(`${id}: ${message}`);

async function loadConfigs(): Promise<Map<string, LevelConfig>> {
  const root = join(import.meta.dirname, '..', 'src', 'levels');
  const configs = new Map<string, LevelConfig>();
  for (const act of readdirSync(root).filter((name) => /^act\d+$/.test(name))) {
    for (const file of readdirSync(join(root, act)).filter((name) => /^l\d+\.ts$/.test(name))) {
      const module = (await import(pathToFileURL(join(root, act, file)).href)) as { default: LevelConfig };
      const config = module.default;
      if (`${config.id.toLowerCase()}.ts` !== file) err(config.id, `file name ${act}/${file} does not match id`);
      configs.set(config.id, config);
    }
  }
  return configs;
}

function checkL(id: string, where: string, text: L | undefined): void {
  if (!text?.en?.trim()) err(id, `${where}: missing English text`);
  else if (!text.ar?.trim()) err(id, `${where}: missing Arabic translation`);
  else {
    for (const [lang, value] of [['en', text.en], ['ar', text.ar]] as const) {
      if ((value.match(/`/g)?.length ?? 0) % 2) err(id, `${where} (${lang}): unbalanced backticks`);
    }
    // In Arabic, a command or path outside `backticks` jumps sides in a right-to-left sentence.
    const plain = text.ar.replace(/`[^`]*`/g, ' ');
    if (/(^|[\s(])[/~$][A-Za-z0-9]|[A-Za-z0-9] -{1,2}[A-Za-z]/.test(plain)) warn(id, `${where}: Arabic text has a command or path outside backticks`);
  }
}

function corpus(config: LevelConfig): string {
  const parts: string[] = [];
  const vfs = new Vfs(config.world);
  for (const node of vfs.walk('/')) {
    parts.push(node.path);
    if (node.type === 'file') parts.push(vfs.read(node.path) ?? '');
  }
  for (const note of config.world.notes ?? []) parts.push(note.title, note.body);
  for (const mail of config.world.emails ?? []) parts.push(mail.from, mail.to, mail.subject, mail.body, ...(mail.headers ?? []).map(([, value]) => value));
  for (const packet of config.world.packets ?? []) parts.push(`${packet.src} ${packet.dst} ${packet.proto} ${packet.info}`, packet.data ?? '');
  for (const row of config.world.processes ?? []) parts.push(`${row.pid} ${row.ppid} ${row.name} ${row.user} ${row.start}`, row.path);
  for (const [key, values] of Object.entries(config.world.registry ?? {})) parts.push(key, ...Object.entries(values).flat());
  for (const page of config.world.pages ?? []) parts.push(page.url, page.title, page.body);
  if (config.world.lockscreen?.hint) parts.push(config.world.lockscreen.hint.en);
  return parts.join('\n').toLowerCase();
}

async function main() {
  // 1. Manifest
  const ids = levelsInOrder.map((level) => level.id);
  if (ids.length !== 27) err('manifest', `expected 27 levels, found ${ids.length}`);
  if (new Set(ids).size !== ids.length) err('manifest', 'duplicate level ids');
  levelsInOrder.forEach((level, index) => {
    if (level.order !== index + 1) err(level.id, `order ${level.order} should be ${index + 1}`);
    checkL(level.id, 'manifest title', level.title);
    checkL(level.id, 'manifest skill', level.skill);
  });

  const configs = await loadConfigs();
  const orderOf = new Map(levelsInOrder.map((level) => [level.id, level.order]));
  const grantedBy = new Map<string, { level: string; def: EvidenceDef }>();

  // Collect evidence (unique across the whole game).
  for (const config of configs.values()) {
    if (!orderOf.has(config.id)) err(config.id, 'not in manifest');
    for (const objective of config.objectives) {
      for (const def of objective.grants ?? []) {
        if (grantedBy.has(def.id)) err(config.id, `evidence ${def.id} already granted by ${grantedBy.get(def.id)!.level}`);
        grantedBy.set(def.id, { level: config.id, def });
      }
    }
  }

  // Levels must be built in order: no gaps.
  const built = levelsInOrder.filter((level) => configs.has(level.id)).map((level) => level.order);
  built.forEach((order, index) => {
    if (order !== index + 1) err(`L${String(order).padStart(2, '0')}`, 'built out of order (earlier levels missing)');
  });

  for (const config of [...configs.values()].sort((a, b) => orderOf.get(a.id)! - orderOf.get(b.id)!)) {
    const id = config.id;
    const order = orderOf.get(id) ?? 0;

    // 2. Requirements and evidence graph
    for (const level of config.requires.levels) {
      if (!configs.has(level)) err(id, `requires missing level ${level}`);
      else if (orderOf.get(level)! >= order) err(id, `requires later level ${level}`);
    }
    for (const evidence of config.requires.evidence) {
      const source = grantedBy.get(evidence);
      if (!source) err(id, `requires unknown evidence ${evidence}`);
      else if (orderOf.get(source.level)! >= order) err(id, `requires evidence ${evidence} granted by later level ${source.level}`);
    }
    const ownGrants = new Set(config.objectives.flatMap((objective) => (objective.grants ?? []).map((def) => def.id)));
    for (const objective of config.objectives) {
      for (const def of objective.grants ?? []) {
        checkL(id, `evidence ${def.id} title`, def.title);
        for (const link of def.links ?? []) {
          const source = grantedBy.get(link);
          if (!source) err(id, `evidence ${def.id} links unknown ${link}`);
          else if (orderOf.get(source.level)! > order) err(id, `evidence ${def.id} links future evidence ${link}`);
          else if (source.level !== id && !config.requires.evidence.includes(link) && !ownGrants.has(link)) {
            warn(id, `evidence ${def.id} links ${link} which is not in requires.evidence`);
          }
        }
      }
    }

    // 3. Apps
    if (!config.apps.includes('case')) err(id, 'apps must include "case"');
    for (const app of config.apps) if (!IMPLEMENTED_APPS.includes(app)) err(id, `app "${app}" is not implemented yet`);
    for (const app of config.autoOpen ?? []) if (!config.apps.includes(app)) err(id, `autoOpen "${app}" not in apps`);

    // 4. Text
    checkL(id, 'briefing', config.briefing);
    checkL(id, 'echo.intro', config.echo.intro);
    checkL(id, 'echo.success', config.echo.success);
    checkL(id, 'debrief.concept', config.debrief.concept);
    checkL(id, 'debrief.takeaway', config.debrief.takeaway);
    if (config.intel) checkL(id, 'intel.text', config.intel.text);
    if (config.ghost) checkL(id, 'ghost.taunt', config.ghost.taunt);
    if (!config.debrief.source.trim()) err(id, 'debrief.source is required (accuracy)');
    if (!config.debrief.realTools.length) err(id, 'debrief.realTools is empty');

    // 5. Mission and guide: every level states its goal, where to look and what done means,
    // and the solution tier has one step for every objective.
    checkL(id, 'mission.goal', config.mission.goal);
    checkL(id, 'mission.success', config.mission.success);
    if (config.mission.investigate.length < 2 || config.mission.investigate.length > 4) err(id, 'mission.investigate needs 2 to 4 items');
    config.mission.investigate.forEach((item, index) => checkL(id, `mission.investigate ${index + 1}`, item));
    checkL(id, 'guide.nudge', config.guide.nudge);
    checkL(id, 'guide.clue', config.guide.clue);
    checkL(id, 'guide.concept', config.guide.concept);
    for (const objective of config.objectives) {
      if (!config.guide.steps[objective.id]) err(id, `guide.steps is missing objective ${objective.id}`);
      else checkL(id, `guide.steps.${objective.id}`, config.guide.steps[objective.id]);
    }
    for (const key of Object.keys(config.guide.steps)) {
      if (!config.objectives.some((objective) => objective.id === key)) err(id, `guide.steps has unknown objective ${key}`);
    }
    if ([0, 1, 2].reduce((sum, tier) => sum + guideCost(config, tier), 0) >= config.rewards.points) err(id, 'guide tiers cost as much as the level reward');

    // 6. Objectives
    const objectiveIds = new Set<string>();
    const text = corpus(config);
    const requiredEvidence = config.requires.evidence.map((evidence) => grantedBy.get(evidence)?.def.content.toLowerCase() ?? '');
    const vfs = new Vfs(config.world);
    if (!config.objectives.length) err(id, 'no objectives');
    for (const objective of config.objectives) {
      if (objectiveIds.has(objective.id)) err(id, `duplicate objective ${objective.id}`);
      objectiveIds.add(objective.id);
      checkL(id, `objective ${objective.id}`, objective.prompt);
      if (objective.wrong) checkL(id, `objective ${objective.id} wrong`, objective.wrong);
      if (objective.placeholder && /^[A-Za-z][a-z]+( [A-Za-z][a-z]+)*$/.test(objective.placeholder) && !PLACEHOLDERS_AR[objective.placeholder]) {
        err(id, `${objective.id}: placeholder "${objective.placeholder}" has no Arabic text (i18n PLACEHOLDERS_AR)`);
      }
      const v = objective.validator;
      switch (v.kind) {
        case 'answer': {
          if (!v.accept.length) err(id, `${objective.id}: no accepted answers`);
          const discoverable = v.accept.some((answer) => text.includes(answer.toLowerCase()) || requiredEvidence.some((c) => c.includes(answer.toLowerCase())));
          if (!discoverable && !objective.derived) err(id, `${objective.id}: answer "${v.accept[0]}" is not in the world or required evidence (add "derived")`);
          break;
        }
        case 'evidence':
          if (!config.requires.evidence.includes(v.evidence)) err(id, `${objective.id}: uses ${v.evidence} but it is not in requires.evidence`);
          break;
        case 'command':
          try {
            new RegExp(v.pattern);
          } catch {
            err(id, `${objective.id}: invalid regex ${v.pattern}`);
          }
          break;
        case 'cwd':
          if (!vfs.isDir(v.path)) err(id, `${objective.id}: cwd target ${v.path} is not a directory`);
          break;
        case 'choice':
          if (!v.options.some((option) => option.id === v.correct)) err(id, `${objective.id}: correct choice missing`);
          v.options.forEach((option) => checkL(id, `${objective.id} option ${option.id}`, option.label));
          break;
      }
    }
    const lock = config.world.lockscreen;
    if (lock) {
      const target = config.objectives.find((objective) => objective.id === lock.objective);
      if (!target) err(id, `lockscreen objective ${lock.objective} not found`);
      else if (target.validator.kind !== 'answer') err(id, 'lockscreen objective must be an answer validator');
    }

    // 7. Self-test in the real shell: proves terminal objectives are solvable with the data.
    const shell = new Shell(vfs, { user: config.world.user, host: config.world.host, cwd: config.world.cwd, now: new Date(config.world.now ?? '2026-03-14T12:00:00Z') });
    const visited = new Set<string>([shell.cwd]);
    const ran: string[] = [];
    for (const step of config.selfTest) {
      const result = shell.run(step.run);
      ran.push(step.run);
      visited.add(shell.cwd);
      const output = `${result.out}\n${result.err ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
      if (result.err && !step.includes) err(id, `selfTest "${step.run}" failed: ${result.err}`);
      if (!output.includes(step.includes)) err(id, `selfTest "${step.run}" output lacks "${step.includes}"`);
    }
    for (const objective of config.objectives) {
      const v = objective.validator;
      if (v.kind === 'command' && !ran.some((line) => new RegExp(v.pattern).test(line))) {
        err(id, `${objective.id}: no selfTest command satisfies /${v.pattern}/`);
      }
      if (v.kind === 'cwd' && !visited.has(v.path)) err(id, `${objective.id}: selfTest never reaches ${v.path}`);
    }
  }

  const missing = levelsInOrder.filter((level) => !configs.has(level.id)).length;
  for (const warning of warnings) console.log(`warn  ${warning}`);
  for (const error of errors) console.log(`ERROR ${error}`);
  console.log(`\n${configs.size}/${levelsInOrder.length} levels built, ${grantedBy.size} evidence items, ${missing} levels pending.`);
  console.log(errors.length ? `VALIDATION FAILED (${errors.length} errors)` : 'VALIDATION PASSED');
  process.exit(errors.length ? 1 : 0);
}

main();
