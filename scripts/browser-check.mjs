// End-to-end check in the installed Microsoft Edge (no browser download).
// Builds nothing: run `npx vite build` first. Serves dist/, plays key flows,
// collects console errors and saves screenshots to scripts/.check/.
// Run: npm run check
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scripts', '.check');
mkdirSync(outDir, { recursive: true });
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

let server;
/** On Windows `kill()` only stops the shell, so kill the whole process tree. */
function stopServer() {
  if (!server?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
}

const watchdog = setTimeout(() => {
  console.log('BROWSER CHECK: TIMEOUT');
  stopServer();
  process.exit(2);
}, 480_000);

server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, shell: true, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  server.stdout.on('data', (data) => String(data).includes(String(PORT)) && resolve());
  server.on('exit', (code) => reject(new Error(`preview exited ${code}`)));
});

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const problems = [];
let failed = 0;

async function page(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const p = await context.newPage();
  pages.push(p);
  p.on('console', (msg) => msg.type() === 'error' && problems.push(`console: ${msg.text()}`));
  p.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return p;
}
const pages = [];
async function step(name, fn) {
  try {
    await fn();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed++;
    const at = error.stack?.match(/browser-check\.mjs:(\d+)/)?.[1];
    console.log(`FAIL  ${name}: ${error.message.split('\n')[0]}${at ? ` (line ${at})` : ''}`);
    await Promise.all(pages.map((p, i) => p.screenshot({ path: join(outDir, `fail-${name.replace(/\W+/g, '-')}-${i}.png`) }).catch(() => {})));
  } finally {
    // Software WebGL is CPU-bound: extra pages left open starve the next steps.
    for (const extra of pages.splice(1)) await extra.context().close();
  }
}
const shot = (p, name) => p.screenshot({ path: join(outDir, `${name}.png`) });
/** Every case opens with the partner's briefing: answer it to reach the desktop. */
const startCase = (p) => p.locator('.briefing-intro .btn.primary').click({ timeout: 30000 });

const p = await page();
await step('boot -> login -> hub', async () => {
  await p.goto(BASE);
  await p.getByText('PRESS ANY KEY TO CONNECT').waitFor({ timeout: 30000 });
  await shot(p, '01-boot');
  await p.keyboard.press('Enter');
  await p.getByPlaceholder('e.g. Raven').fill('Raven');
  await p.locator('.login-dialogue.detective').waitFor({ timeout: 15000 });
  await p.waitForTimeout(1200);
  await shot(p, '02-login');
  await p.getByRole('button', { name: 'Connect' }).click();
  await p.getByText('Case Map').first().waitFor({ state: 'attached', timeout: 30000 });
  await p.waitForTimeout(2500);
  await shot(p, '03-hub');
});

await step('L01 lockscreen + choice + debrief', async () => {
  await p.goto(`${BASE}/?level=L01`);
  await p.locator('.briefing-intro').waitFor({ timeout: 30000 });
  await p.waitForTimeout(2500);
  await shot(p, '04a-l01-briefing');
  await startCase(p);
  await p.getByText('Workstation locked').waitFor({ timeout: 30000 });
  await p.waitForTimeout(800);
  await shot(p, '04-l01-lock');
  await p.locator('input[type=password]').fill('falcon#rise26');
  await p.keyboard.press('Enter');
  await p.getByText('Incorrect password.').waitFor({ timeout: 5000 });
  await p.locator('input[type=password]').fill('Falcon#Rise26');
  await p.keyboard.press('Enter');
  await p.getByText('The password was written on a note anyone could read').click({ timeout: 10000 });
  await p.getByText('Case closed').waitFor({ timeout: 10000 });
  await p.waitForTimeout(1200);
  await shot(p, '05-l01-debrief');
});

