// Writes the owner's private walkthrough: every built level's answers, then an Arabic explanation,
// as a text file and as a PDF ("حل اللعبة.pdf": each level in four steps, rendered by headless Edge).
// Spoilers: both files are written OUTSIDE the project (default: your Desktop) and must never ship.
// Run: npm run solutions [-- <output.txt> [<output.pdf>]]
import { readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import type { EvidenceDef, L, LevelConfig, LevelMeta, Objective } from '../src/engine/schema';
import arUi from '../src/i18n/ar';
import { acts, levelsInOrder } from '../src/levels/manifest';

const out = process.argv[2] ?? join(homedir(), 'Desktop', 'NULL SIGNAL - حلول المراحل.txt');
const pdfOut = process.argv[3] ?? join(homedir(), 'Desktop', 'حل اللعبة.pdf');
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

// --- PDF ----------------------------------------------------------------------

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Hint text to HTML: `code` spans become <code>. */
const rich = (text: string) => esc(text).replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>');
const ltr = (text: string) => `<code dir="ltr">${esc(text)}</code>`;
const isArabic = (text: string) => /[؀-ۿ]/.test(text);

/** The answer line of step 4, with commands and values kept left-to-right. */
function answerHtml(objective: Objective, config: LevelConfig, evidence: Map<string, EvidenceDef>): string {
  const v = objective.validator;
  switch (v.kind) {
    case 'answer': {
      const [first, ...rest] = v.accept;
      const others = rest.slice(0, 2);
      return `اكتب: ${isArabic(first) ? `<b>${esc(first)}</b>` : ltr(first)}${others.length ? ` <span class="also">(مقبول كمان: ${others.map(ltr).join(' / ')})</span>` : ''}`;
    }
    case 'evidence':
      return `اكتب: ${ltr(evidence.get(v.evidence)?.content ?? v.evidence)}`;
    case 'choice':
      return `اختار: <b>«${esc(ar(v.options.find((option) => option.id === v.correct)?.label))}»</b>`;
    case 'command': {
      const run = config.selfTest.find((step) => new RegExp(v.pattern).test(step.run))?.run;
      return `اكتب بالطرفية: ${ltr(run ?? v.pattern)}`;
    }
    case 'cwd':
      return `روح للمجلد: ${ltr(`cd ${v.path}`)}`;
  }
}

function levelHtml(meta: LevelMeta, config: LevelConfig, evidence: Map<string, EvidenceDef>): string {
  const apps = config.apps.map((id) => arUi[`app.${id}` as keyof typeof arUi] ?? id).join('، ');
  const answers = config.objectives
    .map((objective) => `<li><p class="q">${rich(ar(objective.prompt))}</p><p class="a">${answerHtml(objective, config, evidence)}</p></li>`)
    .join('');
  return `
<section class="level">
  <header>
    <span class="id" dir="ltr">${meta.id}</span>
    <div>
      <h2>${esc(ar(meta.title))} <span class="en" dir="ltr">${esc(meta.title.en)}</span>${meta.boss ? ' <span class="boss">زعيم الفصل</span>' : ''}</h2>
      <p class="meta">المهارة: ${esc(ar(meta.skill))}</p>
    </div>
  </header>
  <ol class="steps">
    <li><h3>افتح وابدأ</h3><p class="apps">البرامج بهالمرحلة: ${esc(apps)}</p><p>${rich(ar(config.hints[0].text))}</p></li>
    <li><h3>دوّر على الدليل</h3><p>${rich(ar(config.hints[1].text))}</p></li>
    <li><h3>اوصل للحل</h3><p>${rich(ar(config.hints[2].text))}</p></li>
    <li><h3>جاوب على الأسئلة</h3><ol class="answers">${answers}</ol></li>
  </ol>
  <p class="idea"><b>الفكرة:</b> ${rich(ar(config.debrief.takeaway))}</p>
</section>`;
}

function pdfHtml(built: LevelMeta[], configs: Map<string, LevelConfig>, evidence: Map<string, EvidenceDef>): string {
  const toc = acts
    .map((act) => `<div class="toc-act" style="--act:${act.color}"><h3>الفصل ${act.id}: ${esc(ar(act.title))}</h3><ul>${act.levels
      .filter((meta) => configs.has(meta.id))
      .map((meta) => `<li><span dir="ltr">${meta.id}</span> ${esc(ar(meta.title))}</li>`)
      .join('')}</ul></div>`)
    .join('');
  const body = acts
    .map((act) => {
      const levels = act.levels.filter((meta) => built.includes(meta));
      if (!levels.length) return '';
      return `<div class="act" style="--act:${act.color}"><h1 class="act-title"><span>الفصل ${act.id}</span> ${esc(ar(act.title))}</h1>${levels.map((meta) => levelHtml(meta, configs.get(meta.id)!, evidence)).join('')}</div>`;
    })
    .join('');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>حل اللعبة - NULL SIGNAL</title>
<style>
  @page { size: A4; margin: 14mm 13mm 16mm; background: #070b14; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { background: #070b14; }
  body { margin: 0; color: #d9e4f5; font: 11.5pt/1.75 "Segoe UI", Tahoma, Arial, sans-serif; }
  code { font: 9.5pt/1.5 Consolas, "Cascadia Mono", monospace; color: #7ff3ff; background: #0f1b2e; border: 1px solid #1d3150; border-radius: 4px; padding: 0 4px; unicode-bidi: isolate; overflow-wrap: anywhere; }
  .cover { height: 255mm; display: flex; flex-direction: column; justify-content: center; gap: 10mm; break-after: page; }
  .brand { direction: ltr; text-align: right; font: 700 40pt/1 "Segoe UI", Arial, sans-serif; letter-spacing: 4px; color: #00e5ff; }
  .cover h1 { margin: 0; font-size: 30pt; color: #fff; }
  .cover .sub { margin: 0; font-size: 14pt; color: #8a9bb8; }
  .warn { border: 1px solid #ff2bd6; border-radius: 10px; padding: 4mm 6mm; color: #ffc1f1; background: #1a0b1c; }
  .how { border: 1px solid #1c2a44; border-radius: 10px; padding: 4mm 6mm; background: #0b1222; }
  .how ol { margin: 2mm 0 0; padding-inline-start: 6mm; }
  .toc { break-after: page; }
  .toc > h1 { color: #fff; font-size: 20pt; margin: 0 0 6mm; }
  .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 8mm; }
  .toc-act h3 { margin: 0 0 1mm; color: var(--act); font-size: 12pt; }
  .toc-act ul { margin: 0; padding: 0; list-style: none; color: #c3d0e6; }
  .toc-act li span { display: inline-block; min-width: 11mm; color: #8a9bb8; font-family: Consolas, monospace; }
  .act { break-before: page; }
  .act:first-of-type { break-before: auto; }
  .act-title { margin: 0 0 5mm; padding-bottom: 2mm; border-bottom: 2px solid var(--act); color: #fff; font-size: 19pt; }
  .act-title span { color: var(--act); }
  .level { margin: 0 0 7mm; padding: 4mm 5mm; border: 1px solid #1c2a44; border-inline-start: 4px solid var(--act); border-radius: 10px; background: #0b1222; break-inside: avoid; }
  .level header { display: flex; align-items: center; gap: 4mm; break-after: avoid; }
  .level .id { font: 700 15pt/1 Consolas, monospace; color: var(--act); border: 1px solid var(--act); border-radius: 8px; padding: 2mm 3mm; }
  .level h2 { margin: 0; font-size: 15pt; color: #fff; }
  .level h2 .en { font-size: 10pt; font-weight: 400; color: #8a9bb8; }
  .boss { font-size: 9pt; font-weight: 700; color: #070b14; background: var(--act); border-radius: 20px; padding: 0 3mm; vertical-align: middle; }
  .meta { margin: 0; color: #8a9bb8; font-size: 10pt; }
  .steps { list-style: none; counter-reset: step; margin: 3mm 0 0; padding: 0; }
  .steps > li { counter-increment: step; position: relative; padding-inline-start: 11mm; margin-top: 3mm; break-inside: avoid; }
  .steps > li::before { content: counter(step); position: absolute; inset-inline-start: 0; top: 0.5mm; width: 7mm; height: 7mm; border-radius: 50%; background: var(--act); color: #070b14; font-weight: 700; text-align: center; line-height: 7mm; }
  .steps h3 { margin: 0; font-size: 11.5pt; color: var(--act); }
  .steps p { margin: 0.5mm 0 0; }
  .apps { color: #8a9bb8; font-size: 10pt; }
  .answers { margin: 1mm 0 0; padding-inline-start: 5mm; }
  .answers li { margin-top: 1.5mm; break-inside: avoid; }
  .answers .q { color: #c3d0e6; }
  .answers .a { color: #39ff88; }
  .answers .a b { color: #39ff88; }
  .also { color: #8a9bb8; font-size: 9.5pt; }
  .idea { break-before: avoid; margin: 3mm 0 0; padding-top: 2mm; border-top: 1px dashed #1c2a44; color: #c3d0e6; font-size: 10.5pt; }
</style>
</head>
<body>
  <section class="cover">
    <div class="brand">NULL SIGNAL</div>
    <h1>حل اللعبة</h1>
    <p class="sub">كل مرحلة وحلّها بأربع خطوات · ${built.length} مرحلة · آخر تحديث <bdi dir="ltr">${new Date().toISOString().slice(0, 10)}</bdi></p>
    <div class="how"><b>كيف تقرأ كل مرحلة:</b>
      <ol>
        <li>افتح وابدأ: البرامج اللي بتلزمك وأول شي تعمله.</li>
        <li>دوّر على الدليل: وين تدوّر وبأي أمر.</li>
        <li>اوصل للحل: الطريقة الكاملة.</li>
        <li>جاوب على الأسئلة: الجواب المطلوب لكل سؤال بالترتيب.</li>
      </ol>
    </div>
    <div class="warn">ملف خاص بصاحب اللعبة فيه كل الأجوبة. لا تنشره ولا ترفعه مع اللعبة. لتحديثه بعد أي تعديل:<br><code dir="ltr">npm run solutions</code></div>
  </section>
  <section class="toc"><h1>الفهرس</h1><div class="toc-grid">${toc}</div></section>
  ${body}
</body>
</html>`;
}

async function writePdf(html: string): Promise<void> {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: pdfOut,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font:9px Segoe UI,Arial,sans-serif;color:#8a9bb8;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
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
  await writePdf(pdfHtml(built, configs, evidence));
  console.log(`${built.length} levels -> ${pdfOut}`);
}

void main();
