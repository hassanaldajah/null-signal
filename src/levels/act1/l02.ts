import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const H = ACT1.home;
const TICKETS = `${H}/Documents/work/tickets/2026-03`;

const ticket = (id: string, date: string, title: string, body: string) =>
  `Ticket: ${id}\nOpened: ${date}\nOwner: ${ACT1.user}\nTitle: ${title}\n---\n${body}\n`;

const level: LevelConfig = {
  id: 'L02',
  requires: { levels: ['L01'], evidence: ['ev.l01.user'] },
  briefing: {
    en: "You're in. Samir filed IT tickets before he went silent. Use the terminal to move through his folders and find what he reported. Moving around a filesystem quickly is the first skill of every investigator.",
    ar: 'دخلت. سمير فتح تذاكر IT قبل ما يختفي. استخدم الطرفية لتتنقّل بين مجلداته وتلاقي شو بلّغ. التنقّل السريع بنظام الملفات أول مهارة لأي محقق.',
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'terminal'],
  world: {
    user: ACT1.user,
    host: ACT1.host,
    home: H,
    now: ACT1.now,
    files: {
      [`${H}/Desktop/README.txt`]: 'Helix Dynamics workstation. Property of IT.\n',
      [`${H}/Documents/personal/todo.txt`]: '- renew passport\n- call mom\n- fix the bike chain\n',
      [`${H}/Documents/personal/recipes.txt`]: 'Maqluba: rice, eggplant, cauliflower, chicken. Flip carefully.\n',
      [`${H}/Documents/work/reports/q1-summary.txt`]: 'Q1: patched 41 servers, migrated mail gateway, 2 open incidents.\n',
      [`${H}/Documents/work/tickets/2026-02/TCK-1150.txt`]: ticket('TCK-1150', '2026-02-11', 'Mail quota', 'Mailbox for m.chen is full. Raised quota to 50GB.'),
      [`${H}/Documents/work/tickets/2026-02/TCK-1161.txt`]: ticket('TCK-1161', '2026-02-24', 'Expired certificate', 'Renewed wiki TLS certificate.'),
      [`${TICKETS}/TCK-1182.txt`]: ticket('TCK-1182', '2026-03-03', 'Printer offline', 'Floor 2 printer offline again. Replaced the network cable.'),
      [`${TICKETS}/TCK-1185.txt`]: ticket(
        'TCK-1185',
        '2026-03-09',
        'Vendor VPN access',
        `Approved VPN access for our backup vendor from ${ACT1.vendorIp}. Contract #V-2207, valid until June.`,
      ),
      [`${TICKETS}/TCK-1187.txt`]: ticket(
        'TCK-1187',
        '2026-03-13',
        'VPN anomaly on MY account',
        `Got an alert: my account logged in at 03:12 UTC from ${ACT1.attackerIp}.\nI was asleep. I did NOT approve this. Changing my password and digging in.\nIf you are reading this and I am not around: check the logs.`,
      ),
      [`${TICKETS}/TCK-1190.txt`]: ticket('TCK-1190', '2026-03-13', 'Laptop battery', 'Battery swelling on laptop HX-221. Ordered replacement.'),
      [`${H}/Downloads/helix-vpn-client.deb`]: { content: '!<arch>\ndebian-binary', mode: '-rw-r--r--' },
    },
  },
  objectives: [
    {
      id: 'navigate',
      prompt: {
        en: "Navigate to Samir's March 2026 tickets folder (Documents → work → tickets → 2026-03).",
        ar: 'روح لمجلد تذاكر سمير لشهر آذار 2026 (Documents ← work ← tickets ← 2026-03).',
      },
      validator: { kind: 'cwd', path: TICKETS },
    },
    {
      id: 'ip',
      prompt: { en: 'Which IP address did Samir report as suspicious?', ar: 'شو عنوان الـ IP اللي بلّغ عنه سمير كمشبوه؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT1.attackerIp] },
      wrong: {
        en: 'Read every ticket in that folder. One IP was explicitly approved, so it is not the suspect.',
        ar: 'اقرأ كل التذاكر بالمجلد. في IP انوافق عليه رسمياً، فهو مش المشتبه فيه.',
      },
      grants: [
        {
          id: 'ev.l02.ip',
          title: { en: 'Suspicious login source', ar: 'مصدر تسجيل الدخول المشبوه' },
          type: 'ip',
          content: ACT1.attackerIp,
          links: ['ev.l01.user'],
        },
      ],
    },
    {
      id: 'time',
      prompt: { en: 'At what time (UTC, HH:MM) did that login happen?', ar: 'الساعة كم (UTC، بصيغة HH:MM) صار تسجيل الدخول؟' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:12', '3:12'] },
      grants: [
        {
          id: 'ev.l02.time',
          title: { en: 'First unauthorized login', ar: 'أول دخول غير مصرّح' },
          type: 'timestamp',
          content: '2026-03-13 03:12 UTC',
          links: ['ev.l02.ip'],
        },
      ],
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: '`pwd` shows where you are, `ls` shows what is here, `cd <folder>` moves you in.', ar: '`pwd` بيوريك وين إنت، `ls` بيوريك شو في هون، و `cd <مجلد>` بيدخلك عليه.' },
      cost: 10,
    },
    {
      tier: 'direction',
      text: {
        en: 'You can jump several levels at once: `cd Documents/work/tickets/2026-03`. Then `cat` each ticket.',
        ar: 'بتقدر تنط كذا مستوى مرة وحدة: `cd Documents/work/tickets/2026-03`، وبعدين `cat` لكل تذكرة.',
      },
      cost: 20,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'TCK-1185 is an APPROVED vendor. TCK-1187 is the one Samir did not authorize; it has the IP and the time.',
        ar: 'TCK-1185 مورّد مُوافَق عليه. TCK-1187 هي اللي سمير ما وافق عليها؛ فيها الـ IP والوقت.',
      },
      cost: 35,
    },
  ],
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'Linux paths: "/" is the root, "~" is your home, "." is here and ".." is one level up. Absolute paths start with "/"; relative paths start from where you are. ls lists, cd moves, pwd prints your location, cat prints a file.',
      ar: 'مسارات لينكس: "/" هو الجذر، "~" هو مجلدك الرئيسي، "." هون، و ".." مستوى لفوق. المسار المطلق بيبلّش بـ "/"، والنسبي بيبلّش من مكانك. ls بيعرض، cd بينقل، pwd بيطبع مكانك، و cat بيطبع الملف.',
    },
    realTools: ['bash', 'ls', 'cd', 'pwd', 'cat', 'tree'],
    takeaway: {
      en: 'Separate signal from noise: an IP in a ticket is not automatically malicious. Context (approved vs unexplained) decides.',
      ar: 'افصل الإشارة عن الضجيج: وجود IP بتذكرة ما بيعني إنه خبيث. السياق (موافَق عليه أو مش مفسَّر) هو اللي بيحسم.',
    },
    source: 'GNU Coreutils manual; Filesystem Hierarchy Standard 3.0; IPs from RFC 5737 documentation ranges',
  },
  echo: {
    intro: {
      en: 'Samir left a paper trail. Start with `ls` and `cd` — the terminal is faster than clicking once you know the paths.',
      ar: 'سمير ترك أثر ورقي. ابدأ بـ `ls` و `cd`؛ الطرفية أسرع من الكبس لما تعرف المسارات.',
    },
    success: {
      en: 'An IP and a time. That is the first thread. Every later clue will hang from it.',
      ar: 'IP ووقت. هاد أول خيط، وكل الأدلة الجاية رح تتعلّق فيه.',
    },
  },
  solution: 'cd Documents/work/tickets/2026-03 ; cat TCK-1187.txt -> 203.0.113.77 at 03:12. TCK-1185 vendor IP is a decoy.',
  selfTest: [
    { run: 'cd Documents/work/tickets/2026-03', includes: '' },
    { run: 'ls', includes: 'TCK-1187.txt' },
    { run: 'cat TCK-1187.txt', includes: ACT1.attackerIp },
    { run: 'cat TCK-1187.txt', includes: '03:12' },
  ],
};

export default level;
