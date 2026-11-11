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
    ar: 'أصبحت تعرف عنوان IP الخاص بالمهاجم. اعثر الآن على كل أثر له في سجلات الخادم. آلاف الأسطر ونمط واحد: الأمر `grep` هو أداة المحلل للبحث في النصوص الكبيرة. كن دقيقاً: النمط غير الدقيق يعطي جواباً خاطئاً يبدو صحيحاً.',
  },
  mission: {
    goal: {
      en: "Search the server logs for the attacker's IP and measure what it did: how many logins failed and which accounts it got into.",
      ar: 'ابحث في سجلات الخادم عن عنوان IP الخاص بالمهاجم، واعرف ما فعله: كم محاولة دخول فشلت، وأي الحسابات دخلها.',
    },
    investigate: [
      {
        en: 'All logs under `/var/log`, searched with `grep`.',
        ar: 'كل السجلات داخل `/var/log`، بالبحث فيها بالأمر `grep`.',
      },
      {
        en: 'The file `auth.log`: lines with `Failed password` are failed logins, lines with `Accepted password` are successful ones.',
        ar: 'الملف `auth.log`: الأسطر التي فيها `Failed password` محاولات فاشلة، والتي فيها `Accepted password` دخول ناجح.',
      },
      {
        en: 'A second address, `203.0.113.7`, looks almost the same. It is a harmless scanner and must not be counted.',
        ar: 'عنوان آخر هو `203.0.113.7` يشبه عنوان المهاجم كثيراً. إنه ماسح غير مؤذٍ من الإنترنت، ولا يجوز أن يدخل في العدّ.',
      },
    ],
    success: {
      en: 'You have the right log file, the exact number of failed logins from the attacker, and the second account he entered.',
      ar: 'تكون قد حدّدت ملف السجل الصحيح، والعدد الدقيق لمحاولات المهاجم الفاشلة، والحساب الثاني الذي دخله.',
    },
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
        en: "In the terminal, search ALL logs under `/var/log` (and its subfolders) for the attacker's IP.",
        ar: 'في الطرفية، ابحث عن عنوان IP الخاص بالمهاجم في كل السجلات داخل `/var/log` ومجلداته الفرعية.',
      },
      validator: { kind: 'command', pattern: '^grep\\b.*203[.\\\\\\[\\]]*0[.\\\\\\[\\]]*113[.\\\\\\[\\]]*77' },
    },
    {
      id: 'file',
      prompt: { en: 'Which log file records the attacker’s SSH login attempts?', ar: 'أي ملف سجل يسجّل محاولات دخول المهاجم عبر SSH؟' },
      placeholder: '/var/log/…',
      validator: { kind: 'answer', accept: ['/var/log/auth.log', 'auth.log'] },
    },
    {
      id: 'failures',
      prompt: {
        en: 'How many FAILED logins came from exactly the attacker’s IP?',
        ar: 'كم محاولة دخول فاشلة جاءت من عنوان المهاجم بالتحديد؟',
      },
      placeholder: 'number',
      validator: { kind: 'answer', accept: [String(FAILED_FROM_ATTACKER)] },
      derived: 'grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77',
      wrong: {
        en: 'Check your pattern: in grep, "." matches ANY character, and 203.0.113.7 (a scanner) is a prefix of the attacker IP. Match the whole address only (try -w).',
        ar: 'راجع النمط: في `grep` النقطة تطابق أي حرف، والعنوان `203.0.113.7` (ماسح من الإنترنت) يطابق بداية عنوان المهاجم. طابق العنوان كاملاً فقط (جرّب الخيار `-w`).',
      },
      grants: [
        {
          id: 'ev.l04.spray',
          title: { en: 'Password spraying', ar: 'تجربة كلمات مرور على حسابات كثيرة' },
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
        ar: 'غير حساب سمير، ما الحساب الآخر الذي نجح المهاجم في الدخول إليه؟',
      },
      validator: { kind: 'answer', accept: [ACT1.secondAccount] },
      wrong: { en: 'Successful SSH logins say "Accepted password".', ar: 'الدخول الناجح عبر SSH يظهر في السجل بعبارة `Accepted password`.' },
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
  guide: {
    nudge: {
      en: '`grep -r PATTERN DIR` searches every file under DIR. `man grep` lists the useful flags.',
      ar: 'الأمر `grep -r PATTERN DIR` يبحث في كل الملفات داخل المجلد. والأمر `man grep` يشرح الخيارات المفيدة.',
    },
    clue: {
      en: 'Chain tools with `|`: `grep "Failed password" auth.log | grep -w 203.0.113.77 | wc -l`. The `-w` flag stops `203.0.113.7` from matching too.',
      ar: 'اربط الأدوات بالرمز `|` هكذا: `grep "Failed password" auth.log | grep -w 203.0.113.77 | wc -l`. الخيار `-w` يمنع مطابقة العنوان `203.0.113.7` أيضاً.',
    },
    steps: {
      search: {
        en: 'Type `grep -r 203.0.113.77 /var/log`. The `-r` option searches every file under that folder.',
        ar: 'اكتب `grep -r 203.0.113.77 /var/log`. الخيار `-r` يبحث في كل الملفات داخل المجلد.',
      },
      file: {
        en: 'Each result starts with the name of its file. The SSH lines (`Failed password` and `Accepted password`) are in `/var/log/auth.log`.',
        ar: 'كل نتيجة تبدأ باسم الملف الذي جاءت منه. أسطر SSH (`Failed password` و`Accepted password`) موجودة في `/var/log/auth.log`.',
      },
      failures: {
        en: 'Count only the exact address: `grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77`. Without `-w` the scanner `203.0.113.7` is counted too. The answer is 23.',
        ar: 'عُدَّ العنوان المطابق تماماً فقط: `grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77`. دون الخيار `-w` يدخل الماسح `203.0.113.7` في العدّ أيضاً. الجواب 23.',
      },
      account: {
        en: 'Run `grep Accepted /var/log/auth.log | grep -w 203.0.113.77`. Two lines appear. One is `s.haddad`. The other one is the answer: `j.ortiz`.',
        ar: 'شغّل `grep Accepted /var/log/auth.log | grep -w 203.0.113.77`. يظهر سطران: أحدهما للحساب `s.haddad`، والآخر هو الجواب: `j.ortiz`.',
      },
    },
    concept: {
      en: '`grep` shows every line that matches a pattern, so one loose character gives a wrong count that still looks right. Many failed logins on many accounts from one address, then a success, is called password spraying. Always check a few results with your own eyes.',
      ar: 'الأمر `grep` يعرض كل سطر يطابق النمط، ولذلك حرف واحد غير دقيق يعطي عدداً خاطئاً يبدو صحيحاً. محاولات فاشلة كثيرة على حسابات كثيرة من عنوان واحد، يتبعها دخول ناجح: هذا هجوم تجربة كلمات المرور. وتحقق دائماً بعينك من بعض النتائج.',
    },
  },
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'grep searches text with regular expressions. In a regex "." means "any character", so 203.0.113.7 also matches 203.0.113.77 and 203x0x113x7. Use -w (whole word), -F (fixed string) or escape dots (203\\.0\\.113\\.77). Many failures across many accounts from one source, then a success, is the signature of password spraying.',
      ar: 'الأمر `grep` يبحث في النصوص باستخدام التعابير النمطية (regex). في هذه التعابير النقطة تعني «أي حرف»، فالنمط `203.0.113.7` يطابق أيضاً `203.0.113.77`. استخدم `-w` (كلمة كاملة) أو `-F` (نص ثابت)، أو ضع `\\` قبل كل نقطة. محاولات فاشلة كثيرة على حسابات كثيرة من مصدر واحد، ثم دخول ناجح: هذه علامة هجوم تجربة كلمات المرور (password spraying).',
    },
    realTools: ['grep', 'ripgrep (rg)', 'awk', 'Splunk', 'Elastic / Kibana'],
    takeaway: {
      en: 'Always ask “is my pattern matching only what I think it matches?” — then verify by eyeballing a few results.',
      ar: 'اسأل نفسك دائماً: هل يطابق النمط ما أقصده فقط؟ ثم تحقق بعينك من بعض النتائج.',
    },
    source: 'MITRE ATT&CK T1110.003 (Password Spraying); GNU grep manual',
  },
  echo: {
    intro: {
      en: 'Logs never forget. But they are noisy: another IP that looks almost identical is in there too. Precision matters.',
      ar: 'السجلات لا تنسى، لكنها مليئة بالضجيج: فيها عنوان آخر شبه مطابق لعنوان المهاجم. الدقة مهمة.',
    },
    success: {
      en: 'Spraying, then two accounts. This was not luck. Someone planned it.',
      ar: 'تجربة كلمات مرور، ثم حسابان. هذا ليس حظاً. هناك من خطّط له.',
    },
  },
  ghost: {
    taunt: { en: 'Counting my footsteps? Cute. You are still three moves behind.', ar: 'تعدّ خطواتي؟ لطيف. ما زلت متأخراً عني بثلاث خطوات.' },
  },
  solution: 'grep -r 203.0.113.77 /var/log ; grep "Failed password" /var/log/auth.log | grep -wc 203.0.113.77 -> 23 ; grep Accepted /var/log/auth.log | grep -w 203.0.113.77 -> s.haddad, j.ortiz',
  selfTest: [
    { run: 'grep -r 203.0.113.77 /var/log', includes: 'auth.log' },
    { run: `grep "Failed password" /var/log/auth.log | grep -wc ${ACT1.attackerIp}`, includes: String(FAILED_FROM_ATTACKER) },
    { run: `grep Accepted /var/log/auth.log | grep -w ${ACT1.attackerIp}`, includes: `for ${ACT1.secondAccount} from` },
  ],
};

export default level;
