import type { LevelConfig } from '../../engine/schema';
import { type SshEvent, spread, sshdLog } from '../lib/logs';
import { ACT3 } from './story';

const LOG = '/var/log/auth.log';
const STAFF = ['s.haddad', 'm.chen', 'r.khalil', 'l.ito', 'a.nasser'];
const FAILS = 118;

function events(): SshEvent[] {
  const list: SshEvent[] = [];
  spread('2026-03-13T07:00:00Z', 600, 40, 7).forEach((at, i) => {
    list.push({ kind: 'accepted', user: STAFF[i % STAFF.length], ip: `10.20.4.${17 + (i % 5) * 3}`, at });
  });
  // A few honest typos: one failure, then success.
  spread('2026-03-13T08:00:00Z', 300, 4, 9).forEach((at, i) => {
    list.push({ kind: 'failed', user: STAFF[i], ip: `10.20.4.${17 + i * 3}`, at });
  });
  spread('2026-03-13T01:40:00Z', 50, FAILS, 11).forEach((at) => {
    list.push({ kind: 'failed', user: 'admin', ip: ACT3.bruteIp, at, invalidUser: true });
  });
  list.push({ kind: 'accepted', user: 'nova-svc', ip: ACT3.vendorIp, at: new Date('2026-03-13T03:05:12Z') });
  return list;
}

