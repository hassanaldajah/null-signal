// Writes the owner's private walkthrough: every built level's answers, then an Arabic explanation.
// Spoilers: the file is written OUTSIDE the project (default: your Desktop) and must never ship.
// Run: npm run solutions [-- <output.txt>]
import { readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EvidenceDef, L, LevelConfig, Objective } from '../src/engine/schema';
import { acts, levelsInOrder } from '../src/levels/manifest';

const out = process.argv[2] ?? join(homedir(), 'Desktop', 'NULL SIGNAL - حلول المراحل.txt');
const ar = (text?: L) => text?.ar ?? text?.en ?? '';
const RULE = '='.repeat(64);
const THIN = '-'.repeat(64);

async function loadConfigs(): Promise<Map<string, LevelConfig>> {
  const root = join(import.meta.dirname, '..', 'src', 'levels');
  const configs = new Map<string, LevelConfig>();
  for (const act of readdirSync(root).filter((name) => /^act\d+$/.test(name))) {
    for (const file of readdirSync(join(root, act)).filter((name) => /^l\d+\.ts$/.test(name))) {
      const config = ((await import(pathToFileURL(join(root, act, file)).href)) as { default: LevelConfig }).default;
      configs.set(config.id, config);
    }
  }
  return configs;
}

/** What the player has to type or pick for one objective. */
function answer(objective: Objective, config: LevelConfig, evidence: Map<string, EvidenceDef>): string {
  const v = objective.validator;
  switch (v.kind) {
    case 'answer': {
      const others = v.accept.slice(1, 3);
      return `${v.accept[0]}${others.length ? `   (مقبول كمان: ${others.join(' / ')})` : ''}`;
    }
    case 'evidence':
      return evidence.get(v.evidence)?.content ?? v.evidence;
    case 'choice':
      return ar(v.options.find((option) => option.id === v.correct)?.label);
    case 'command': {
      const run = config.selfTest.find((step) => new RegExp(v.pattern).test(step.run))?.run;
      return `اكتب بالطرفية: ${run ?? `أمر يطابق ${v.pattern}`}`;
    }
    case 'cwd':
      return `روح للمجلد: cd ${v.path}`;
  }
}

async function main() {
  const configs = await loadConfigs();
  const evidence = new Map<string, EvidenceDef>();
  for (const config of configs.values()) for (const objective of config.objectives) for (const def of objective.grants ?? []) evidence.set(def.id, def);

  const built = levelsInOrder.filter((meta) => configs.has(meta.id));
  const lines: string[] = [
    'NULL SIGNAL - حلول المراحل',
    'ملف خاص بصاحب اللعبة: فيه كل الأجوبة. لا تنشره ولا ترفعه مع اللعبة.',
    `آخر تحديث: ${new Date().toISOString().slice(0, 10)}  -  ${built.length} من ${levelsInOrder.length} مرحلة جاهزة`,
    'لتحديثه بعد إضافة مراحل جديدة: npm run solutions',
    '',
  ];

  for (const meta of built) {
    const config = configs.get(meta.id)!;
    const act = acts[meta.act - 1];
    lines.push(
      RULE,
      `${meta.id}  ${ar(meta.title)}  (${meta.title.en})${meta.boss ? '  - زعيم الفصل' : ''}`,
      `الفصل ${meta.act}: ${ar(act.title)}  -  المهارة: ${ar(meta.skill)}`,
      THIN,
      'الأجوبة:',
    );
    config.objectives.forEach((objective, index) => {
      lines.push(`  ${index + 1}. ${ar(objective.prompt)}`, `     الجواب: ${answer(objective, config, evidence)}`);
    });
    lines.push(
      '',
      'الشرح:',
      `  كيف توصل: ${ar(config.hints[1].text)}`,
      `  الحل خطوة بخطوة: ${ar(config.hints[2].text)}`,
      `  الفكرة من المرحلة: ${ar(config.debrief.takeaway)}`,
      `  ملخّص الأوامر (بالإنجليزي): ${config.solution}`,
      '',
    );
  }

  // UTF-8 with a BOM so every Windows editor shows the Arabic correctly; CRLF for Notepad.
  writeFileSync(out, `﻿${lines.join('\r\n')}\r\n`, 'utf8');
  console.log(`${built.length} levels -> ${out}`);
}

void main();
