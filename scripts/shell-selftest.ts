// Quick self-test for the virtual shell: `npx tsx scripts/shell-selftest.ts`
import { Shell } from '../src/engine/shell/shell';
import { Vfs } from '../src/engine/vfs';

const vfs = new Vfs({
  user: 'analyst',
  host: 'nexus',
  home: '/home/analyst',
  files: {
    '/home/analyst/notes.txt': 'meeting at 10\npassword reset done\nIP 10.0.0.7 seen\n',
    '/home/analyst/.secret': 'hidden flag\n',
    '/home/analyst/logs/a.log': { content: 'ok 10.0.0.7\nfail 10.0.0.9\nok 10.0.0.7\n', mtime: '2026-03-13T08:00:00Z' },
    '/home/analyst/logs/b.log': { content: 'fail 10.0.0.7\n', mode: '-rwxrwxrwx', mtime: '2026-03-01T08:00:00Z' },
    '/var/spool/cron/crontabs/analyst': '0 9 * * 1 /home/analyst/report.sh\n',
  },
});
const shell = new Shell(vfs, { user: 'analyst', host: 'nexus', now: new Date('2026-03-14T12:00:00Z') });

const cases: [string, (out: string) => boolean][] = [
  ['ls', (o) => !o.includes('.secret') && o.includes('notes.txt')],
  ['ls -a', (o) => o.includes('.secret')],
  ['cat .secret', (o) => o === 'hidden flag'],
  ['grep -rn 10.0.0.7 logs', (o) => o.split('\n').length === 3],
  ['grep -c fail logs/a.log', (o) => o === '1'],
  ['cat logs/*.log | grep 10.0.0.7 | wc -l', (o) => o === '3'],
  ['cut -d " " -f 2 logs/a.log | sort | uniq -c', (o) => o.includes('2 10.0.0.7')],
  ['find . -name "*.log"', (o) => o === './logs/a.log\n./logs/b.log'],
  ['find . -type f -mtime -2', (o) => o.includes('a.log') && !o.includes('b.log')],
  ['find . -perm 777', (o) => o === './logs/b.log'],
  ['cd logs', (o) => o === ''],
  ['pwd', (o) => o === '/home/analyst/logs'],
  ['head -n 1 a.log', (o) => o === 'ok 10.0.0.7'],
  ['echo "a|b" | cut -d "|" -f 2', (o) => o === 'b'],
  ['date -d @1773373510', (o) => o === 'Fri, 13 Mar 2026 03:45:10 UTC'],
  ['date -u --date=@0', (o) => o === 'Thu, 01 Jan 1970 00:00:00 UTC'],
  ['crontab -l', (o) => o === '0 9 * * 1 /home/analyst/report.sh'],
];

let failed = 0;
for (const [line, check] of cases) {
  const result = shell.run(line);
  const out = result.out.replace(/\x1b\[[0-9;]*m/g, '');
  const ok = check(out) && !result.err;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} $ ${line}${ok ? '' : `\n     out: ${JSON.stringify(out)}\n     err: ${result.err}`}`);
}
const redirect = shell.run('echo x > f');
console.log(redirect.err?.includes('Read-only') ? 'ok   redirect blocked' : 'FAIL redirect');
console.log(failed ? `SHELL SELFTEST: ${failed} FAILED` : 'SHELL SELFTEST: PASS');
process.exit(failed ? 1 : 0);
