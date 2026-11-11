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
    ar: 'لقد دخلت. سمير فتح تذاكر دعم فني قبل أن ينقطع الاتصال به. استخدم الطرفية للتنقل بين مجلداته ومعرفة ما الذي أبلغ عنه. التنقل السريع في نظام الملفات هو أول مهارة لكل محقق.',
  },
  mission: {
    goal: {
      en: "Use the terminal to reach Samir's March tickets and find the login he reported as not his.",
      ar: 'استخدم الطرفية للوصول إلى تذاكر سمير لشهر آذار، واعثر على عملية الدخول التي أبلغ أنها ليست له.',
    },
    investigate: [
      {
        en: "The folder `Documents/work/tickets/2026-03` inside Samir's home folder.",
        ar: 'المجلد `Documents/work/tickets/2026-03` داخل المجلد الرئيسي لسمير.',
      },
      {
        en: 'Every ticket in that folder. One IP belongs to an approved vendor. Another one is the login Samir did not approve.',
        ar: 'كل تذكرة في ذلك المجلد. أحد العناوين يعود لمورّد تمت الموافقة عليه، وعنوان آخر هو الدخول الذي لم يوافق عليه سمير.',
      },
    ],
    success: {
      en: 'You are inside the tickets folder and you have given the suspicious IP and its login time. Both are pinned to your board.',
      ar: 'تكون داخل مجلد التذاكر، وقد كتبت عنوان IP المشبوه ووقت الدخول. يُثبَّت الاثنان على لوحة الأدلة.',
    },
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
        en: "In the terminal, go to Samir's March 2026 tickets folder: `Documents/work/tickets/2026-03`.",
        ar: 'في الطرفية، انتقل إلى مجلد تذاكر سمير لشهر آذار 2026: `Documents/work/tickets/2026-03`.',
      },
      validator: { kind: 'cwd', path: TICKETS },
    },
    {
      id: 'ip',
      prompt: { en: 'Which IP address did Samir report as suspicious?', ar: 'ما عنوان IP الذي أبلغ سمير أنه مشبوه؟' },
      placeholder: '0.0.0.0',
      validator: { kind: 'answer', accept: [ACT1.attackerIp] },
      wrong: {
        en: 'Read every ticket in that folder. One IP was explicitly approved, so it is not the suspect.',
        ar: 'اقرأ كل التذاكر في المجلد. أحد العناوين تمت الموافقة عليه رسمياً، فهو ليس المشبوه.',
      },
      grants: [
        {
          id: 'ev.l02.ip',
          title: { en: 'Suspicious login source', ar: 'مصدر الدخول المشبوه' },
          type: 'ip',
          content: ACT1.attackerIp,
          links: ['ev.l01.user'],
        },
      ],
    },
    {
      id: 'time',
      prompt: { en: 'At what time (UTC, HH:MM) did that login happen?', ar: 'في أي ساعة حدث هذا الدخول؟ (بتوقيت UTC وبصيغة HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:12', '3:12'] },
      grants: [
        {
          id: 'ev.l02.time',
          title: { en: 'First unauthorized login', ar: 'أول دخول غير مصرّح به' },
          type: 'timestamp',
          content: '2026-03-13 03:12 UTC',
          links: ['ev.l02.ip'],
        },
      ],
    },
  ],
  guide: {
    nudge: {
      en: '`pwd` shows where you are, `ls` shows what is here, `cd <folder>` moves you in.',
      ar: 'الأمر `pwd` يعرض مكانك الحالي، و`ls` يعرض محتويات المجلد، و`cd <folder>` يدخلك إلى مجلد.',
    },
    clue: {
      en: 'You can jump several levels at once: `cd Documents/work/tickets/2026-03`. Then `cat` each ticket.',
      ar: 'يمكنك عبور عدة مجلدات دفعة واحدة: `cd Documents/work/tickets/2026-03`. ثم اقرأ كل تذكرة بالأمر `cat`.',
    },
    steps: {
      navigate: {
        en: 'Type `cd Documents/work/tickets/2026-03` and press Enter. `pwd` confirms where you are.',
        ar: 'اكتب `cd Documents/work/tickets/2026-03` ثم اضغط Enter. الأمر `pwd` يؤكد لك مكانك.',
      },
      ip: {
        en: 'Run `ls`, then read the tickets with `cat`, for example `cat TCK-1187.txt`. Ticket TCK-1185 is a vendor that was approved. Ticket TCK-1187 is the login Samir did not approve. Its IP is `203.0.113.77`.',
        ar: 'شغّل `ls` ثم اقرأ التذاكر بالأمر `cat`، مثل `cat TCK-1187.txt`. التذكرة TCK-1185 تخص مورّداً تمت الموافقة عليه. التذكرة TCK-1187 هي الدخول الذي لم يوافق عليه سمير، وعنوانه `203.0.113.77`.',
      },
      time: {
        en: 'The same ticket, TCK-1187, says the login happened at 03:12 UTC. Type `03:12`.',
        ar: 'التذكرة نفسها TCK-1187 تذكر أن الدخول حدث الساعة 03:12 بتوقيت UTC. اكتب `03:12`.',
      },
    },
    concept: {
      en: 'In Linux everything is a file inside a tree of folders. Three commands are enough to move around: `ls` lists, `cd` enters, `cat` reads. An IP address in a ticket is not automatically bad: the context decides.',
      ar: 'في لينكس كل شيء ملف داخل شجرة من المجلدات. ثلاثة أوامر تكفي للتنقل: `ls` للعرض، و`cd` للدخول، و`cat` للقراءة. ووجود عنوان IP في تذكرة لا يعني أنه خبيث: السياق هو الذي يحسم.',
    },
  },
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'Linux paths: "/" is the root, "~" is your home, "." is here and ".." is one level up. Absolute paths start with "/"; relative paths start from where you are. ls lists, cd moves, pwd prints your location, cat prints a file.',
      ar: 'مسارات لينكس: `/` هو الجذر، و`~` هو مجلدك الرئيسي، و`.` هو المجلد الحالي، و`..` هو المجلد الأعلى. المسار المطلق يبدأ بالرمز `/`، والمسار النسبي يبدأ من مكانك الحالي. الأمر `ls` يعرض المحتويات، و`cd` ينقلك، و`pwd` يطبع مكانك، و`cat` يطبع محتوى ملف.',
    },
    realTools: ['bash', 'ls', 'cd', 'pwd', 'cat', 'tree'],
    takeaway: {
      en: 'Separate signal from noise: an IP in a ticket is not automatically malicious. Context (approved vs unexplained) decides.',
      ar: 'افصل المهم عن الضجيج: وجود عنوان IP في تذكرة لا يعني أنه خبيث. السياق هو الذي يحسم: هل تمت الموافقة عليه، أم لا يوجد تفسير له؟',
    },
    source: 'GNU Coreutils manual; Filesystem Hierarchy Standard 3.0; IPs from RFC 5737 documentation ranges',
  },
  echo: {
    intro: {
      en: 'Samir left a paper trail. Start with `ls` and `cd` — the terminal is faster than clicking once you know the paths.',
      ar: 'سمير ترك وراءه سجلاً مكتوباً. ابدأ بالأمرين `ls` و`cd`. الطرفية أسرع من النقر عندما تعرف المسارات.',
    },
    success: {
      en: 'An IP and a time. That is the first thread. Every later clue will hang from it.',
      ar: 'عنوان IP ووقت. هذا أول خيط، وكل الأدلة القادمة سترتبط به.',
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