await step('L02 terminal navigation + answers', async () => {
  await p.goto(`${BASE}/?level=L02`);
  await startCase(p);
  await p.locator('.xterm').waitFor({ timeout: 30000 });
  await p.locator('.xterm').click();
  for (const line of ['ls', 'cd Documents/work/tickets/2026-03', 'ls', 'cat TCK-1187.txt']) {
    await p.keyboard.type(line);
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(600);
  await shot(p, '06-l02-terminal');
  const answers = p.locator('.answer input');
  await answers.first().fill('203.0.113.77');
  await answers.first().press('Enter');
  await p.waitForTimeout(400);
  await p.locator('.answer input').first().fill('03:12');
  await p.locator('.answer input').first().press('Enter');
  await p.getByText('Case closed').waitFor({ timeout: 10000 });
});

await step('L04 grep trap feedback', async () => {
  await p.goto(`${BASE}/?level=L04`);
  await startCase(p);
  await p.locator('.xterm').waitFor({ timeout: 30000 });
  await p.locator('.xterm').click();
  await p.keyboard.type('grep -r 203.0.113.77 /var/log | head -n 5');
  await p.keyboard.press('Enter');
  await p.locator('.answer input').first().fill('/var/log/auth.log');
  await p.locator('.answer input').first().press('Enter');
  await p.waitForTimeout(300);
  await p.locator('.answer input').first().fill('37');
  await p.locator('.answer input').first().press('Enter');
  await p.getByText('prefix of the attacker IP').waitFor({ timeout: 5000 });
  await shot(p, '07-l04-trap');
});

await step('evidence board', async () => {
  await p.goto(`${BASE}/?level=L05`);
  await startCase(p);
  await p.locator('.evidence-card').first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(1500);
  await shot(p, '08-l05-board');
});

await step('L06 mail headers', async () => {
  await p.goto(`${BASE}/?level=L06`);
  await startCase(p);
  await p.getByText('ACTION REQUIRED').first().click({ timeout: 30000 });
  await p.getByRole('button', { name: 'Show original' }).click();
  await p.locator('.mail-raw').getByText('Return-Path').waitFor({ timeout: 5000 });
  await p.waitForTimeout(500);
  await shot(p, '16-l06-mail');
  await p.locator('.task-btn', { hasText: 'Case File' }).click();
  for (const answer of ['helixdynamlcs.example', '203.0.113.77']) {
    await p.locator('.answer input').first().fill(answer);
    await p.locator('.answer input').first().press('Enter');
    await p.waitForTimeout(400);
  }
  await p.getByText('The From header is just text').click({ timeout: 10000 });
  await p.getByText('Case closed').waitFor({ timeout: 10000 });
});

await step('L10 proxy log hunt', async () => {
  await p.goto(`${BASE}/?level=L10`);
  await startCase(p);
  await p.locator('.xterm').waitFor({ timeout: 30000 });
  await p.locator('.xterm').click();
  await p.keyboard.type('grep helixdynamlcs.example proxy/access.log | grep POST');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  await shot(p, '17-l10-terminal');
  await p.locator('.task-btn', { hasText: 'Case File' }).click();
  for (const answer of ['6', 's.haddad', '22:47', 'm.chen']) {
    await p.locator('.answer input').first().fill(answer);
    await p.locator('.answer input').first().press('Enter');
    await p.waitForTimeout(400);
  }
  await p.getByText('Reset both passwords').click({ timeout: 10000 });
  await p.getByText('Case closed').waitFor({ timeout: 10000 });
});

await step('L11 base64 decode', async () => {
  await p.goto(`${BASE}/?level=L11`);
  await startCase(p);
  await p.locator('.xterm').waitFor({ timeout: 30000 });
  await p.locator('.xterm').click();
  await p.keyboard.type(`echo ${Buffer.from('s.haddad:Falcon#Rise26').toString('base64')} | base64 -d`);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  await shot(p, '19-l11-base64');
  await p.locator('.task-btn', { hasText: 'Case File' }).click();
  for (const answer of ['s.haddad', 'm.chen', '64']) {
    await p.locator('.answer input').first().fill(answer);
    await p.locator('.answer input').first().press('Enter');
    await p.waitForTimeout(400);
  }
  await p.getByText('base64 is reversible by anyone').click({ timeout: 10000 });
  await p.getByText('Case closed').waitFor({ timeout: 10000 });
});

await step('arabic hub', async () => {
  const ar = await page();
  await ar.goto(`${BASE}/?screen=hub&lang=ar&quality=low`);
  await ar.getByText('خريطة القضايا').first().waitFor({ state: 'attached', timeout: 30000 });
  await ar.waitForTimeout(2000);
  await shot(ar, '09-hub-ar');
});

await step('arabic login', async () => {
  const ar = await page();
  await ar.goto(`${BASE}/?screen=login&lang=ar&quality=low`);
  await ar.locator('.login-dialogue.partner').waitFor({ timeout: 30000 });
  await ar.waitForTimeout(1800);
  await shot(ar, '09a-login-ar');
});

await step('mobile hub', async () => {
  const mobile = await page({ width: 390, height: 844 });
  await mobile.goto(`${BASE}/?screen=hub&quality=low`);
  await mobile.waitForTimeout(2500);
  await shot(mobile, '10-hub-mobile');
});

await step('mobile screens', async () => {
  const m = await page({ width: 390, height: 844 });
  await m.goto(`${BASE}/?quality=low`);
  await m.getByText('PRESS ANY KEY TO CONNECT').waitFor({ timeout: 30000 });
  await shot(m, '11-m-boot');
  await m.keyboard.press('Enter');
  await m.getByPlaceholder('e.g. Raven').waitFor({ timeout: 30000 });
  await m.locator('.login-dialogue.partner').waitFor({ timeout: 15000 });
  await m.waitForTimeout(1500);
  await shot(m, '12-m-login');
  await m.goto(`${BASE}/?level=L01&quality=low`);
  await m.locator('.briefing-intro').waitFor({ timeout: 30000 });
  await m.waitForTimeout(2500);
  await shot(m, '13a-m-briefing');
  await startCase(m);
  await m.getByText('Workstation locked').waitFor({ timeout: 30000 });
  await m.waitForTimeout(800);
  await shot(m, '13-m-l01-lock');
  await m.goto(`${BASE}/?level=L02&quality=low`);
  await startCase(m);
  await m.locator('.xterm').waitFor({ timeout: 30000 });
  await m.waitForTimeout(800);
  await shot(m, '14-m-l02');
  await m.goto(`${BASE}/?level=L05&quality=low`);
  await startCase(m);
  await m.locator('.board, .board-empty').first().waitFor({ timeout: 30000 });
  await m.waitForTimeout(1200);
  await shot(m, '15-m-board');
  await m.goto(`${BASE}/?level=L07&quality=low`);
  await startCase(m);
  await m.getByText('Your March payslip').first().click({ timeout: 30000 });
  await m.getByText('View your payslip').click();
  await m.getByText('verify-session.example/payroll').waitFor({ timeout: 5000 });
  await shot(m, '18-m-mail');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`horizontal overflow ${overflow}px`);
});

await browser.close();
stopServer();
clearTimeout(watchdog);
const unique = [...new Set(problems)];
for (const problem of unique) console.log(`  ${problem}`);
console.log(`screenshots: ${outDir}`);
console.log(failed || unique.length ? `BROWSER CHECK: ${failed} failed, ${unique.length} console problems` : 'BROWSER CHECK: PASS');
process.exit(failed || unique.length ? 1 : 0);
