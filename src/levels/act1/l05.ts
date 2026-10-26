import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const H = ACT1.home;
const BIN = '/opt/helix/bin';

const level: LevelConfig = {
  id: 'L05',
  requires: { levels: ['L04'], evidence: ['ev.l03.handle', 'ev.l03.beacon', 'ev.l04.account', 'ev.l02.time'] },
  briefing: {
    en: 'MINI-BOSS. The attacker had two accounts and a beacon. But beacons die on reboot, so how do they plan to stay? Find the file they changed to keep access. Use `find` to filter the whole system by permissions, time and owner, and connect it to what you already know.',
    ar: 'زعيم الفصل. المهاجم معه حسابين وبرنامج اتصال. بس برنامج الاتصال بيموت مع إعادة التشغيل، فكيف ناوي يضل؟ لاقي الملف اللي غيّره ليحافظ على وصوله. استخدم `find` لتفلتر النظام كله حسب الصلاحيات والوقت والمالك، واربطه باللي بتعرفه.',
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
        en: 'Find every WORLD-WRITABLE file on the system (writable by any user).',
        ar: 'لاقي كل ملف قابل للكتابة من أي مستخدم على النظام.',
      },
      validator: { kind: 'command', pattern: '^find\\b.*-perm\\s+(-|/)?0?(002|666|777)' },
    },
    {
      id: 'file',
      prompt: {
        en: 'Which of them was modified during the intrusion (Mar 13) and is executed automatically?',
        ar: 'أي واحد منهم تعدّل وقت الاختراق (13 آذار) وبيتشغّل تلقائياً؟',
      },
      placeholder: '/path/to/file',
      validator: { kind: 'answer', accept: [ACT1.persistence] },
      wrong: {
        en: 'World-writable alone is not enough: one of them is an old shared folder. Check WHEN each was modified (`ls -l` or `find -newermt`) and what runs it (/etc/cron.d).',
        ar: 'قابل للكتابة لحاله مش كفاية: واحد منهم مجلد مشترك قديم. شوف إمتى تعدّل كل واحد (`ls -l` أو `find -newermt`) وشو اللي بيشغّله (/etc/cron.d).',
      },
      grants: [
        {
          id: 'ev.l05.persistence',
          title: { en: 'Persistence: hijacked cron script', ar: 'الاستمرارية: سكريبت cron مخطوف' },
          type: 'file',
          content: `${ACT1.persistence} (777, run hourly as root)`,
          links: ['ev.l03.beacon', 'ev.l03.handle'],
        },
      ],
    },
    {
      id: 'owner',
      prompt: {
        en: 'Which account modified it? It should match one of your earlier findings.',
        ar: 'أي حساب عدّله؟ لازم يطابق واحد من اكتشافاتك السابقة.',
      },
      validator: { kind: 'evidence', evidence: 'ev.l04.account' },
      wrong: { en: '`ls -l` shows the owner in the third column.', ar: '`ls -l` بيوري المالك بالعمود الثالث.' },
    },
    {
      id: 'why',
      prompt: {
        en: 'Why is a world-writable script that root runs every hour so dangerous?',
        ar: 'ليش سكريبت قابل للكتابة من الكل وبيشغّله root كل ساعة خطير لهالدرجة؟',
      },
      validator: {
        kind: 'choice',
        correct: 'root',
        options: [
          { id: 'disk', label: { en: 'It fills the disk with backups', ar: 'بيعبّي القرص بالنسخ الاحتياطية' } },
          { id: 'root', label: { en: 'Any user can add commands that will then run as root', ar: 'أي مستخدم بيقدر يضيف أوامر رح تتشغّل بعدين بصلاحيات root' } },
          { id: 'slow', label: { en: 'It slows the server down', ar: 'بيبطّئ السيرفر' } },
          { id: 'logs', label: { en: 'It deletes the logs', ar: 'بيمسح السجلات' } },
        ],
      },
      wrong: { en: 'Think about who can write it and who executes it.', ar: 'فكّر مين بيقدر يكتب فيه ومين بيشغّله.' },
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
  hints: [
    {
      tier: 'nudge',
      text: {
        en: '`man find` — look at -perm, -newermt and -user. Combine tests to narrow down.',
        ar: '`man find`؛ شوف -perm و -newermt و -user. اجمع الشروط لتضيّق النتائج.',
      },
      cost: 20,
    },
    {
      tier: 'direction',
      text: {
        en: '`find / -type f -perm -002` lists world-writable files. Then `find / -type f -newermt 2026-03-13` lists recent changes. Which path is in BOTH?',
        ar: '`find / -type f -perm -002` بيعرض الملفات القابلة للكتابة من الكل، و `find / -type f -newermt 2026-03-13` بيعرض التعديلات الحديثة. أي مسار موجود بالاثنين؟',
      },
      cost: 40,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Look in /opt/helix/bin with `ls -l`, and read /etc/cron.d/helix-backup to see what runs every hour.',
        ar: 'اتطلّع على /opt/helix/bin بـ `ls -l`، واقرأ /etc/cron.d/helix-backup لتعرف شو بيتشغّل كل ساعة.',
      },
      cost: 60,
    },
  ],
  rewards: { points: 200, achievement: 'act1-clear' },
  debrief: {
    concept: {
      en: '`find` filters the filesystem by metadata: -perm (permissions), -newermt / -mtime (time), -user (owner), -name (pattern). Permissions like -rwxrwxrwx (777) mean any user can modify the file. If root runs it from cron, anyone can turn it into root-level persistence. Intersecting two filters (writable AND recently changed) is how you cut thousands of files down to one.',
      ar: '`find` بيفلتر نظام الملفات حسب البيانات الوصفية: -perm (الصلاحيات)، -newermt و -mtime (الوقت)، -user (المالك)، -name (النمط). صلاحيات مثل -rwxrwxrwx (777) معناها أي مستخدم بيقدر يعدّل الملف، وإذا root بيشغّله من cron، فأي حدا بيقدر يحوّله لاستمرارية بصلاحيات root. تقاطع فلترين (قابل للكتابة وتعدّل حديثاً) هو اللي بينزّل آلاف الملفات لملف واحد.',
    },
    realTools: ['find', 'stat', 'ls -l', 'Lynis', 'auditd'],
    takeaway: {
      en: 'Persistence hides inside things that are SUPPOSED to run. Audit permissions on every scheduled script.',
      ar: 'الاستمرارية بتتخبّى جوّا أشياء المفروض تتشغّل أصلاً. دقّق صلاحيات كل سكريبت مجدول.',
    },
    source: 'MITRE ATT&CK T1053.003 (Scheduled Task/Job: Cron); CIS Benchmark: ensure no world-writable files',
  },
  echo: {
    intro: {
      en: 'A beacon alone dies on reboot. If gh0st wants to stay, something must restart it. Find what changed, when, and who changed it.',
      ar: 'برنامج الاتصال لحاله بيموت مع إعادة التشغيل. إذا gh0st بدّه يضل، لازم في شي بيرجّع يشغّله. لاقي شو تغيّر، وإمتى، ومين غيّره.',
    },
    success: {
      en: 'Act 1 closed. gh0st got in through a sticky note, sprayed passwords, and hid inside a backup job. But a handle is not a name. Yet.',
      ar: 'خلص الفصل الأول. gh0st دخل من ورقة لاصقة، رشّ كلمات مرور، وتخبّى جوّا مهمة نسخ احتياطي. بس الاسم المستعار مش اسم حقيقي. لسا.',
    },
  },
  ghost: {
    taunt: { en: 'You found my little backup. Did you check who taught me the password?', ar: 'لقيت نسختي الاحتياطية الصغيرة. بس هل فحصت مين علّمني كلمة السر؟' },
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
