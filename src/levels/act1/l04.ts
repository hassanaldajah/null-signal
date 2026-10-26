import type { LevelConfig } from '../../engine/schema';
import { appLog, type SshEvent, spread, sshdLog } from '../lib/logs';
import { ACT1 } from './story';

const H = ACT1.home;
const INTERNAL = ['10.20.1.14', '10.20.1.22', '10.20.1.31', '10.20.1.40'];
const STAFF = ['m.chen', 'j.ortiz', 's.haddad', 'a.karim'];
const SPRAY_TARGETS: [string, boolean][] = [['j.ortiz', false], ['m.chen', false], ['a.karim', false], ['admin', true], ['root', false]];
export const FAILED_FROM_ATTACKER = 23;

function authEvents(): SshEvent[] {
  const events: SshEvent[] = [];
  // Normal working-hours logins from the office network.
  spread('2026-03-12T07:30:00Z', 600, 28, 11).forEach((at, i) => {
    events.push({ kind: 'accepted', user: STAFF[i % STAFF.length], ip: INTERNAL[i % INTERNAL.length], at });
  });
  // A known internet scanner (noise): invalid users, never succeeds.
  spread('2026-03-12T18:00:00Z', 900, 14, 12).forEach((at, i) => {
    events.push({ kind: 'failed', user: ['root', 'admin', 'test', 'oracle', 'ubuntu'][i % 5], ip: ACT1.scannerIp, at, invalidUser: i % 5 !== 0 });
  });
  // The attacker: password spraying across accounts, then two successful logins.
  spread('2026-03-13T02:41:00Z', 29, FAILED_FROM_ATTACKER, 13).forEach((at, i) => {
    const [user, invalid] = SPRAY_TARGETS[i % SPRAY_TARGETS.length];
    events.push({ kind: 'failed', user, ip: ACT1.attackerIp, at, invalidUser: invalid });
  });
  events.push({ kind: 'accepted', user: ACT1.user, ip: ACT1.attackerIp, at: new Date('2026-03-13T03:12:05Z') });
  events.push({ kind: 'accepted', user: ACT1.secondAccount, ip: ACT1.attackerIp, at: new Date('2026-03-13T03:31:40Z') });
  return events;
}

