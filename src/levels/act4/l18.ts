import type { LevelConfig } from '../../engine/schema';
import { CMDLOG, HARDENING, commandsLog, historyFile, unixTime } from './records';
import { ACT4 } from './story';

const HIST = `/home/${ACT4.secondAccount}/.bash_history`;
const DIR = ACT4.stagingDir;

const level: LevelConfig = {
  id: 'L18',
  requires: { levels: ['L17'], evidence: ['ev.l16.archive', 'ev.l04.account'] },
  briefing: {
    en: `Back on ${ACT4.dbHost}. auth.log showed what j.ortiz ran as root; the shell history shows everything j.ortiz typed. It lives in a hidden file in their home folder. Read it, follow the archive, and notice where the history stops: a history that goes quiet is a clue too.`,
    ar: `رجعنا على ${ACT4.dbHost}. سجل auth.log ورّانا شو شغّل j.ortiz بصلاحيات root؛ وسجل الأوامر بيورّينا كل إشي كتبه. السجل موجود بملف مخفي بمجلده. اقرأه، واتبع الأرشيف، وانتبه وين بيوقف السجل: السجل اللي بيسكت فجأة هو كمان دليل.`,
  },
  apps: ['case', 'terminal', 'logs', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT4.dbHost,
    home: '/home/a.nasser',
    cwd: '/home',
    now: ACT4.now,
    logs: [CMDLOG],
    files: {
      [HIST]: historyFile(ACT4.secondAccount, Date.parse(ACT4.pushedAt)),
      '/home/r.khalil/.bash_history': historyFile('r.khalil'),
      '/home/m.chen/.bash_history': historyFile('m.chen'),
      '/home/p.novak/.bash_history': historyFile('p.novak'),
      '/home/a.nasser/.bash_history': historyFile('a.nasser'),
      ...HARDENING,
      [CMDLOG]: { content: commandsLog(), mode: '-rw-r-----', owner: 'syslog', mtime: ACT4.now },
      [`${DIR}/.sync`]: { content: `target = ${ACT4.attackerIp}\n# -- ${ACT4.handle}\n`, mode: '-rwxr-xr-x', owner: ACT4.secondAccount, mtime: '2026-03-13T03:46:52Z' },
    },
  },
  objectives: [
    {
      id: 'exfil',
      prompt: { en: "Read j.ortiz's shell history. Which domain did the beacon push the archive to?", ar: 'اقرأ سجل أوامر j.ortiz. لأي نطاق بعت برنامج الاتصال الأرشيف؟' },
      placeholder: 'name.example',
      validator: { kind: 'answer', accept: [ACT4.exfilVia, ACT4.exfilDomain] },
      wrong: {
        en: 'The history file starts with a dot, so plain ls hides it. Look for the line that uses the archive.',
        ar: 'ملف السجل اسمه بيبلّش بنقطة، فـ ls العادي بيخبّيه. دوّر على السطر اللي بيستخدم الأرشيف.',
      },
      grants: [
        {
          id: 'ev.l18.exfil',
          title: { en: 'Archive pushed out by the beacon', ar: 'برنامج الاتصال بعت الأرشيف لبرّا' },
          type: 'domain',
          content: `${ACT4.exfilVia} (.sync --push db-export.tgz, Mar 13 03:49)`,
          links: ['ev.l16.archive'],
        },
      ],
    },
    {
      id: 'last',
      prompt: {
        en: 'Lines starting with # are Unix timestamps (seconds since 1970). At what time (HH:MM UTC) did the LAST command in that file run?',
        ar: 'الأسطر اللي بتبلّش بـ # هي طوابع وقت يونكس (ثواني من سنة 1970). الساعة كم (HH:MM UTC) انشغّل آخر أمر بالملف؟',
      },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:49', '03:49:12'] },
      wrong: { en: 'Take the number above the last command and run: date -d @<number>', ar: 'خذ الرقم اللي فوق آخر أمر وشغّل: date -d @<الرقم>' },
    },
    {
      id: 'off',
      prompt: { en: 'The file stops there, but the session went on. Which command switched the history file off?', ar: 'الملف بيوقف هون، بس الجلسة كمّلت. أي أمر طفّى ملف السجل؟' },
      placeholder: 'command',
      validator: { kind: 'answer', accept: ['unset HISTFILE'] },
      wrong: {
        en: 'The history file cannot show it. /etc/profile.d tells you where a second copy of every command goes.',
        ar: 'ملف السجل ما بيقدر يورجيك إياه. /etc/profile.d بيحكيلك وين بتروح نسخة ثانية من كل أمر.',
      },
    },
    {
      id: 'after',
      prompt: { en: 'What did j.ortiz delete as root after that?', ar: 'شو حذف j.ortiz بصلاحيات root بعدها؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.archive, 'db-export.tgz'] },
      wrong: { en: 'Read the rest of the session in the second copy, after the line that switched history off.', ar: 'اقرأ باقي الجلسة بالنسخة الثانية، بعد السطر اللي طفّى السجل.' },
      grants: [
        {
          id: 'ev.l18.cleanup',
          title: { en: 'History switched off, archive deleted', ar: 'السجل انطفى والأرشيف انحذف' },
          type: 'artifact',
          content: `unset HISTFILE 03:51, sudo rm -f ${ACT4.archive} 03:52 (caught by ${CMDLOG})`,
          links: ['ev.l18.exfil', 'ev.l04.account'],
        },
      ],
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: `Hidden files need ls -a: ls -a /home/${ACT4.secondAccount}`, ar: `الملفات المخفية بدها ls -a: ls -a /home/${ACT4.secondAccount}` }, cost: 15 },
    {
      tier: 'direction',
      text: {
        en: `Convert a timestamp with date -d @${unixTime('2026-03-13T03:45:22Z')}. Then read /etc/profile.d/helix-history.sh: every command is also copied somewhere else.`,
        ar: `حوّل الطابع الزمني بـ date -d @${unixTime('2026-03-13T03:45:22Z')}. وبعدين اقرأ /etc/profile.d/helix-history.sh: كل أمر بينسخ لمكان ثاني كمان.`,
      },
      cost: 30,
    },
    { tier: 'near-solution', text: { en: `grep ${ACT4.secondAccount} ${CMDLOG} shows the whole session, including what the history file lost.`, ar: `grep ${ACT4.secondAccount} ${CMDLOG} بيورجيك الجلسة كاملة، مع اللي ضاع من ملف السجل.` }, cost: 45 },
  ],
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'Bash keeps each user\'s commands in ~/.bash_history. By default it has no times and is written only when the shell exits. Helix\'s hardening added a Unix timestamp to every line, saved it after each command, and sent a copy of every command to syslog, which is forwarded to a central server. Attackers switch history off with unset HISTFILE, history -c or HISTSIZE=0 (MITRE T1070.003), so a history that stops suddenly, in the middle of the night, is a clue. Here the attacker silenced one record and the second record, kept off the box, caught the rest.',
      ar: 'باش بيحفظ أوامر كل مستخدم بـ ~/.bash_history. بالوضع الافتراضي ما فيه أوقات، وما بينكتب إلا لما تسكّر الطرفية. تقوية Helix حطّت طابع وقت يونكس على كل سطر، وحفظته بعد كل أمر، وبعتت نسخة من كل أمر لـ syslog اللي بيتحوّل لسيرفر مركزي. المهاجمين بيطفّوا السجل بـ unset HISTFILE أو history -c أو HISTSIZE=0 (MITRE T1070.003)، فالسجل اللي بيوقف فجأة، بنص الليل، هو دليل بحد ذاته. هون المهاجم سكّت سجل واحد، والسجل الثاني اللي برّا الجهاز مسك الباقي.',
    },
    realTools: ['HISTTIMEFORMAT + PROMPT_COMMAND', 'rsyslog forwarding', 'auditd (execve rules)', 'Sysmon for Linux', 'date -d @epoch'],
    takeaway: {
      en: 'Shell history helps until someone turns it off. Timestamp it, make HISTFILE readonly, and keep a second copy the user cannot touch.',
      ar: 'سجل الأوامر بيفيد لحد ما حدا يطفّيه. حط عليه أوقات، وخلّي HISTFILE للقراءة بس (readonly)، وخلّي نسخة ثانية المستخدم ما بيقدر يلمسها.',
    },
    source: 'MITRE ATT&CK T1070.003 (Clear Command History) and T1105 (Ingress Tool Transfer); GNU Bash manual (HISTFILE, HISTTIMEFORMAT); NIST SP 800-92',
  },
  echo: {
    intro: { en: 'Logs showed the doors they used. The history shows every step in between, until it goes quiet.', ar: 'السجلات ورّتنا الأبواب اللي استخدموها. وسجل الأوامر بيورّينا كل خطوة بيناتهم، لحد ما يسكت.' },
    success: {
      en: `They pushed the archive out through ${ACT4.exfilDomain}, switched history off and deleted the evidence. The second copy saw it all. Next: something on this box runs on a timer.`,
      ar: `بعتوا الأرشيف لبرّا عن طريق ${ACT4.exfilDomain}، وطفّوا السجل وحذفوا الدليل. والنسخة الثانية شافت كل إشي. الجاي: في إشي على هالجهاز بيشتغل على مؤقّت.`,
    },
  },
  solution: `ls -a /home/j.ortiz; cat .bash_history -> .sync --push ... --via ${ACT4.exfilVia}. Last #epoch -> date -d @${unixTime(ACT4.pushedAt)} = 03:49. /etc/profile.d -> ${CMDLOG}: grep j.ortiz -> unset HISTFILE 03:51:40, sudo rm -f ${ACT4.archive} 03:52:15.`,
  selfTest: [
    { run: `ls -a /home/${ACT4.secondAccount}`, includes: '.bash_history' },
    { run: `cat ${HIST}`, includes: ACT4.exfilVia },
    { run: `date -d @${unixTime(ACT4.pushedAt)}`, includes: '03:49:12' },
    { run: `grep -c unset ${HIST}`, includes: '0' },
    { run: `grep ${ACT4.secondAccount} ${CMDLOG}`, includes: 'unset HISTFILE' },
    { run: `grep "rm -f" ${CMDLOG}`, includes: ACT4.archive },
  ],
};

export default level;
