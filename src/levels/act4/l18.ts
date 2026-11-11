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
    ar: 'نعود إلى الخادم `helix-db01`. السجل `auth.log` بيّن ما شغّله `j.ortiz` بصلاحيات root، أما سجل الأوامر فيبيّن كل ما كتبه. هذا السجل محفوظ في ملف مخفي داخل مجلده الرئيسي. اقرأه، وتتبّع ملف الأرشيف، وانتبه أين يتوقف السجل: السجل الذي يصمت فجأة دليل هو الآخر.',
  },
  mission: {
    goal: {
      en: 'Read everything the attacker typed on the database server, including what he tried to hide.',
      ar: 'اقرأ كل ما كتبه المهاجم على خادم قاعدة البيانات، ومنه ما حاول إخفاءه.',
    },
    investigate: [
      {
        en: 'The hidden file `/home/j.ortiz/.bash_history`: the commands he typed, each under a line that starts with `#` and holds a time.',
        ar: 'الملف المخفي `/home/j.ortiz/.bash_history`: فيه الأوامر التي كتبها، وفوق كل أمر سطر يبدأ بالرمز `#` وفيه الوقت.',
      },
      {
        en: 'The file `/etc/profile.d/helix-history.sh`. It says where a second copy of every command is kept.',
        ar: 'الملف `/etc/profile.d/helix-history.sh`: يبيّن أين تُحفظ نسخة ثانية من كل أمر.',
      },
      {
        en: 'The file `/var/log/commands.log`: the second copy, which the attacker could not switch off.',
        ar: 'الملف `/var/log/commands.log`: النسخة الثانية التي لم يستطع المهاجم إيقافها.',
      },
    ],
    success: {
      en: 'You have the domain the archive was sent to, the time of the last saved command, the command that switched history off, and what was deleted afterwards.',
      ar: 'تكون قد عرفت النطاق الذي أُرسل إليه الأرشيف، ووقت آخر أمر محفوظ، والأمر الذي أوقف السجل، وما حُذف بعد ذلك.',
    },
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
      prompt: { en: 'Read the shell history of `j.ortiz` (a hidden file in his home folder). Which domain did the beacon push the archive to?', ar: 'اقرأ سجل أوامر `j.ortiz` (ملف مخفي في مجلده الرئيسي). إلى أي نطاق أرسل برنامج الاتصال ملف الأرشيف؟' },
      placeholder: 'name.example',
      validator: { kind: 'answer', accept: [ACT4.exfilVia, ACT4.exfilDomain] },
      wrong: {
        en: 'The history file starts with a dot, so plain ls hides it. Look for the line that uses the archive.',
        ar: 'اسم ملف السجل يبدأ بنقطة، فالأمر `ls` العادي يُخفيه. ابحث عن السطر الذي يستخدم ملف الأرشيف.',
      },
      grants: [
        {
          id: 'ev.l18.exfil',
          title: { en: 'Archive pushed out by the beacon', ar: 'برنامج الاتصال أرسل الأرشيف إلى الخارج' },
          type: 'domain',
          content: `${ACT4.exfilVia} (.sync --push db-export.tgz, Mar 13 03:49)`,
          links: ['ev.l16.archive'],
        },
      ],
    },
    {
      id: 'last',
      prompt: {
        en: 'Lines that start with `#` are Unix timestamps (seconds since 1970). At what time (HH:MM, UTC) did the LAST command in that file run?',
        ar: 'الأسطر التي تبدأ بالرمز `#` طوابع زمنية بصيغة يونكس (عدد الثواني منذ عام 1970). في أي ساعة نُفّذ آخر أمر في الملف؟ (بتوقيت UTC وبصيغة HH:MM)',
      },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:49', '03:49:12'] },
      wrong: { en: 'Take the number above the last command and run `date -d @NUMBER`, with the number in place of `NUMBER`.', ar: 'خذ الرقم المكتوب فوق آخر أمر وشغّل `date -d @NUMBER` بوضعه مكان `NUMBER`.' },
    },
    {
      id: 'off',
      prompt: { en: 'The file stops there, but the session went on. Which command switched the history file off?', ar: 'الملف يتوقف هنا، لكن الجلسة استمرت. أي أمر أوقف ملف السجل؟' },
      placeholder: 'command',
      validator: { kind: 'answer', accept: ['unset HISTFILE'] },
      wrong: {
        en: 'The history file cannot show it. The folder `/etc/profile.d` tells you where a second copy of every command goes.',
        ar: 'ملف السجل نفسه لا يستطيع أن يعرض لك ذلك. المجلد `/etc/profile.d` يخبرك أين تُحفظ نسخة ثانية من كل أمر.',
      },
    },
    {
      id: 'after',
      prompt: { en: 'What did `j.ortiz` delete as root after that?', ar: 'ماذا حذف `j.ortiz` بصلاحيات root بعد ذلك؟' },
      placeholder: '/path',
      validator: { kind: 'answer', accept: [ACT4.archive, 'db-export.tgz'] },
      wrong: { en: 'Read the rest of the session in the second copy, after the line that switched history off.', ar: 'اقرأ بقية الجلسة في النسخة الثانية، بعد السطر الذي أوقف السجل.' },
      grants: [
        {
          id: 'ev.l18.cleanup',
          title: { en: 'History switched off, archive deleted', ar: 'أُوقف سجل الأوامر وحُذف الأرشيف' },
          type: 'artifact',
          content: `unset HISTFILE 03:51, sudo rm -f ${ACT4.archive} 03:52 (caught by ${CMDLOG})`,
          links: ['ev.l18.exfil', 'ev.l04.account'],
        },
      ],
    },
  ],
  guide: {
    nudge: {
      en: 'Hidden files need `ls -a`: run `ls -a /home/j.ortiz`.',
      ar: 'الملفات المخفية تحتاج إلى الخيار `-a`: شغّل `ls -a /home/j.ortiz`.',
    },
    clue: {
      en: 'Convert a timestamp with `date -d @1773373522`. Then read `/etc/profile.d/helix-history.sh`: every command is also copied somewhere else.',
      ar: 'حوّل الطابع الزمني بالأمر `date -d @1773373522`. ثم اقرأ الملف `/etc/profile.d/helix-history.sh`: كل أمر يُنسخ أيضاً إلى مكان آخر.',
    },
    steps: {
      exfil: {
        en: 'Run `ls -a /home/j.ortiz`, then `cat /home/j.ortiz/.bash_history`. The last command uses `.sync --push` and ends with `--via t.cdn-sync.example`. Type `t.cdn-sync.example`.',
        ar: 'شغّل `ls -a /home/j.ortiz` ثم `cat /home/j.ortiz/.bash_history`. آخر أمر يستخدم `.sync --push` وينتهي بالنص `--via t.cdn-sync.example`. اكتب `t.cdn-sync.example`.',
      },
      last: {
        en: 'The line above that last command is `#1773373752`. Run `date -d @1773373752`. It prints 03:49:12 UTC. Type `03:49`.',
        ar: 'السطر الذي فوق آخر أمر هو `#1773373752`. شغّل `date -d @1773373752` فيطبع الوقت 03:49:12 بتوقيت UTC. اكتب `03:49`.',
      },
      off: {
        en: 'The history file cannot show the command that switched it off. Run `cat /etc/profile.d/helix-history.sh`: a copy of every command goes to `/var/log/commands.log`. Then run `grep j.ortiz /var/log/commands.log`. At 03:51:40 he typed `unset HISTFILE`.',
        ar: 'ملف السجل لا يستطيع أن يعرض الأمر الذي أوقفه. شغّل `cat /etc/profile.d/helix-history.sh`: نسخة من كل أمر تذهب إلى `/var/log/commands.log`. ثم شغّل `grep j.ortiz /var/log/commands.log`. في الساعة 03:51:40 كتب الأمر `unset HISTFILE`.',
      },
      after: {
        en: 'In the same output, the next line (03:52:15) is `sudo rm -f /tmp/.X11-cache/db-export.tgz`. He deleted the archive. Type `/tmp/.X11-cache/db-export.tgz`.',
        ar: 'في الناتج نفسه، السطر التالي (03:52:15) هو `sudo rm -f /tmp/.X11-cache/db-export.tgz`. لقد حذف الأرشيف. اكتب `/tmp/.X11-cache/db-export.tgz`.',
      },
    },
    concept: {
      en: "The shell saves each user's commands in a hidden history file, but the user can switch it off. A history that stops suddenly in the middle of the night is a clue by itself. Keep a second copy of every command in a place the user cannot change.",
      ar: 'الطرفية تحفظ أوامر كل مستخدم في ملف سجل مخفي، لكن المستخدم يستطيع إيقافه. السجل الذي يتوقف فجأة في منتصف الليل دليل في حد ذاته. احتفظ بنسخة ثانية من كل أمر في مكان لا يستطيع المستخدم تغييره.',
    },
  },
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'Bash keeps each user\'s commands in ~/.bash_history. By default it has no times and is written only when the shell exits. Helix\'s hardening added a Unix timestamp to every line, saved it after each command, and sent a copy of every command to syslog, which is forwarded to a central server. Attackers switch history off with unset HISTFILE, history -c or HISTSIZE=0 (MITRE T1070.003), so a history that stops suddenly, in the middle of the night, is a clue. Here the attacker silenced one record and the second record, kept off the box, caught the rest.',
      ar: 'برنامج bash يحفظ أوامر كل مستخدم في الملف `~/.bash_history`. في الوضع الافتراضي لا يسجّل الأوقات، ولا يُكتب إلا عند إغلاق الطرفية. إعدادات الحماية في Helix أضافت طابعاً زمنياً لكل سطر، وحفظت السجل بعد كل أمر، وأرسلت نسخة من كل أمر إلى syslog الذي يُحوَّل إلى خادم مركزي. المهاجمون يوقفون السجل بالأمر `unset HISTFILE` أو `history -c` أو `HISTSIZE=0` (MITRE T1070.003)، ولذلك فالسجل الذي يتوقف فجأة في منتصف الليل دليل في حد ذاته. هنا أسكت المهاجم سجلاً واحداً، والسجل الثاني المحفوظ خارج الجهاز التقط الباقي.',
    },
    realTools: ['HISTTIMEFORMAT + PROMPT_COMMAND', 'rsyslog forwarding', 'auditd (execve rules)', 'Sysmon for Linux', 'date -d @epoch'],
    takeaway: {
      en: 'Shell history helps until someone turns it off. Timestamp it, make HISTFILE readonly, and keep a second copy the user cannot touch.',
      ar: 'سجل الأوامر مفيد إلى أن يوقفه أحد. أضف إليه الأوقات، واجعل `HISTFILE` للقراءة فقط، واحتفظ بنسخة ثانية لا يستطيع المستخدم الوصول إليها.',
    },
    source: 'MITRE ATT&CK T1070.003 (Clear Command History) and T1105 (Ingress Tool Transfer); GNU Bash manual (HISTFILE, HISTTIMEFORMAT); NIST SP 800-92',
  },
  echo: {
    intro: { en: 'Logs showed the doors they used. The history shows every step in between, until it goes quiet.', ar: 'السجلات بيّنت الأبواب التي استخدموها. وسجل الأوامر يبيّن كل خطوة بينها، إلى أن يصمت.' },
    success: {
      en: `They pushed the archive out through ${ACT4.exfilDomain}, switched history off and deleted the evidence. The second copy saw it all. Next: something on this box runs on a timer.`,
      ar: 'أرسلوا الأرشيف إلى الخارج عبر `cdn-sync.example`، ثم أوقفوا سجل الأوامر وحذفوا الدليل. لكن النسخة الثانية سجّلت كل شيء. التالي: شيء في هذا الخادم يعمل وفق مؤقّت.',
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
