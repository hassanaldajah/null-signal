import type { LevelConfig } from '../../engine/schema';
import { seeded, syslogTime } from '../lib/logs';
import { ACT4 } from './story';

const LOG = '/var/log/nginx/access.log';
const STAFF_IPS = ['10.20.4.17', '10.20.4.20', '10.20.4.23', '10.20.4.26', '10.20.4.29', '10.20.4.32', '10.20.4.35'];
const BROWSER = '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/123.0"';
const AGENT = '"NovaBackup-Agent/4.2"';
const TOOL = 'curl/8.5.0';
const LEAK_BYTES = 48211903;
const START = Date.parse('2026-03-12T07:00:00Z');
const END = Date.parse('2026-03-14T15:00:00Z');

/** nginx "combined" timestamp: [13/Mar/2026:04:03:30 +0000]. */
function clf(ms: number): string {
  const [month, day, time] = syslogTime(new Date(ms)).split(/\s+/);
  return `[${day.padStart(2, '0')}/${month}/2026:${time} +0000]`;
}

function accessLog(): string {
  const rand = seeded(1717);
  const pages: [path: string, status: number, min: number, spread: number][] = [
    ['/', 200, 6000, 3000],
    ['/wiki/it/vpn-guide', 200, 14000, 6000],
    ['/wiki/hr/holidays-2026', 200, 9000, 4000],
    ['/news/q1-townhall', 200, 11000, 5000],
    ['/static/app.js', 200, 182000, 0],
    ['/static/style.css', 200, 24310, 0],
    ['/docs/handbook.pdf', 200, 2104331, 0],
    ['/docs/expense-form.xlsx', 200, 61440, 0],
    ['/api/status', 200, 90, 40],
    ['/favicon.ico', 404, 153, 0],
  ];
  const lines: [number, string][] = [];
  for (let i = 0; i < 380; i++) {
    const at = START + Math.floor(rand() * (END - START));
    const ip = STAFF_IPS[Math.floor(rand() * STAFF_IPS.length)];
    const [path, status, min, spread] = pages[Math.floor(rand() * pages.length)];
    const bytes = min + Math.floor(rand() * spread);
    lines.push([at, `${ip} - - ${clf(at)} "GET ${path} HTTP/1.1" ${status} ${bytes} "-" ${BROWSER}`]);
  }
  // The approved nightly backup pull: big, but same time, same agent, same file pattern every night.
  ['2026-03-12', '2026-03-13', '2026-03-14'].forEach((day, i) => {
    const at = Date.parse(`${day}T02:00:0${i + 3}Z`);
    lines.push([at, `${ACT4.vendorIp} - - ${clf(at)} "GET /backup/nightly-${day}.tgz HTTP/1.1" 200 ${181403220 + i * 412337} "-" ${AGENT}`]);
  });
  const odd = (iso: string, path: string, status: number, bytes: number) => {
    const at = Date.parse(iso);
    lines.push([at, `${ACT4.attackerIp} - - ${clf(at)} "GET ${path} HTTP/1.1" ${status} ${bytes} "-" "${TOOL}"`]);
  };
  odd('2026-03-13T04:02:51Z', '/backup/', 403, 162);
  odd('2026-03-13T04:03:30Z', ACT4.leakedPath, 200, LEAK_BYTES);
  return `${lines.sort((a, b) => a[0] - b[0]).map(([, line]) => line).join('\n')}\n`;
}