const level: LevelConfig = {
  id: 'L04',
  requires: { levels: ['L03'], evidence: ['ev.l02.ip'] },
  briefing: {
    en: 'You know the attacker IP. Now find every trace of it in the server logs. Thousands of lines, one pattern: grep is how analysts search text at scale. Be precise: a sloppy pattern gives a wrong answer that looks right.',
    ar: 'صرت تعرف الـ IP تبع المهاجم. هلأ لاقي كل أثر إله بسجلات السيرفر. آلاف الأسطر ونمط واحد: grep هو أداة المحلل للبحث بالنصوص على نطاق واسع. خليك دقيق: النمط المهمل بيعطي جواب غلط شكله صح.',
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'terminal'],
  world: {
    user: ACT1.user,
    host: ACT1.gateway,
    home: H,
    cwd: '/var/log',
    now: ACT1.now,
    files: {
      '/var/log/auth.log': sshdLog(ACT1.gateway, authEvents(), 4),
      '/var/log/helix/app.log': appLog('portal', '2026-03-13T00:00:00Z', 140, 21, [
        'GET /dashboard 200', 'GET /api/health 200', 'POST /api/report 201', 'cache refreshed', 'GET /login 200', 'slow query 812ms',
      ]),
      '/var/log/helix/vpn.log': [
        '2026-03-12T08:02:11Z session start user=m.chen src=10.20.1.14',
        `2026-03-12T09:40:52Z session start user=vendor-backup src=${ACT1.vendorIp}`,
        `2026-03-13T03:12:07Z session start user=${ACT1.user} src=${ACT1.attackerIp}`,
        `2026-03-13T03:31:44Z session start user=${ACT1.secondAccount} src=${ACT1.attackerIp}`,
        '2026-03-13T08:15:30Z session start user=a.karim src=10.20.1.40',
        '',
      ].join('\n'),
      '/var/log/syslog': appLog('kernel', '2026-03-13T00:00:00Z', 80, 22, [
        'eth0: link up', 'CRON[2231]: (root) CMD (/opt/helix/bin/backup.sh)', 'systemd[1]: Started Daily apt upgrade.', 'ntpd: time synced',
      ]),
    },
  },
  objectives: [
    {
      id: 'search',
      prompt: {
        en: 'Search ALL logs under /var/log, recursively, for the attacker IP.',
        ar: 'ابحث بكل السجلات تحت /var/log (بشكل متكرر) عن IP المهاجم.',
      },
      validator: { kind: 'command', pattern: '^grep\\b.*203[.\\\\\\[\\]]*0[.\\\\\\[\\]]*113[.\\\\\\[\\]]*77' },
    },
    {
      id: 'file',
      prompt: { en: 'Which log file records the attacker’s SSH login attempts?', ar: 'أي ملف سجل بيسجّل محاولات دخول المهاجم بـ SSH؟' },
      placeholder: '/var/log/…',
      validator: { kind: 'answer', accept: ['/var/log/auth.log', 'auth.log'] },
    },
    {
      id: 'failures',
      prompt: {
        en: 'How many FAILED logins came from exactly the attacker’s IP?',
        ar: 'كم محاولة دخول فاشلة إجت من IP المهاجم بالضبط؟',
      },
      placeholder: 'number',
      validator: { kind: 'answer', accept: [String(FAILED_FROM_ATTACKER)] },
      derived: 'grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77',
      wrong: {
        en: 'Check your pattern: in grep, "." matches ANY character, and 203.0.113.7 (a scanner) is a prefix of the attacker IP. Match the whole address only (try -w).',
        ar: 'افحص النمط: بـ grep النقطة "." بتطابق أي حرف، و 203.0.113.7 (ماسح من الإنترنت) جزء من بداية IP المهاجم. طابق العنوان كامل بس (جرّب -w).',
      },
      grants: [
        {
          id: 'ev.l04.spray',
          title: { en: 'Password spraying', ar: 'رشّ كلمات المرور' },
          type: 'note',
          content: `${FAILED_FROM_ATTACKER} failed SSH logins over 5 accounts in ~30 min from ${ACT1.attackerIp}`,
          links: ['ev.l02.ip'],
        },
      ],
    },
    {
      id: 'account',
      prompt: {
        en: 'Besides Samir, which account did the attacker log into SUCCESSFULLY?',
        ar: 'غير حساب سمير، أي حساب نجح المهاجم يدخل عليه؟',
      },
      validator: { kind: 'answer', accept: [ACT1.secondAccount] },
      wrong: { en: 'Successful SSH logins say "Accepted password".', ar: 'الدخول الناجح بـ SSH مكتوب فيه "Accepted password".' },
      grants: [
        {
          id: 'ev.l04.account',
          title: { en: 'Second compromised account', ar: 'الحساب الثاني المخترق' },
          type: 'person',
          content: ACT1.secondAccount,
          links: ['ev.l02.ip', 'ev.l04.spray'],
        },
      ],
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: '`grep -r PATTERN DIR` searches every file under DIR. `man grep` lists the useful flags.', ar: '`grep -r PATTERN DIR` بيدوّر بكل الملفات تحت المجلد. `man grep` فيه الخيارات المفيدة.' },
      cost: 10,
    },
    {
      tier: 'direction',
      text: {
        en: 'Chain tools with "|": `grep "Failed password" auth.log | grep -w 203.0.113.77 | wc -l`. The -w flag stops 203.0.113.7 from matching too.',
        ar: 'اربط الأدوات بـ "|": `grep "Failed password" auth.log | grep -w 203.0.113.77 | wc -l`. خيار -w بيمنع 203.0.113.7 إنه يتطابق كمان.',
      },
      cost: 20,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Run `grep Accepted /var/log/auth.log | grep -w 203.0.113.77` — two lines: one is Samir, the other is your answer.',
        ar: 'شغّل `grep Accepted /var/log/auth.log | grep -w 203.0.113.77`؛ سطرين: واحد لسمير، والثاني هو جوابك.',
      },
      cost: 35,
    },
  ],
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'grep searches text with regular expressions. In a regex "." means "any character", so 203.0.113.7 also matches 203.0.113.77 and 203x0x113x7. Use -w (whole word), -F (fixed string) or escape dots (203\\.0\\.113\\.77). Many failures across many accounts from one source, then a success, is the signature of password spraying.',
      ar: 'grep بيدوّر بالنصوص باستخدام التعابير النمطية. بالـ regex النقطة "." معناها "أي حرف"، فـ 203.0.113.7 بيطابق كمان 203.0.113.77. استخدم -w (كلمة كاملة) أو -F (نص ثابت) أو هرّب النقاط (203\\.0\\.113\\.77). فشل كثير على حسابات كثيرة من مصدر واحد وبعده نجاح، هاد توقيع رشّ كلمات المرور.',
    },
    realTools: ['grep', 'ripgrep (rg)', 'awk', 'Splunk', 'Elastic / Kibana'],
    takeaway: {
      en: 'Always ask “is my pattern matching only what I think it matches?” — then verify by eyeballing a few results.',
      ar: 'اسأل حالك دايماً: "هل النمط تبعي بيطابق بس اللي بفكّر فيه؟" وبعدين تأكّد بعينك من كم نتيجة.',
    },
    source: 'MITRE ATT&CK T1110.003 (Password Spraying); GNU grep manual',
  },
  echo: {
    intro: {
      en: 'Logs never forget. But they are noisy: another IP that looks almost identical is in there too. Precision matters.',
      ar: 'السجلات ما بتنسى، بس فيها ضجيج كثير: في IP ثاني شبه مطابق موجود كمان. الدقة مهمة.',
    },
    success: {
      en: 'Spraying, then two accounts. This was not luck. Someone planned it.',
      ar: 'رشّ، وبعدين حسابين. هاد مش حظ. في حدا مخطّط إله.',
    },
  },
  ghost: {
    taunt: { en: 'Counting my footsteps? Cute. You are still three moves behind.', ar: 'عم تعدّ خطواتي؟ لطيف. لسا إنت متأخر بثلاث خطوات.' },
  },
  solution: 'grep -r 203.0.113.77 /var/log ; grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77 -> 23 ; grep Accepted /var/log/auth.log | grep -w 203.0.113.77 -> s.haddad, j.ortiz',
  selfTest: [
    { run: 'grep -r 203.0.113.77 /var/log', includes: 'auth.log' },
    { run: `grep "Failed password" /var/log/auth.log | grep -wc ${ACT1.attackerIp}`, includes: String(FAILED_FROM_ATTACKER) },
    { run: `grep Accepted /var/log/auth.log | grep -w ${ACT1.attackerIp}`, includes: `for ${ACT1.secondAccount} from` },
  ],
};

export default level;