const level: LevelConfig = {
  id: 'L14',
  requires: { levels: ['L13'], evidence: ['ev.l13.audit'] },
  briefing: {
    en: "The VPN gateway's auth.log for the night of the attack. People mistype passwords all the time; what matters is the pattern: the same source failing again and again in a short time. Count failures per IP and see whether any of them ever turned into a success.",
    ar: 'هذا سجل المصادقة `auth.log` لبوابة VPN في ليلة الهجوم. الناس يخطئون في كتابة كلمات المرور دائماً، والمهم هو النمط: المصدر نفسه يفشل مرة بعد مرة في وقت قصير. عُدّ المحاولات الفاشلة لكل عنوان IP، وتحقق هل تحوّلت أي محاولة منها إلى دخول ناجح.',
  },
  mission: {
    goal: {
      en: 'Find the address with the most failed logins in the VPN gateway log, and check whether it ever got in.',
      ar: 'اعثر في سجل بوابة VPN على العنوان الذي له أكبر عدد من محاولات الدخول الفاشلة، وتحقق هل نجح في الدخول يوماً.',
    },
    investigate: [
      {
        en: 'The file `/var/log/auth.log`: the lines with `Failed password`.',
        ar: 'الملف `/var/log/auth.log`: الأسطر التي فيها `Failed password`.',
      },
      {
        en: 'Addresses that do not start with `10.20`. They come from outside the company.',
        ar: 'العناوين التي لا تبدأ بالأرقام `10.20`: هذه من خارج الشركة.',
      },
      {
        en: 'Lines with `Accepted`. They show whether the noisy address ever succeeded.',
        ar: 'الأسطر التي فيها `Accepted`: تبيّن هل نجح العنوان المزعج في الدخول.',
      },
    ],
    success: {
      en: 'You have named the noisy address, counted its attempts, shown that it never succeeded, and chosen the right defence.',
      ar: 'تكون قد كتبت العنوان المزعج وعدد محاولاته، وأثبتّ أنه لم ينجح أبداً، واخترت الدفاع المناسب.',
    },
  },
  apps: ['case', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT3.gateway,
    home: '/home/a.nasser',
    cwd: '/var/log',
    now: ACT3.now,
    files: { [LOG]: sshdLog(ACT3.gateway, events(), 14) },
  },
  objectives: [
    {
      id: 'top-ip',
      prompt: { en: 'In `auth.log`, which IP address has by far the most failed logins?', ar: 'في الملف `auth.log`، أي عنوان IP له أكبر عدد من محاولات الدخول الفاشلة بفارق كبير؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT3.bruteIp] },
      wrong: { en: 'Staff use internal 10.20.x.x addresses. Filter them out with grep -v and see who is left.', ar: 'الموظفون يستخدمون عناوين داخلية تبدأ بالأرقام `10.20`. استبعدها بالأمر `grep -v` وانظر ما يبقى.' },
    },
    {
      id: 'count',
      prompt: { en: 'How many failed attempts came from it?', ar: 'كم محاولة فاشلة جاءت من هذا العنوان؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: [String(FAILS)] },
      derived: 'grep 192.0.2.44 auth.log | wc -l',
      wrong: { en: '`grep IP auth.log | wc -l` counts its lines.', ar: 'الأمر `grep IP auth.log | wc -l` يعدّ أسطر هذا العنوان.' },
    },
    {
      id: 'result',
      prompt: { en: 'Did that source ever log in successfully?', ar: 'هل نجح هذا المصدر في الدخول ولو مرة واحدة؟' },
      validator: {
        kind: 'choice',
        correct: 'no',
        options: [
          { id: 'yes', label: { en: 'Yes, as admin', ar: 'نعم، باسم admin' } },
          { id: 'no', label: { en: 'No: every line from it is a failure, and "admin" is not even a valid user', ar: 'لا: كل أسطره محاولات فاشلة، والمستخدم admin غير موجود أصلاً' } },
          { id: 'unknown', label: { en: 'Impossible to tell from auth.log', ar: 'لا يمكن معرفة ذلك من `auth.log`' } },
        ],
      },
      wrong: { en: 'Search the same IP for "Accepted".', ar: 'ابحث عن كلمة `Accepted` في أسطر العنوان نفسه.' },
      grants: [
        {
          id: 'ev.l14.noise',
          title: { en: 'Failed-login burst (noise)', ar: 'موجة محاولات دخول فاشلة (ضجيج)' },
          type: 'ip',
          content: `${ACT3.bruteIp}: ${FAILS} failed logins as invalid user "admin" (Mar 13 01:40-02:30), no success`,
          links: ['ev.l13.audit'],
        },
      ],
    },
    {
      id: 'defend',
      prompt: { en: 'Which control handles this pattern best?', ar: 'أي إجراء يعالج هذا النمط على أفضل وجه؟' },
      validator: {
        kind: 'choice',
        correct: 'limit',
        options: [
          { id: 'limit', label: { en: 'Rate-limit and temporarily block repeated failures (e.g. fail2ban), plus MFA', ar: 'تحديد عدد المحاولات وحظر من يفشل كثيراً حظراً مؤقتاً (مثل fail2ban)، مع التحقق بخطوتين' } },
          { id: 'ignore', label: { en: 'Ignore it, failures are harmless', ar: 'تجاهله، فالمحاولات الفاشلة لا تضر' } },
          { id: 'delete', label: { en: 'Delete auth.log to save space', ar: 'حذف `auth.log` لتوفير المساحة' } },
          { id: 'rename', label: { en: 'Rename the server', ar: 'تغيير اسم الخادم' } },
        ],
      },
      wrong: { en: 'Think: slow it down, block the source, and make a guessed password not enough.', ar: 'فكّر: أبطئ المحاولات، واحظر المصدر، واجعل كلمة المرور وحدها غير كافية.' },
    },
  ],
  guide: {
    nudge: {
      en: 'Start with `grep "Failed password" auth.log | head`.',
      ar: 'ابدأ بالأمر `grep "Failed password" auth.log | head`.',
    },
    clue: {
      en: '`grep Failed auth.log | grep -v 10.20.` leaves only outside sources. Then `grep -c IP auth.log` counts one.',
      ar: 'الأمر `grep Failed auth.log | grep -v 10.20.` يُبقي المصادر الخارجية فقط. ثم الأمر `grep -c IP auth.log` يعدّ أسطر عنوان واحد.',
    },
    steps: {
      'top-ip': {
        en: 'Run `grep Failed auth.log | grep -v 10.20.`. The `-v` option hides the staff addresses. Every line that is left comes from `192.0.2.44`.',
        ar: 'شغّل `grep Failed auth.log | grep -v 10.20.`. الخيار `-v` يُخفي عناوين الموظفين. كل الأسطر الباقية تأتي من `192.0.2.44`.',
      },
      count: {
        en: 'Run `grep 192.0.2.44 auth.log | wc -l`. The answer is 118.',
        ar: 'شغّل `grep 192.0.2.44 auth.log | wc -l`. الجواب 118.',
      },
      result: {
        en: 'Run `grep 192.0.2.44 auth.log | grep Accepted`. Nothing appears, so it never got in. Choose the answer that starts with "No".',
        ar: 'شغّل `grep 192.0.2.44 auth.log | grep Accepted`. لا يظهر شيء، أي أنه لم يدخل أبداً. اختر الجواب الذي يبدأ بكلمة «لا».',
      },
      defend: {
        en: 'Choose "Rate-limit and temporarily block repeated failures (e.g. fail2ban), plus MFA".',
        ar: 'اختر الجواب الذي يحدد عدد المحاولات ويحظر من يفشل كثيراً، مع التحقق بخطوتين.',
      },
    },
    concept: {
      en: 'One failed login is a typing mistake. Dozens from one address in a few minutes are an automatic tool. A loud source is often only internet noise, so always check if it ever succeeded, and look for the quiet successful login too.',
      ar: 'محاولة فاشلة واحدة خطأ في الكتابة. أما عشرات المحاولات من عنوان واحد خلال دقائق فتدل على أداة آلية. المصدر المزعج يكون غالباً ضجيجاً من الإنترنت، فتحقق دائماً هل نجح يوماً، وابحث أيضاً عن الدخول الناجح الهادئ.',
    },
  },
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'One failed login is a typo. Dozens from the same source in minutes is automation. Filtering out known sources (grep -v) and counting the rest (grep -c, wc -l) turns thousands of lines into a short list. Always check whether a noisy source ever succeeded: loud failures are often unrelated internet noise, while the real intrusion is a quiet success. Notice the quiet "Accepted" for nova-svc at 03:05, minutes before the 03:12 login.',
      ar: 'محاولة فاشلة واحدة خطأ في الكتابة. أما عشرات المحاولات من المصدر نفسه خلال دقائق فتدل على أداة آلية. استبعاد المصادر المعروفة (`grep -v`) وعدّ الباقي (`grep -c` أو `wc -l`) يحوّل آلاف الأسطر إلى قائمة قصيرة. وتحقق دائماً هل نجح المصدر المزعج ولو مرة: الفشل الكثير يكون غالباً ضجيجاً من الإنترنت، والاختراق الحقيقي يكون دخولاً ناجحاً هادئاً. ولاحظ سطر `Accepted` الهادئ للحساب `nova-svc` الساعة 03:05، قبل دخول الساعة 03:12 بدقائق.',
    },
    realTools: ['grep / sort / uniq', 'fail2ban', 'Elastic / Splunk dashboards', 'CrowdSec'],
    takeaway: {
      en: 'Rank failures by source, confirm none succeeded, then rate-limit and require MFA.',
      ar: 'رتّب المحاولات الفاشلة حسب المصدر، وتأكد أن لا شيء منها نجح، ثم حدّد عدد المحاولات واشترط التحقق بخطوتين.',
    },
    source: 'MITRE ATT&CK T1110 (Brute Force), mitigation M1036 and M1032; OWASP Authentication Cheat Sheet',
  },
  echo: {
    intro: { en: 'Loud is not the same as dangerous. Rank the noise, then look for the quiet line.', ar: 'الصوت العالي لا يعني الخطر دائماً. رتّب الضجيج أولاً، ثم ابحث عن السطر الهادئ.' },
    success: { en: 'Noise from the internet, blocked by nothing but luck. And did you see who logged in quietly at 03:05?', ar: 'ضجيج من الإنترنت لم يوقفه إلا الحظ. وهل رأيت من دخل بهدوء الساعة 03:05؟' },
  },
  solution: 'grep Failed auth.log | grep -v 10.20. -> only 192.0.2.44; grep -c -> 118. No Accepted from it. Choice: limit. Plant: nova-svc Accepted 03:05 from 198.51.100.23.',
  selfTest: [
    { run: `grep ${ACT3.bruteIp} ${LOG} | wc -l`, includes: String(FAILS) },
    { run: `grep Failed ${LOG} | grep -v 10.20.`, includes: ACT3.bruteIp },
    { run: `grep Accepted ${LOG} | grep nova-svc`, includes: ACT3.vendorIp },
  ],
};

export default level;