const level: LevelConfig = {
  id: 'L17',
  requires: { levels: ['L16'], evidence: ['ev.l02.ip', 'ev.l16.archive'] },
  briefing: {
    en: `The intranet web server ${ACT4.webHost} keeps one line for every file it hands out: who asked (IP), when, which file, the status code, how many bytes were sent and which program asked (user agent). Hundreds of normal rows; one of them is a file leaving the company. Find the row that does not fit the pattern.`,
    ar: 'خادم الشبكة الداخلية `helix-web01` يسجّل سطراً لكل ملف يرسله: من طلبه (عنوان IP)، ومتى، وأي ملف، ورمز الحالة، وعدد البايتات المرسلة، والبرنامج الذي طلبه (`user agent`). مئات الأسطر العادية، وسطر واحد منها ملف يخرج من الشركة. اعثر على السطر الذي لا يوافق النمط.',
  },
  mission: {
    goal: {
      en: 'Find the one download in the web server log that does not fit the normal pattern.',
      ar: 'اعثر في سجل خادم الويب على عملية التنزيل الوحيدة التي لا توافق النمط المعتاد.',
    },
    investigate: [
      {
        en: 'The note "Ops: what normal looks like" in the Notes app. It describes normal traffic.',
        ar: 'ملاحظة فريق التشغيل في تطبيق الملاحظات: تصف حركة الطلبات الطبيعية.',
      },
      {
        en: 'The file `/var/log/nginx/access.log`: each line has the IP, the time, the file, the status, the size in bytes and the program that asked.',
        ar: 'الملف `/var/log/nginx/access.log`: في كل سطر عنوان IP، والوقت، والملف، ورمز الحالة، والحجم بالبايت، والبرنامج الذي أرسل الطلب.',
      },
      {
        en: 'The biggest downloads, and anything under `/backup/` that is not the nightly NovaBackup pull at 02:00.',
        ar: 'أكبر التنزيلات، وكل ما يقع داخل `/backup/` وليس من عملية النسخ الليلية لشركة NovaBackup الساعة 02:00.',
      },
    ],
    success: {
      en: 'You have named the leaked file, the IP that took it and the program it used, and chosen the right fix.',
      ar: 'تكون قد كتبت اسم الملف المسرَّب، والعنوان الذي أخذه، والبرنامج الذي استخدمه، واخترت الإصلاح الصحيح.',
    },
  },
  apps: ['case', 'logs', 'terminal', 'notes', 'evidence'],
  autoOpen: ['case', 'evidence', 'logs'],
  world: {
    user: 'a.nasser',
    host: ACT4.webHost,
    home: '/home/a.nasser',
    cwd: '/var/log/nginx',
    now: ACT4.now,
    logs: [LOG],
    files: { [LOG]: accessLog() },
    notes: [
      {
        id: 'baseline',
        title: 'Ops: what normal looks like',
        body: `Line format: IP - - [time] "METHOD /path HTTP/1.1" status bytes "referrer" "user agent"\n\nNormal traffic:\n- staff 10.20.4.x, Firefox, wiki pages and small docs\n- NovaBackup agent (${ACT4.vendorIp}, "NovaBackup-Agent/4.2") pulls /backup/nightly-*.tgz at 02:00 every night (contract V-2207)\n\nAnything else in /backup/ = page the on-call.`,
        color: 'cyan',
      },
    ],
  },
  objectives: [
    {
      id: 'file',
      prompt: { en: 'In `access.log`, which file was downloaded outside the normal pattern?', ar: 'في السجل `access.log`، أي ملف نُزّل خارج النمط المعتاد؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.leakedPath, 'helix-intranet.sql.gz'] },
      wrong: {
        en: 'Big downloads stand out: sort by the bytes column. Then compare each big row with the ops note.',
        ar: 'التنزيلات الكبيرة تظهر بوضوح: رتّب حسب عمود البايتات. ثم قارن كل سطر كبير بملاحظة فريق التشغيل.',
      },
    },
    {
      id: 'ip',
      prompt: { en: 'Which IP downloaded it?', ar: 'أي عنوان IP نزّله؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT4.attackerIp] },
      wrong: { en: 'The IP is the first field of the same line.', ar: 'عنوان IP هو أول حقل في السطر نفسه.' },
    },
    {
      id: 'agent',
      prompt: { en: 'Which program made the request? (the `user agent`)', ar: 'أي برنامج أرسل الطلب؟ (قيمة `user agent`)' },
      placeholder: 'name/version',
      validator: { kind: 'answer', accept: [TOOL, 'curl'] },
      wrong: { en: 'The user agent is the last quoted part of the line.', ar: 'قيمة `user agent` هي آخر جزء بين علامتي تنصيص في السطر.' },
      grants: [
        {
          id: 'ev.l17.leak',
          title: { en: 'Intranet backup downloaded from outside', ar: 'نسخة الشبكة الداخلية الاحتياطية نُزّلت من الخارج' },
          type: 'file',
          content: `${ACT4.leakedPath} (${LEAK_BYTES} bytes) -> ${ACT4.attackerIp} via ${TOOL}, Mar 13 04:03`,
          links: ['ev.l02.ip', 'ev.l16.archive'],
        },
      ],
    },
    {
      id: 'fix',
      prompt: { en: 'What is the right fix?', ar: 'ما الإصلاح الصحيح؟' },
      validator: {
        kind: 'choice',
        correct: 'move',
        options: [
          { id: 'move', label: { en: 'Keep backups out of any folder the web server serves, and alert on big downloads that break the baseline', ar: 'إبعاد النسخ الاحتياطية عن أي مجلد يعرضه خادم الويب، والتنبيه عند أي تنزيل كبير يخالف النمط المعتاد' } },
          { id: 'rename', label: { en: 'Rename the file to something harder to guess', ar: 'تغيير اسم الملف إلى اسم يصعب تخمينه' } },
          { id: 'curl', label: { en: 'Block the curl user agent', ar: 'حظر البرنامج curl' } },
        ],
      },
      wrong: {
        en: 'A hidden name and a blocked user agent are both one line away from being bypassed. Where should the file live?',
        ar: 'الاسم المخفي وحظر اسم البرنامج يمكن تجاوزهما بسطر واحد. أين يجب أن يوجد الملف أصلاً؟',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Read the ops note first: it tells you what normal looks like.',
      ar: 'اقرأ ملاحظة فريق التشغيل أولاً: إنها تصف الوضع الطبيعي.',
    },
    clue: {
      en: 'In the terminal, `sort -n -k 10 access.log` puts the biggest downloads at the bottom. Which big one is not the nightly agent?',
      ar: 'في الطرفية: الأمر `sort -n -k 10 access.log` يضع أكبر التنزيلات في الأسفل. أي تنزيل كبير منها ليس من برنامج النسخ الليلي؟',
    },
    steps: {
      file: {
        en: 'In the terminal, run `sort -n -k 10 access.log`. The biggest rows are at the bottom: three nightly pulls by `NovaBackup-Agent` at 02:00, and one other file, `/backup/helix-intranet.sql.gz`.',
        ar: 'في الطرفية شغّل `sort -n -k 10 access.log`. أكبر الأسطر في الأسفل: ثلاث عمليات نسخ ليلية نفّذها `NovaBackup-Agent` الساعة 02:00، وملف آخر واحد هو `/backup/helix-intranet.sql.gz`.',
      },
      ip: {
        en: 'The first field of that line is the client: `203.0.113.77`.',
        ar: 'أول حقل في ذلك السطر هو عنوان العميل: `203.0.113.77`.',
      },
      agent: {
        en: 'The last quoted part of the same line is the program: `curl/8.5.0`. Staff use Firefox, and the vendor uses its own agent.',
        ar: 'آخر جزء بين علامتي تنصيص في السطر نفسه هو البرنامج: `curl/8.5.0`. الموظفون يستخدمون Firefox، والمورّد يستخدم برنامجه الخاص.',
      },
      fix: {
        en: 'Choose "Keep backups out of any folder the web server serves, and alert on big downloads that break the baseline".',
        ar: 'اختر الجواب الذي يُبعد النسخ الاحتياطية عن أي مجلد يعرضه خادم الويب، وينبّه عند التنزيلات الكبيرة غير المعتادة.',
      },
    },
    concept: {
      en: 'A web access log lists everything the server handed out. To find a leak, first learn what normal looks like, then look for the row that breaks it: an unusual size, time, address or program. A backup must never sit in a folder the web server can serve.',
      ar: 'سجل الوصول في خادم الويب يسرد كل ما أرسله الخادم. لتكشف تسريباً، اعرف أولاً شكل الوضع الطبيعي، ثم ابحث عن السطر الذي يخالفه: حجم أو وقت أو عنوان أو برنامج غير معتاد. والنسخة الاحتياطية لا يجوز أن توجد في مجلد يستطيع خادم الويب عرضه.',
    },
  },
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'A web access log is a record of everything the server gave away. The useful columns are the client IP, the path, the status code, the size and the user agent. Size is a strong signal: a normal page is kilobytes, a database dump is megabytes. But size alone is not enough (the nightly backup is bigger), so you compare against a baseline: who normally downloads what, and when. The root cause here is a backup stored inside the web root, where any request can reach it.',
      ar: 'سجل الوصول في خادم الويب قائمة بكل ما أرسله الخادم. الأعمدة المفيدة: عنوان العميل، والمسار، ورمز الحالة، والحجم، واسم البرنامج. الحجم إشارة قوية: الصفحة العادية بالكيلوبايت، ونسخة قاعدة البيانات بالميغابايت. لكن الحجم وحده لا يكفي (النسخة الليلية أكبر)، ولذلك تقارن بالوضع الطبيعي: من ينزّل ماذا في العادة، ومتى. السبب الأساسي هنا نسخة احتياطية محفوظة داخل مجلد الويب، حيث يصل إليها أي طلب.',
    },
    realTools: ['GoAccess', 'Elastic / Kibana', 'Wazuh', 'AWStats', 'nginx deny rules'],
    takeaway: {
      en: 'Know your normal, then look for rows that break it. And never keep backups where the web server can serve them.',
      ar: 'اعرف الوضع الطبيعي عندك، ثم ابحث عن الأسطر التي تخالفه. ولا تحفظ النسخ الاحتياطية أبداً في مكان يستطيع خادم الويب عرضه.',
    },
    source: 'OWASP WSTG-CONF-04 (Review Old Backup and Unreferenced Files); MITRE ATT&CK T1530/T1213; NIST SP 800-92',
  },
  echo: {
    intro: { en: 'Web logs are long and boring on purpose. The odd one out is the whole story.', ar: 'سجلات الويب طويلة ومملّة عمداً. السطر الشاذ هو القصة كلها.' },
    success: { en: 'Two leaks now: the database exports and the intranet backup. Next: what did they type on the box?', ar: 'أصبح لدينا تسريبان: ملفات قاعدة البيانات ونسخة الشبكة الداخلية. السؤال التالي: ماذا كتبوا على الجهاز؟' },
  },
  solution: `sort -n -k 10 access.log: bottom rows are 3 nightly NovaBackup pulls (02:00, agent) and ${ACT4.leakedPath} ${LEAK_BYTES} bytes from ${ACT4.attackerIp} with ${TOOL} at 04:03:30 Mar 13. Choice: move.`,
  selfTest: [
    { run: 'sort -n -k 10 access.log', includes: ACT4.leakedPath },
    { run: `grep ${ACT4.attackerIp} access.log`, includes: TOOL },
    { run: 'grep -c nightly access.log', includes: '3' },
  ],
};

export default level;
