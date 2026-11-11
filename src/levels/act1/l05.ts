import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const H = ACT1.home;
const BIN = '/opt/helix/bin';

const level: LevelConfig = {
  id: 'L05',
  requires: { levels: ['L04'], evidence: ['ev.l03.handle', 'ev.l03.beacon', 'ev.l04.account', 'ev.l02.time'] },
  briefing: {
    en: 'MINI-BOSS. The attacker had two accounts and a beacon. But beacons die on reboot, so how do they plan to stay? Find the file they changed to keep access. Use `find` to filter the whole system by permissions, time and owner, and connect it to what you already know.',
    ar: 'تحدّي الفصل. المهاجم يملك حسابين وبرنامج اتصال. لكن هذا البرنامج يتوقف عند إعادة تشغيل الجهاز، فكيف ينوي البقاء؟ اعثر على الملف الذي عدّله ليحافظ على وصوله. استخدم الأمر `find` لتصفية ملفات النظام كله حسب الصلاحيات والوقت والمالك، واربط النتيجة بما تعرفه.',
  },
  mission: {
    goal: {
      en: 'Find the file the attacker changed so that his program starts again by itself.',
      ar: 'اعثر على الملف الذي عدّله المهاجم ليعود برنامجه إلى العمل تلقائياً.',
    },
    investigate: [
      {
        en: 'Files that any user can write to: `find / -type f -perm -002`.',
        ar: 'الملفات التي يستطيع أي مستخدم الكتابة فيها: `find / -type f -perm -002`.',
      },
      {
        en: 'Files changed on Mar 13, the night of the break-in: `find / -type f -newermt 2026-03-13`.',
        ar: 'الملفات التي عُدّلت في 13 آذار، ليلة الاختراق: `find / -type f -newermt 2026-03-13`.',
      },
      {
        en: 'The file `/etc/cron.d/helix-backup`: it shows which script root runs every hour.',
        ar: 'الملف `/etc/cron.d/helix-backup`: يبيّن أي سكربت يشغّله root كل ساعة.',
      },
    ],
    success: {
      en: 'You have named the changed script and the account that owns it, and explained why it is dangerous. The Act 1 summary is pinned to your board.',
      ar: 'تكون قد حدّدت السكربت المعدَّل والحساب الذي يملكه، وشرحت سبب خطورته. تُثبَّت خلاصة الفصل الأول على لوحة الأدلة.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: ACT1.user,
    host: ACT1.host,
    home: H,
    cwd: '/',
    now: ACT1.now,
    files: {
      [`${BIN}/deploy.sh`]: { content: '#!/bin/bash\n# deploy release\nrsync -a build/ /srv/portal/\n', mode: '-rwxr-xr-x', owner: 'root', mtime: '2025-11-02T10:00:00Z' },
      [`${BIN}/rotate-logs.sh`]: { content: '#!/bin/bash\nlogrotate /etc/logrotate.conf\n', mode: '-rwxr-xr-x', owner: 'root', mtime: '2025-12-18T10:00:00Z' },
      [ACT1.persistence]: {
        content: `#!/bin/bash\n# nightly backup of the portal database\ntar -czf /backup/portal-$(date +%F).tgz /srv/portal/db\n${ACT1.stagingDir}/.sync --daemon  # ${ACT1.handle}\n`,
        mode: '-rwxrwxrwx',
        owner: ACT1.secondAccount,
        mtime: '2026-03-13T03:38:00Z',
      },
      '/etc/cron.d/helix-backup': { content: `# m h dom mon dow user command\n0 * * * * root ${ACT1.persistence}\n`, owner: 'root', mtime: '2025-10-01T09:00:00Z' },
      '/srv/shared/drop/README.txt': { content: 'Team drop folder. Anyone can write here.\n', mode: '-rw-rw-rw-', owner: 'm.chen', mtime: '2026-01-20T12:00:00Z' },
      [`${H}/.bash_history`]: { content: 'ls\ncd Documents\nvim notes.txt\n', mode: '-rw-------', mtime: '2026-03-13T03:20:00Z' },
      [`/home/${ACT1.secondAccount}/report-draft.txt`]: { content: 'Q1 numbers - draft\n', owner: ACT1.secondAccount, mtime: '2026-03-10T15:00:00Z' },
      [`${ACT1.stagingDir}/.sync`]: { content: `target = ${ACT1.attackerIp}\n# -- ${ACT1.handle}\n`, mtime: '2026-03-13T03:16:00Z' },
    },
  },
  objectives: [
    {
      id: 'perm',
      prompt: {
        en: 'In the terminal, use `find` to list every file on the system that ANY user can write to.',
        ar: 'في الطرفية، استخدم `find` لعرض كل ملف في النظام يستطيع أي مستخدم الكتابة فيه.',
      },
      validator: { kind: 'command', pattern: '^find\\b.*-perm\\s+(-|/)?0?(002|666|777)' },
    },
    {
      id: 'file',
      prompt: {
        en: 'Which of them was modified during the intrusion (Mar 13) and is executed automatically?',
        ar: 'أي ملف منها عُدّل وقت الاختراق (13 آذار) ويعمل تلقائياً؟',
      },
      placeholder: '/path/to/file',
      validator: { kind: 'answer', accept: [ACT1.persistence] },
      wrong: {
        en: 'World-writable alone is not enough: one of them is an old shared folder. Check WHEN each was modified (`ls -l` or `find -newermt`) and what runs it (/etc/cron.d).',
        ar: 'كون الملف قابلاً للكتابة من الجميع لا يكفي: أحد الملفين ملف مشترك قديم. تحقق متى عُدّل كل ملف (`ls -l` أو `find -newermt`) وما الذي يشغّله (`/etc/cron.d`).',
      },
      grants: [
        {
          id: 'ev.l05.persistence',
          title: { en: 'Persistence: hijacked cron script', ar: 'وسيلة البقاء: سكربت مجدول تم العبث به' },
          type: 'file',
          content: `${ACT1.persistence} (777, run hourly as root)`,
          links: ['ev.l03.beacon', 'ev.l03.handle'],
        },
      ],
    },
    {
      id: 'owner',
      prompt: {
        en: 'Which account owns that script now? (`ls -l` shows the owner. You met this account in the last case.)',
        ar: 'أي حساب يملك هذا السكربت الآن؟ (الأمر `ls -l` يعرض المالك، وقد رأيت هذا الحساب في القضية السابقة.)',
      },
      validator: { kind: 'evidence', evidence: 'ev.l04.account' },
      wrong: { en: '`ls -l` shows the owner in the third column.', ar: 'الأمر `ls -l` يعرض اسم المالك في العمود الثالث.' },
    },
    {
      id: 'why',
      prompt: {
        en: 'Why is a world-writable script that root runs every hour so dangerous?',
        ar: 'لماذا يُعدّ خطيراً جداً أن يوجد سكربت يستطيع الجميع الكتابة فيه ويشغّله root كل ساعة؟',
      },
      validator: {
        kind: 'choice',
        correct: 'root',
        options: [
          { id: 'disk', label: { en: 'It fills the disk with backups', ar: 'لأنه يملأ القرص بالنسخ الاحتياطية' } },
          { id: 'root', label: { en: 'Any user can add commands that will then run as root', ar: 'لأن أي مستخدم يستطيع إضافة أوامر ستعمل لاحقاً بصلاحيات root' } },
          { id: 'slow', label: { en: 'It slows the server down', ar: 'لأنه يُبطئ الخادم' } },
          { id: 'logs', label: { en: 'It deletes the logs', ar: 'لأنه يحذف السجلات' } },
        ],
      },
      wrong: { en: 'Think about who can write it and who executes it.', ar: 'فكّر: من يستطيع الكتابة في الملف؟ ومن يشغّله؟' },
      grants: [
        {
          id: 'ev.l05.summary',
          title: { en: 'Act 1 conclusion', ar: 'خلاصة الفصل الأول' },
          type: 'note',
          content: `${ACT1.handle} used ${ACT1.secondAccount} to plant hourly root persistence`,
          links: ['ev.l05.persistence', 'ev.l04.account', 'ev.l02.time'],
        },
      ],
    },
  ],
  guide: {
    nudge: {
      en: '`man find`: look at `-perm`, `-newermt` and `-user`. Combine tests to narrow the results.',
      ar: 'راجع `man find` وانظر إلى الخيارات `-perm` و`-newermt` و`-user`. اجمع الشروط لتقليل النتائج.',
    },
    clue: {
      en: '`find / -type f -perm -002` lists world-writable files. Then `find / -type f -newermt 2026-03-13` lists recent changes. Which path is in BOTH?',
      ar: 'الأمر `find / -type f -perm -002` يعرض الملفات التي يستطيع أي مستخدم الكتابة فيها، والأمر `find / -type f -newermt 2026-03-13` يعرض ما تغيّر حديثاً. أي مسار يظهر في النتيجتين معاً؟',
    },
    steps: {
      perm: {
        en: 'Type `find / -type f -perm -002`. It lists the files that every user can write to.',
        ar: 'اكتب `find / -type f -perm -002`. يعرض هذا الأمر الملفات التي يستطيع كل مستخدم الكتابة فيها.',
      },
      file: {
        en: 'Two files appear. `/srv/shared/drop/README.txt` is an old shared file. Run `ls -l /opt/helix/bin`: `backup.sh` was changed on Mar 13 at 03:38, and `cat /etc/cron.d/helix-backup` shows that root runs it every hour. The answer is `/opt/helix/bin/backup.sh`.',
        ar: 'يظهر ملفان. الملف `/srv/shared/drop/README.txt` ملف مشترك قديم. شغّل `ls -l /opt/helix/bin`: الملف `backup.sh` عُدّل في 13 آذار الساعة 03:38، والأمر `cat /etc/cron.d/helix-backup` يبيّن أن root يشغّله كل ساعة. الجواب هو `/opt/helix/bin/backup.sh`.',
      },
      owner: {
        en: 'In the output of `ls -l /opt/helix/bin`, the third column is the owner: `j.ortiz`, the second account from the last case.',
        ar: 'في ناتج `ls -l /opt/helix/bin` العمود الثالث هو المالك: `j.ortiz`، وهو الحساب الثاني من القضية السابقة.',
      },
      why: {
        en: 'Choose "Any user can add commands that will then run as root". Anyone can write to the script, and root is the one who runs it.',
        ar: 'اختر «لأن أي مستخدم يستطيع إضافة أوامر ستعمل لاحقاً بصلاحيات root». الجميع يستطيع الكتابة في السكربت، و root هو من يشغّله.',
      },
    },
    concept: {
      en: 'To stay inside a system, attackers hide in things that already run by themselves, such as scheduled jobs. A script that everyone can change and that root runs gives full control to anyone. Check who can write to every scheduled script.',
      ar: 'ليبقى المهاجم داخل النظام، يختبئ في أشياء تعمل تلقائياً، مثل المهام المجدولة. السكربت الذي يستطيع الجميع تعديله ويشغّله root يمنح التحكم الكامل لأي شخص. راجع من يستطيع الكتابة في كل سكربت مجدول.',
    },
  },
  rewards: { points: 200, achievement: 'act1-clear' },
  debrief: {
    concept: {
      en: '`find` filters the filesystem by metadata: -perm (permissions), -newermt / -mtime (time), -user (owner), -name (pattern). Permissions like -rwxrwxrwx (777) mean any user can modify the file. If root runs it from cron, anyone can turn it into root-level persistence. Intersecting two filters (writable AND recently changed) is how you cut thousands of files down to one.',
      ar: 'الأمر `find` يصفّي ملفات النظام حسب بياناتها الوصفية: `-perm` للصلاحيات، و`-newermt` و`-mtime` للوقت، و`-user` للمالك، و`-name` للاسم. الصلاحيات `-rwxrwxrwx` (أي 777) تعني أن أي مستخدم يستطيع تعديل الملف. وإذا كان root يشغّله من cron، فأي شخص يستطيع تحويله إلى وسيلة بقاء بصلاحيات root. الجمع بين شرطين (قابل للكتابة وعُدّل حديثاً) يختصر آلاف الملفات إلى ملف واحد.',
    },
    realTools: ['find', 'stat', 'ls -l', 'Lynis', 'auditd'],
    takeaway: {
      en: 'Persistence hides inside things that are SUPPOSED to run. Audit permissions on every scheduled script.',
      ar: 'وسائل البقاء تختبئ داخل أشياء يُفترض أن تعمل أصلاً. راجع صلاحيات كل سكربت مجدول.',
    },
    source: 'MITRE ATT&CK T1053.003 (Scheduled Task/Job: Cron); CIS Benchmark: ensure no world-writable files',
  },
  echo: {
    intro: {
      en: 'A beacon alone dies on reboot. If gh0st wants to stay, something must restart it. Find what changed, when, and who changed it.',
      ar: 'برنامج الاتصال وحده يتوقف عند إعادة التشغيل. إذا أراد gh0st أن يبقى، فلا بد من شيء يعيد تشغيله. اعرف ما الذي تغيّر، ومتى، ومن غيّره.',
    },
    success: {
      en: 'Act 1 closed. gh0st got in through a sticky note, sprayed passwords, and hid inside a backup job. But a handle is not a name. Yet.',
      ar: 'انتهى الفصل الأول. دخل gh0st بفضل ورقة لاصقة، ثم جرّب كلمات مرور على الحسابات، واختبأ داخل مهمة نسخ احتياطي. لكن الاسم المستعار ليس اسماً حقيقياً. ليس بعد.',
    },
  },
  ghost: {
    taunt: { en: 'You found my little backup. Did you check who taught me the password?', ar: 'وجدتَ نسختي الاحتياطية الصغيرة. لكن هل سألت نفسك: من الذي أعطاني كلمة المرور؟' },
  },
  solution: 'find / -type f -perm -002 -> backup.sh + /srv/shared/drop/README.txt(old). find / -type f -newermt 2026-03-13 -> backup.sh, .bash_history(600), .sync. Intersection: /opt/helix/bin/backup.sh owned by j.ortiz; cron.d runs it hourly as root.',
  selfTest: [
    { run: 'find / -type f -perm -002', includes: ACT1.persistence },
    { run: 'find / -type f -perm -002', includes: '/srv/shared/drop/README.txt' },
    { run: 'find / -type f -newermt 2026-03-13', includes: ACT1.persistence },
    { run: `ls -l ${BIN}`, includes: ACT1.secondAccount },
    { run: 'cat /etc/cron.d/helix-backup', includes: ACT1.persistence },
  ],
};

export default level;
