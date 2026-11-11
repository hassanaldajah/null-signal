import type { LevelConfig } from '../../engine/schema';
import { AUTH_LOG as LOG, dbAuthLog } from './records';
import { ACT4 } from './story';

const level: LevelConfig = {
  id: 'L16',
  requires: { levels: ['L15'], evidence: ['ev.l04.account', 'ev.l02.ip'] },
  briefing: {
    en: 'Act 4: the database server helix-db01. Its auth.log records every login AND every command run with sudo (as root). Open it in the Log Viewer, filter instead of scrolling, and find out what the stolen j.ortiz account did here.',
    ar: 'الفصل الرابع: خادم قاعدة البيانات `helix-db01`. السجل `auth.log` فيه كل عملية دخول وكل أمر نُفّذ عبر `sudo` (أي بصلاحيات root). افتحه في عارض السجلات، واستخدم التصفية بدل التمرير، واعرف ماذا فعل الحساب المسروق `j.ortiz` هنا.',
  },
  mission: {
    goal: {
      en: 'Use the Log Viewer to find out what the stolen `j.ortiz` account did on the database server.',
      ar: 'استخدم عارض السجلات لتعرف ماذا فعل الحساب المسروق `j.ortiz` على خادم قاعدة البيانات.',
    },
    investigate: [
      {
        en: 'The Log Viewer with `/var/log/auth.log`. Type in the filter box instead of scrolling.',
        ar: 'عارض السجلات وفيه الملف `/var/log/auth.log`. اكتب في خانة التصفية بدل التمرير.',
      },
      {
        en: "The lines with the attacker's IP, `203.0.113.77`. They show the login.",
        ar: 'الأسطر التي فيها عنوان المهاجم `203.0.113.77`: تبيّن عملية الدخول.',
      },
      {
        en: 'The lines with `sudo`. Each one shows a command run as root, after `COMMAND=`.',
        ar: 'الأسطر التي فيها `sudo`: كل سطر يبيّن أمراً نُفّذ بصلاحيات root، ويأتي بعد `COMMAND=`.',
      },
    ],
    success: {
      en: 'You have the login time, the program run as root and the place where the archive was written. One evidence card is pinned.',
      ar: 'تكون قد عرفت وقت الدخول، والبرنامج الذي نُفّذ بصلاحيات root، ومكان كتابة الأرشيف. تُثبَّت بطاقة دليل واحدة.',
    },
  },
  apps: ['case', 'logs', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'logs'],
  world: {
    user: 'a.nasser',
    host: ACT4.dbHost,
    home: '/home/a.nasser',
    cwd: '/var/log',
    now: ACT4.now,
    logs: [LOG],
    files: { [LOG]: dbAuthLog() },
  },
  objectives: [
    {
      id: 'login',
      prompt: { en: "In `auth.log`, at what time (HH:MM) did `j.ortiz` log in from the attacker's IP?", ar: 'في السجل `auth.log`، في أي ساعة دخل الحساب `j.ortiz` من عنوان المهاجم؟ (بصيغة HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:45', '03:45:10'] },
      wrong: { en: 'Filter the log by the attacker IP from Act 1.', ar: 'صفِّ السجل بعنوان IP الخاص بالمهاجم الذي عرفته في الفصل الأول.' },
    },
    {
      id: 'sudo',
      prompt: { en: 'Which program did `j.ortiz` run as root (with `sudo`) to pack the exports?', ar: 'أي برنامج شغّله `j.ortiz` بصلاحيات root (عبر `sudo`) لحزم ملفات التصدير؟' },
      placeholder: '/usr/bin/…',
      validator: { kind: 'answer', accept: ['/usr/bin/tar', 'tar'] },
      wrong: { en: 'Filter by "sudo" and read COMMAND=.', ar: 'صفِّ بكلمة `sudo` واقرأ ما بعد `COMMAND=`.' },
    },
    {
      id: 'archive',
      prompt: { en: 'Where was the archive written?', ar: 'أين كُتب ملف الأرشيف؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.archive] },
      wrong: { en: 'tar czf <output> <input>: the first path is the output.', ar: 'في الأمر `tar czf` يأتي ملف الناتج أولاً، ثم الملفات المطلوب حزمها. المسار الأول هو الناتج.' },
      grants: [
        {
          id: 'ev.l16.archive',
          title: { en: 'Database exports packed as root', ar: 'ملفات قاعدة البيانات حُزمت بصلاحيات root' },
          type: 'file',
          content: `j.ortiz (from ${ACT4.attackerIp}) sudo tar -> ${ACT4.archive} at 03:47`,
          links: ['ev.l04.account', 'ev.l02.ip'],
        },
      ],
    },
    {
      id: 'meaning',
      prompt: { en: 'Why does the sudo line matter so much?', ar: 'لماذا سطر `sudo` مهم إلى هذا الحد؟' },
      validator: {
        kind: 'choice',
        correct: 'root',
        options: [
          { id: 'root', label: { en: 'It proves the stolen account could act as root, and records exactly what it ran', ar: 'لأنه يثبت أن الحساب المسروق استطاع التصرف كأنه root، ويسجّل ما شغّله بدقة' } },
          { id: 'error', label: { en: 'It is an error message', ar: 'لأنه رسالة خطأ' } },
          { id: 'normal', label: { en: 'Every user runs tar as root at night', ar: 'لأن كل المستخدمين يشغّلون tar بصلاحيات root في الليل' } },
        ],
      },
      wrong: { en: 'USER=root tells you who the command ran as.', ar: 'الجزء `USER=root` يبيّن باسم من نُفّذ الأمر.' },
    },
  ],
  guide: {
    nudge: {
      en: "Type the attacker's IP in the Log Viewer filter.",
      ar: 'اكتب عنوان IP الخاص بالمهاجم في خانة التصفية في عارض السجلات.',
    },
    clue: {
      en: 'Then filter by `sudo: j.ortiz` and read the part after `COMMAND=`.',
      ar: 'ثم صفِّ بالنص `sudo: j.ortiz` واقرأ ما يأتي بعد `COMMAND=`.',
    },
    steps: {
      login: {
        en: 'In the Log Viewer filter, type `203.0.113.77`. One line says `Accepted password for j.ortiz` at `03:45:10`. Type `03:45`.',
        ar: 'في خانة التصفية في عارض السجلات اكتب `203.0.113.77`. يظهر سطر فيه `Accepted password for j.ortiz` بالوقت `03:45:10`. اكتب `03:45`.',
      },
      sudo: {
        en: 'Change the filter to `sudo`. The line at 03:47:30 ends with `COMMAND=/usr/bin/tar czf` and two paths. The program is `/usr/bin/tar`.',
        ar: 'غيّر التصفية إلى `sudo`. السطر الذي وقته 03:47:30 ينتهي بالنص `COMMAND=/usr/bin/tar czf` وبعده مساران. البرنامج هو `/usr/bin/tar`.',
      },
      archive: {
        en: 'In the same line, the first path after `tar czf` is the output file: `/tmp/.X11-cache/db-export.tgz`.',
        ar: 'في السطر نفسه، أول مسار بعد `tar czf` هو ملف الناتج: `/tmp/.X11-cache/db-export.tgz`.',
      },
      meaning: {
        en: 'Choose "It proves the stolen account could act as root, and records exactly what it ran".',
        ar: 'اختر الجواب الذي يقول إنه يثبت أن الحساب المسروق استطاع التصرف كأنه root، ويسجّل ما شغّله بدقة.',
      },
    },
    concept: {
      en: 'The file `auth.log` records who logged in and every command run with `sudo`. Logins tell you who came in, and `sudo` lines tell you what they did with the access. Keep a copy of the logs on another server so an intruder cannot change them.',
      ar: 'الملف `auth.log` يسجّل من دخل وكل أمر نُفّذ عبر `sudo`. سجلات الدخول تخبرك من دخل، وأسطر `sudo` تخبرك ماذا فعل بهذا الوصول. احتفظ بنسخة من السجلات على خادم آخر حتى لا يستطيع المتسلل تغييرها.',
    },
  },
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'On Linux, /var/log/auth.log (or secure) records authentication: SSH logins, failures, and every sudo call with the user, working directory, target user and full command. That makes sudo logs one of the best sources for "what did they do with the access". Attackers know it, so ship logs to a central server (syslog/SIEM) where they cannot be edited from the compromised host.',
      ar: 'في لينكس، الملف `/var/log/auth.log` (أو `secure`) يسجّل عمليات المصادقة: دخول SSH، والمحاولات الفاشلة، وكل استخدام للأمر `sudo` مع اسم المستخدم والمجلد والمستخدم الهدف والأمر كاملاً. لذلك تُعدّ سجلات `sudo` من أفضل المصادر للإجابة عن سؤال: ماذا فعلوا بهذا الوصول؟ المهاجمون يعرفون ذلك، فأرسل السجلات إلى خادم مركزي (syslog أو SIEM) لا يستطيعون تعديله من الجهاز المخترق.',
    },
    realTools: ['journalctl / auth.log', 'rsyslog forwarding', 'auditd', 'Wazuh / Elastic SIEM'],
    takeaway: {
      en: 'Logins tell you who came in; sudo logs tell you what they did. Keep a copy off the box.',
      ar: 'سجلات الدخول تخبرك من دخل، وسجلات `sudo` تخبرك ماذا فعل. واحتفظ بنسخة خارج الجهاز.',
    },
    source: 'sudo(8) and sudoers(5) logging; NIST SP 800-92 (Guide to Computer Security Log Management)',
  },
  echo: {
    intro: { en: 'New server, same visitor. Let the sudo lines tell you what they took.', ar: 'خادم جديد والزائر نفسه. دع أسطر `sudo` تخبرك ماذا أخذ.' },
    success: { en: 'Packed as root into the beacon folder. Next: how did it leave the building?', ar: 'حُزمت الملفات بصلاحيات root داخل مجلد برنامج الاتصال. السؤال التالي: كيف خرجت من الشركة؟' },
  },
  solution: 'Log Viewer filter 203.0.113.77 -> Accepted j.ortiz 03:45:10. Filter sudo -> tar czf /tmp/.X11-cache/db-export.tgz. Choice: root.',
  selfTest: [
    { run: `grep ${ACT4.attackerIp} ${LOG}`, includes: '03:45:10' },
    { run: `grep sudo ${LOG}`, includes: ACT4.archive },
  ],
};

export default level;
