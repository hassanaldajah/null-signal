// Writes every player-facing text as one review table: key | English | Arabic.
// Contains the full solutions, so it is written OUTSIDE the project (default: your Desktop).
// Run: npm run texts [-- <output.html>]
import { readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { L, LevelConfig } from '../src/engine/schema';
import ar from '../src/i18n/ar';
import en from '../src/i18n/en';
import { PLACEHOLDERS_AR } from '../src/i18n/placeholders';
import { acts } from '../src/levels/manifest';

const out = process.argv[2] ?? join(homedir(), 'Desktop', 'NULL SIGNAL - نصوص اللعبة.html');
const rows: [key: string, en: string, ar: string][] = [];
const add = (key: string, text?: L) => { if (text) rows.push([key, text.en, text.ar ?? '']); };

for (const [key, value] of Object.entries(en)) rows.push([`ui.${key}`, value, (ar as Record<string, string>)[key] ?? '']);
for (const [key, value] of Object.entries(PLACEHOLDERS_AR)) rows.push([`placeholder.${key}`, key, value]);
for (const act of acts) {
  add(`act${act.id}.title`, act.title);
  for (const level of act.levels) { add(`${level.id}.title`, level.title); add(`${level.id}.skill`, level.skill); }
}

const root = join(import.meta.dirname, '..', 'src', 'levels');
for (const act of readdirSync(root).filter((name) => /^act\d+$/.test(name)).sort()) {
  for (const file of readdirSync(join(root, act)).filter((name) => /^l\d+\.ts$/.test(name)).sort()) {
    const c = ((await import(pathToFileURL(join(root, act, file)).href)) as { default: LevelConfig }).default;
    const id = c.id;
    add(`${id}.briefing`, c.briefing);
    add(`${id}.mission.goal`, c.mission.goal);
    c.mission.investigate.forEach((item, i) => add(`${id}.mission.investigate.${i + 1}`, item));
    add(`${id}.mission.success`, c.mission.success);
    add(`${id}.lock.hint`, c.world.lockscreen?.hint);
    for (const o of c.objectives) {
      add(`${id}.${o.id}.prompt`, o.prompt);
      if (o.validator.kind === 'choice') for (const option of o.validator.options) add(`${id}.${o.id}.option.${option.id}`, option.label);
      add(`${id}.${o.id}.wrong`, o.wrong);
      for (const grant of o.grants ?? []) add(`${id}.evidence.${grant.id}`, grant.title);
    }
    add(`${id}.guide.1-nudge`, c.guide.nudge);
    add(`${id}.guide.2-clue`, c.guide.clue);
    for (const o of c.objectives) add(`${id}.guide.3-step.${o.id}`, c.guide.steps[o.id]);
    add(`${id}.guide.concept`, c.guide.concept);
    add(`${id}.intel`, c.intel?.text);
    add(`${id}.debrief.concept`, c.debrief.concept);
    add(`${id}.debrief.takeaway`, c.debrief.takeaway);
    add(`${id}.echo.intro`, c.echo.intro);
    add(`${id}.echo.success`, c.echo.success);
    add(`${id}.ghost`, c.ghost?.taunt);
  }
}

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (text: string) => esc(text).replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>NULL SIGNAL - text review</title>
<style>
  body { margin: 0; background: #070b14; color: #d9e4f5; font: 15px/1.6 "Segoe UI", Tahoma, sans-serif; }
  header { position: sticky; top: 0; padding: 10px 16px; background: #0b1222; border-bottom: 1px solid #1c2a44; }
  input { width: min(480px, 100%); padding: 8px 10px; border: 1px solid #1d3150; border-radius: 6px; background: #05080f; color: inherit; font: inherit; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { padding: 8px 12px; border-bottom: 1px solid #16223a; vertical-align: top; text-align: start; }
  th { color: #00e5ff; } th:first-child, td:first-child { width: 22%; font: 12px/1.5 Consolas, monospace; color: #8aa0c8; overflow-wrap: anywhere; }
  td[dir=rtl] { font-size: 16px; line-height: 1.8; }
  code { font: 13px Consolas, monospace; color: #7ff3ff; background: #0f1b2e; border-radius: 4px; padding: 0 4px; unicode-bidi: isolate; overflow-wrap: anywhere; }
  tr.missing td { background: #2a1020; }
</style></head><body>
<header><input id="q" placeholder="Filter: L04, guide, option, any word..." autofocus> <span id="n"></span></header>
<table><thead><tr><th>key</th><th>English</th><th>Arabic</th></tr></thead><tbody>
${rows.map(([key, a, b]) => `<tr${b ? '' : ' class="missing"'}><td>${esc(key)}</td><td dir="ltr">${rich(a)}</td><td dir="rtl" lang="ar">${rich(b)}</td></tr>`).join('\n')}
</tbody></table>
<script>
  const q = document.getElementById('q'), n = document.getElementById('n'), trs = [...document.querySelectorAll('tbody tr')];
  const run = () => { const v = q.value.toLowerCase(); let c = 0; for (const tr of trs) { const ok = tr.textContent.toLowerCase().includes(v); tr.hidden = !ok; c += ok; } n.textContent = c + ' / ' + trs.length; };
  q.addEventListener('input', run); run();
</script></body></html>`;
writeFileSync(out, html, 'utf8');
console.log(`${rows.length} texts (${rows.filter((row) => !row[2]).length} without Arabic) -> ${out}`);
