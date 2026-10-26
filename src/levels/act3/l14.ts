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
    ar: 'هاد سجل المصادقة لبوابة الـ VPN بليلة الهجوم. الناس بيغلطوا بكلمات المرور دايماً؛ المهم هو النمط: نفس المصدر بيفشل مرة ورا مرة بوقت قصير. عدّ المحاولات الفاشلة لكل IP وشوف إذا أي وحدة منها صارت نجاح.',
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
      prompt: { en: 'Which IP address has by far the most failed logins?', ar: 'أي عنوان IP عنده أكثر محاولات دخول فاشلة بفرق كبير؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT3.bruteIp] },
      wrong: { en: 'Staff use internal 10.20.x.x addresses. Filter them out with grep -v and see who is left.', ar: 'الموظفين بيستخدموا عناوين داخلية 10.20.x.x. شيلهم بـ grep -v وشوف مين ضل.' },
    },
    {
      id: 'count',
      prompt: { en: 'How many failed attempts came from it?', ar: 'كم محاولة فاشلة إجت منه؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: [String(FAILS)] },
      derived: 'grep 192.0.2.44 auth.log | wc -l',
      wrong: { en: '`grep IP auth.log | wc -l` counts its lines.', ar: '`grep IP auth.log | wc -l` بيعدّ أسطره.' },
    },
    {
      id: 'result',
      prompt: { en: 'Did that source ever log in successfully?', ar: 'هل هالمصدر نجح يدخل ولو مرة؟' },
      validator: {
        kind: 'choice',
        correct: 'no',
        options: [
          { id: 'yes', label: { en: 'Yes, as admin', ar: 'آه، باسم admin' } },
          { id: 'no', label: { en: 'No: every line from it is a failure, and "admin" is not even a valid user', ar: 'لا: كل أسطره فشل، و "admin" أصلاً مش مستخدم موجود' } },
          { id: 'unknown', label: { en: 'Impossible to tell from auth.log', ar: 'مستحيل نعرف من auth.log' } },
        ],
      },
      wrong: { en: 'Search the same IP for "Accepted".', ar: 'دوّر على "Accepted" لنفس الـ IP.' },
      grants: [
        {
          id: 'ev.l14.noise',
          title: { en: 'Failed-login burst (noise)', ar: 'موجة دخول فاشل (تشويش)' },
          type: 'ip',
          content: `${ACT3.bruteIp}: ${FAILS} failed logins as invalid user "admin" (Mar 13 01:40-02:30), no success`,
          links: ['ev.l13.audit'],
        },
      ],
    },
    {
      id: 'defend',
      prompt: { en: 'Which control handles this pattern best?', ar: 'أي إجراء بيتعامل مع هالنمط أحسن إشي؟' },
      validator: {
        kind: 'choice',
        correct: 'limit',
        options: [
          { id: 'limit', label: { en: 'Rate-limit and temporarily block repeated failures (e.g. fail2ban), plus MFA', ar: 'نحدّ عدد المحاولات ونحظر مؤقتاً اللي بيفشل كثير (زي fail2ban)، مع مصادقة ثنائية' } },
          { id: 'ignore', label: { en: 'Ignore it, failures are harmless', ar: 'نتجاهله، الفشل ما بيضر' } },
          { id: 'delete', label: { en: 'Delete auth.log to save space', ar: 'نحذف auth.log نوفّر مساحة' } },
          { id: 'rename', label: { en: 'Rename the server', ar: 'نغيّر اسم السيرفر' } },
        ],
      },
      wrong: { en: 'Think: slow it down, block the source, and make a guessed password not enough.', ar: 'فكّر: بطّئه، احظر المصدر، وخلّي كلمة المرور لحالها مش كافية.' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'Start with `grep "Failed password" auth.log | head`.', ar: 'ابدأ بـ `grep "Failed password" auth.log | head`.' }, cost: 15 },
    { tier: 'direction', text: { en: '`grep Failed auth.log | grep -v 10.20.` leaves only outside sources. Then `grep -c IP auth.log` counts one.', ar: '`grep Failed auth.log | grep -v 10.20.` بيخلّي بس المصادر الخارجية. وبعدين `grep -c IP auth.log` بيعدّ واحد منهم.' }, cost: 30 },
    { tier: 'near-solution', text: { en: `${ACT3.bruteIp} dominates. Count it with grep | wc -l and check it for "Accepted".`, ar: `${ACT3.bruteIp} هو المسيطر. عدّه بـ grep | wc -l وافحصه على "Accepted".` }, cost: 45 },
  ],
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'One failed login is a typo. Dozens from the same source in minutes is automation. Filtering out known sources (grep -v) and counting the rest (grep -c, wc -l) turns thousands of lines into a short list. Always check whether a noisy source ever succeeded: loud failures are often unrelated internet noise, while the real intrusion is a quiet success. Notice the quiet "Accepted" for nova-svc at 03:05, minutes before the 03:12 login.',
      ar: 'محاولة فاشلة وحدة غلطة إملائية. عشرات المحاولات من نفس المصدر خلال دقائق معناها أداة آلية. إنك تشيل المصادر المعروفة (grep -v) وتعدّ الباقي (grep -c، wc -l) بيحوّل آلاف الأسطر لقائمة قصيرة. وافحص دايماً إذا المصدر المزعج نجح ولو مرة: الفشل العالي كثير بيكون تشويش من الإنترنت، والاختراق الحقيقي بيكون نجاح هادي. ولاحظ سطر "Accepted" الهادي لـ nova-svc الساعة 03:05، قبل دخول 03:12 بدقائق.',
    },
    realTools: ['grep / sort / uniq', 'fail2ban', 'Elastic / Splunk dashboards', 'CrowdSec'],
    takeaway: {
      en: 'Rank failures by source, confirm none succeeded, then rate-limit and require MFA.',
      ar: 'رتّب الفشل حسب المصدر، تأكد إنه ما في نجاح، وبعدين حدّ المحاولات واطلب مصادقة ثنائية.',
    },
    source: 'MITRE ATT&CK T1110 (Brute Force), mitigation M1036 and M1032; OWASP Authentication Cheat Sheet',
  },
  echo: {
    intro: { en: 'Loud is not the same as dangerous. Rank the noise, then look for the quiet line.', ar: 'الصوت العالي مش دايماً خطر. رتّب التشويش، وبعدين دوّر على السطر الهادي.' },
    success: { en: 'Noise from the internet, blocked by nothing but luck. And did you see who logged in quietly at 03:05?', ar: 'تشويش من الإنترنت، والحظ لحاله اللي وقّفه. وشفت مين دخل بهدوء الساعة 03:05؟' },
  },
  solution: 'grep Failed auth.log | grep -v 10.20. -> only 192.0.2.44; grep -c -> 118. No Accepted from it. Choice: limit. Plant: nova-svc Accepted 03:05 from 198.51.100.23.',
  selfTest: [
    { run: `grep ${ACT3.bruteIp} ${LOG} | wc -l`, includes: String(FAILS) },
    { run: `grep Failed ${LOG} | grep -v 10.20.`, includes: ACT3.bruteIp },
    { run: `grep Accepted ${LOG} | grep nova-svc`, includes: ACT3.vendorIp },
  ],
};

export default level;
