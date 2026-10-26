import type { LevelConfig } from '../../engine/schema';
import { AUTH_LOG as LOG, dbAuthLog } from './records';
import { ACT4 } from './story';

const level: LevelConfig = {
  id: 'L16',
  requires: { levels: ['L15'], evidence: ['ev.l04.account', 'ev.l02.ip'] },
  briefing: {
    en: 'Act 4: the database server helix-db01. Its auth.log records every login AND every command run with sudo (as root). Open it in the Log Viewer, filter instead of scrolling, and find out what the stolen j.ortiz account did here.',
    ar: 'الفصل الرابع: سيرفر قاعدة البيانات helix-db01. سجل auth.log فيه كل دخول وكل أمر انشغّل بـ sudo (بصلاحيات root). افتحه بعارض السجلات، فلتر بدل ما تمرّر، واعرف شو عمل حساب j.ortiz المسروق هون.',
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
      prompt: { en: 'At what time (HH:MM) did j.ortiz log in from the attacker IP?', ar: 'الساعة كم (HH:MM) دخل j.ortiz من IP المهاجم؟' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:45', '03:45:10'] },
      wrong: { en: 'Filter the log by the attacker IP from Act 1.', ar: 'فلتر السجل بـ IP المهاجم من الفصل الأول.' },
    },
    {
      id: 'sudo',
      prompt: { en: 'Which program did j.ortiz run as root to pack the exports?', ar: 'أي برنامج شغّل j.ortiz بصلاحيات root ليحزم ملفات التصدير؟' },
      placeholder: '/usr/bin/…',
      validator: { kind: 'answer', accept: ['/usr/bin/tar', 'tar'] },
      wrong: { en: 'Filter by "sudo" and read COMMAND=.', ar: 'فلتر بـ "sudo" واقرأ COMMAND=.' },
    },
    {
      id: 'archive',
      prompt: { en: 'Where was the archive written?', ar: 'وين انكتب الأرشيف؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.archive] },
      wrong: { en: 'tar czf <output> <input>: the first path is the output.', ar: 'tar czf <الناتج> <المدخل>: أول مسار هو الناتج.' },
      grants: [
        {
          id: 'ev.l16.archive',
          title: { en: 'Database exports packed as root', ar: 'ملفات قاعدة البيانات انحزمت بصلاحيات root' },
          type: 'file',
          content: `j.ortiz (from ${ACT4.attackerIp}) sudo tar -> ${ACT4.archive} at 03:47`,
          links: ['ev.l04.account', 'ev.l02.ip'],
        },
      ],
    },
    {
      id: 'meaning',
      prompt: { en: 'Why does the sudo line matter so much?', ar: 'ليش سطر sudo مهم لهالدرجة؟' },
      validator: {
        kind: 'choice',
        correct: 'root',
        options: [
          { id: 'root', label: { en: 'It proves the stolen account could act as root, and records exactly what it ran', ar: 'بيثبت إنه الحساب المسروق قدر يتصرّف كـ root، وبيسجّل بالزبط شو شغّل' } },
          { id: 'error', label: { en: 'It is an error message', ar: 'هي رسالة خطأ' } },
          { id: 'normal', label: { en: 'Every user runs tar as root at night', ar: 'كل المستخدمين بيشغّلوا tar كـ root بالليل' } },
        ],
      },
      wrong: { en: 'USER=root tells you who the command ran as.', ar: 'USER=root بتحكيلك الأمر انشغّل باسم مين.' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'Type the attacker IP in the Log Viewer filter.', ar: 'اكتب IP المهاجم بفلتر عارض السجلات.' }, cost: 15 },
    { tier: 'direction', text: { en: 'Then filter "sudo: j.ortiz" and read the COMMAND= part.', ar: 'وبعدين فلتر "sudo: j.ortiz" واقرأ جزء COMMAND=.' }, cost: 30 },
    { tier: 'near-solution', text: { en: `Login 03:45 from ${ACT4.attackerIp}; sudo tar czf ${ACT4.archive}.`, ar: `الدخول 03:45 من ${ACT4.attackerIp}؛ و sudo tar czf ${ACT4.archive}.` }, cost: 45 },
  ],
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'On Linux, /var/log/auth.log (or secure) records authentication: SSH logins, failures, and every sudo call with the user, working directory, target user and full command. That makes sudo logs one of the best sources for "what did they do with the access". Attackers know it, so ship logs to a central server (syslog/SIEM) where they cannot be edited from the compromised host.',
      ar: 'بلينكس، ملف /var/log/auth.log (أو secure) بيسجّل المصادقة: دخول SSH، والفشل، وكل استدعاء لـ sudo مع المستخدم والمجلد والمستخدم الهدف والأمر كامل. هاد بيخلّي سجلات sudo من أحسن المصادر لسؤال "شو عملوا بالوصول". والمهاجمين بيعرفوا هالشي، فابعث السجلات لسيرفر مركزي (syslog أو SIEM) ما بيقدروا يعدّلوه من الجهاز المخترق.',
    },
    realTools: ['journalctl / auth.log', 'rsyslog forwarding', 'auditd', 'Wazuh / Elastic SIEM'],
    takeaway: {
      en: 'Logins tell you who came in; sudo logs tell you what they did. Keep a copy off the box.',
      ar: 'سجلات الدخول بتحكيلك مين دخل؛ وسجلات sudo بتحكيلك شو عمل. خلّي نسخة برّا الجهاز.',
    },
    source: 'sudo(8) and sudoers(5) logging; NIST SP 800-92 (Guide to Computer Security Log Management)',
  },
  echo: {
    intro: { en: 'New server, same visitor. Let the sudo lines tell you what they took.', ar: 'سيرفر جديد ونفس الزائر. خلّي أسطر sudo تحكيلك شو أخذ.' },
    success: { en: 'Packed as root into the beacon folder. Next: how did it leave the building?', ar: 'انحزم بصلاحيات root بمجلد برنامج الاتصال. السؤال الجاي: كيف طلع من المبنى؟' },
  },
  solution: 'Log Viewer filter 203.0.113.77 -> Accepted j.ortiz 03:45:10. Filter sudo -> tar czf /tmp/.X11-cache/db-export.tgz. Choice: root.',
  selfTest: [
    { run: `grep ${ACT4.attackerIp} ${LOG}`, includes: '03:45:10' },
    { run: `grep sudo ${LOG}`, includes: ACT4.archive },
  ],
};

export default level;
