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
    ar: `سيرفر الإنترانت ${ACT4.webHost} بيسجّل سطر لكل ملف بيعطيه: مين طلب (IP)، ووقتيش، وأي ملف، ورمز الحالة، وكم بايت انبعث، وأي برنامج طلب (user agent). مئات الأسطر العادية، وواحد منها ملف طالع برّا الشركة. لاقي السطر اللي ما بيمشي مع النمط.`,
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
      prompt: { en: 'Which file was downloaded outside the normal pattern?', ar: 'أي ملف انحمّل برّا النمط العادي؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.leakedPath, 'helix-intranet.sql.gz'] },
      wrong: {
        en: 'Big downloads stand out: sort by the bytes column. Then compare each big row with the ops note.',
        ar: 'التنزيلات الكبيرة بتبيّن: رتّب حسب عمود البايتات. وبعدين قارن كل سطر كبير مع ملاحظة الفريق.',
      },
    },
    {
      id: 'ip',
      prompt: { en: 'Which IP downloaded it?', ar: 'أي IP نزّله؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT4.attackerIp] },
      wrong: { en: 'The IP is the first field of the same line.', ar: 'الـ IP هو أول حقل بنفس السطر.' },
    },
    {
      id: 'agent',
      prompt: { en: 'Which program made the request (user agent)?', ar: 'أي برنامج عمل الطلب (user agent)؟' },
      placeholder: 'name/version',
      validator: { kind: 'answer', accept: [TOOL, 'curl'] },
      wrong: { en: 'The user agent is the last quoted part of the line.', ar: 'الـ user agent هو آخر جزء بين علامتي تنصيص بالسطر.' },
      grants: [
        {
          id: 'ev.l17.leak',
          title: { en: 'Intranet backup downloaded from outside', ar: 'نسخة الإنترانت الاحتياطية انحمّلت من برّا' },
          type: 'file',
          content: `${ACT4.leakedPath} (${LEAK_BYTES} bytes) -> ${ACT4.attackerIp} via ${TOOL}, Mar 13 04:03`,
          links: ['ev.l02.ip', 'ev.l16.archive'],
        },
      ],
    },
    {
      id: 'fix',
      prompt: { en: 'What is the right fix?', ar: 'شو الحل الصحيح؟' },
      validator: {
        kind: 'choice',
        correct: 'move',
        options: [
          { id: 'move', label: { en: 'Keep backups out of any folder the web server serves, and alert on big downloads that break the baseline', ar: 'إبعاد النسخ الاحتياطية عن أي مجلد بيعرضه سيرفر الويب، والتنبيه على التنزيلات الكبيرة اللي بتكسر النمط' } },
          { id: 'rename', label: { en: 'Rename the file to something harder to guess', ar: 'تغيير اسم الملف لاسم أصعب يتخمّن' } },
          { id: 'curl', label: { en: 'Block the curl user agent', ar: 'حظر الـ user agent تبع curl' } },
        ],
      },
      wrong: {
        en: 'A hidden name and a blocked user agent are both one line away from being bypassed. Where should the file live?',
        ar: 'الاسم المخفي وحظر الـ user agent الاثنين بينتجاوزوا بسطر واحد. وين لازم يكون الملف أصلاً؟',
      },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'Read the ops note first: it tells you what normal looks like.', ar: 'اقرأ ملاحظة الفريق أول: بتحكيلك شو الطبيعي.' }, cost: 15 },
    { tier: 'direction', text: { en: 'In the terminal: sort -n -k 10 access.log puts the biggest downloads at the bottom. Which big one is not the nightly agent?', ar: 'بالطرفية: sort -n -k 10 access.log بيحط أكبر التنزيلات تحت. أي واحد كبير مش تبع الوكيل الليلي؟' }, cost: 30 },
    { tier: 'near-solution', text: { en: `grep backup access.log, then look for the row that is not ${ACT4.vendorIp} at 02:00.`, ar: `grep backup access.log، ودوّر على السطر اللي مش ${ACT4.vendorIp} الساعة 02:00.` }, cost: 45 },
  ],
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'A web access log is a record of everything the server gave away. The useful columns are the client IP, the path, the status code, the size and the user agent. Size is a strong signal: a normal page is kilobytes, a database dump is megabytes. But size alone is not enough (the nightly backup is bigger), so you compare against a baseline: who normally downloads what, and when. The root cause here is a backup stored inside the web root, where any request can reach it.',
      ar: 'سجل الوصول لسيرفر الويب هو سجل لكل شي السيرفر أعطاه. الأعمدة المفيدة: IP العميل، والمسار، ورمز الحالة، والحجم، والـ user agent. الحجم إشارة قوية: الصفحة العادية كيلوبايتات، وتفريغ قاعدة البيانات ميغابايتات. بس الحجم لحاله مش كافي (النسخة الليلية أكبر)، فبتقارن مع خط الأساس: مين عادةً بينزّل شو، ووقتيش. والسبب الأساسي هون نسخة احتياطية محطوطة جوّا مجلد الويب، وين أي طلب بيوصلها.',
    },
    realTools: ['GoAccess', 'Elastic / Kibana', 'Wazuh', 'AWStats', 'nginx deny rules'],
    takeaway: {
      en: 'Know your normal, then look for rows that break it. And never keep backups where the web server can serve them.',
      ar: 'اعرف الطبيعي عندك، وبعدين دوّر على الأسطر اللي بتكسره. وما تخلّي النسخ الاحتياطية أبداً بمكان سيرفر الويب بيقدر يعرضها منه.',
    },
    source: 'OWASP WSTG-CONF-04 (Review Old Backup and Unreferenced Files); MITRE ATT&CK T1530/T1213; NIST SP 800-92',
  },
  echo: {
    intro: { en: 'Web logs are long and boring on purpose. The odd one out is the whole story.', ar: 'سجلات الويب طويلة ومملّة عن قصد. السطر الشاذ هو القصة كلها.' },
    success: { en: 'Two leaks now: the database exports and the intranet backup. Next: what did they type on the box?', ar: 'صار عنا تسريبين: ملفات قاعدة البيانات ونسخة الإنترانت. السؤال الجاي: شو كتبوا على الجهاز؟' },
  },
  solution: `sort -n -k 10 access.log: bottom rows are 3 nightly NovaBackup pulls (02:00, agent) and ${ACT4.leakedPath} ${LEAK_BYTES} bytes from ${ACT4.attackerIp} with ${TOOL} at 04:03:30 Mar 13. Choice: move.`,
  selfTest: [
    { run: 'sort -n -k 10 access.log', includes: ACT4.leakedPath },
    { run: `grep ${ACT4.attackerIp} access.log`, includes: TOOL },
    { run: 'grep -c nightly access.log', includes: '3' },
  ],
};

export default level;
