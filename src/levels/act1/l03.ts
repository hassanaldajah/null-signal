import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const H = ACT1.home;

const level: LevelConfig = {
  id: 'L03',
  requires: { levels: ['L02'], evidence: ['ev.l02.ip'] },
  briefing: {
    en: 'The 03:12 login came from outside. Intruders like to leave tools behind, usually where nobody looks: hidden files (names starting with a dot) in places like /tmp. Find what does not belong.',
    ar: 'الدخول الذي حدث الساعة 03:12 جاء من خارج الشركة. المتسللون يتركون أدواتهم غالباً في أماكن لا ينظر إليها أحد: ملفات مخفية (أسماؤها تبدأ بنقطة) في مجلدات مثل `/tmp`. اعثر على ما ليس في مكانه.',
  },
  mission: {
    goal: {
      en: 'Find the hidden folder the intruder left in `/tmp` and read the file inside it.',
      ar: 'اعثر على المجلد المخفي الذي تركه المتسلل في `/tmp`، واقرأ الملف الموجود داخله.',
    },
    investigate: [
      {
        en: 'Everything in `/tmp`, including names that start with a dot (hidden names).',
        ar: 'كل ما في `/tmp`، ومنه الأسماء التي تبدأ بنقطة (الأسماء المخفية).',
      },
      {
        en: 'The hidden folder whose name copies a real system folder but is not one.',
        ar: 'المجلد المخفي الذي يقلّد اسمه اسم مجلد حقيقي في النظام، وهو ليس منه.',
      },
      {
        en: 'The file inside that folder: who signed it, and which IP it connects to.',
        ar: 'الملف الموجود داخل ذلك المجلد: من وقّعه؟ وبأي عنوان IP يتصل؟',
      },
    ],
    success: {
      en: "You have named the fake folder, the attacker's nickname and the IP the file connects to. That IP is the same one from Samir's ticket.",
      ar: 'تكون قد كتبت اسم المجلد المزيّف، والاسم المستعار للمهاجم، والعنوان الذي يتصل به الملف. وهذا العنوان هو نفسه الموجود في تذكرة سمير.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'terminal'],
  world: {
    user: ACT1.user,
    host: ACT1.host,
    home: H,
    now: ACT1.now,
    dirs: ['/tmp/.X11-unix', '/tmp/.ICE-unix', '/tmp/.font-unix', `${H}/.cache`],
    files: {
      [`${H}/.bashrc`]: '# ~/.bashrc\nalias ll="ls -la"\nexport EDITOR=vim\n[ -f ~/.bash_aliases ] && . ~/.bash_aliases\n',
      [`${H}/.profile`]: '# ~/.profile: executed by the login shell\n[ -f ~/.bashrc ] && . ~/.bashrc\n',
      [`${H}/.ssh/known_hosts`]: 'helix-gw ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBk7...\n',
      [`${H}/notes.txt`]: 'Remember: rotate backup keys on Friday.\n',
      '/tmp/build-4471.log': 'make: Nothing to be done for `all`.\n',
      '/tmp/session-7f3a.tmp': '',
      [`${ACT1.stagingDir}/.sync`]: {
        content: `# sync agent config - do not remove\ntarget   = ${ACT1.attackerIp}\ninterval = 300\nmode     = quiet\n# -- ${ACT1.handle}\n`,
        mtime: '2026-03-13T03:16:00Z',
      },
    },
  },
  objectives: [
    {
      id: 'reveal',
      prompt: { en: 'In the terminal, list `/tmp` INCLUDING hidden entries.', ar: 'في الطرفية، اعرض محتويات `/tmp` مع الملفات والمجلدات المخفية.' },
      validator: { kind: 'command', pattern: '^ls\\s+(.*\\s)?-[a-zA-Z]*[aA]' },
    },
    {
      id: 'dir',
      prompt: {
        en: 'One hidden folder in `/tmp` was NOT created by the system. What is its name?',
        ar: 'في `/tmp` مجلد مخفي واحد لم ينشئه النظام. ما اسمه؟',
      },
      placeholder: '.name',
      validator: { kind: 'answer', accept: [ACT1.stagingDir.slice(5), ACT1.stagingDir, `${ACT1.stagingDir}/`] },
      wrong: {
        en: '.X11-unix, .ICE-unix and .font-unix exist on almost every Linux desktop. Which name imitates them?',
        ar: 'المجلدات `.X11-unix` و`.ICE-unix` و`.font-unix` موجودة تقريباً في كل جهاز لينكس له واجهة رسومية. أي اسم يقلّدها؟',
      },
      grants: [
        {
          id: 'ev.l03.artifact',
          title: { en: 'Staging folder (look-alike name)', ar: 'مجلد تجهيز باسم مقلَّد' },
          type: 'artifact',
          content: `${ACT1.stagingDir}/.sync`,
        },
      ],
    },
    {
      id: 'handle',
      prompt: { en: 'Read the file inside that folder. It is signed with a nickname. What is it?', ar: 'اقرأ الملف الموجود داخل ذلك المجلد. الملف موقَّع باسم مستعار. ما هو؟' },
      validator: { kind: 'answer', accept: [ACT1.handle], caseSensitive: false },
      grants: [
        {
          id: 'ev.l03.handle',
          title: { en: 'Attacker handle', ar: 'الاسم المستعار للمهاجم' },
          type: 'person',
          content: ACT1.handle,
          links: ['ev.l03.artifact'],
        },
      ],
    },
    {
      id: 'target',
      prompt: {
        en: 'Which IP address does this file connect to? Read its `target` line and compare it with your earlier evidence.',
        ar: 'بأي عنوان IP يتصل هذا الملف؟ اقرأ سطر `target` فيه، ثم قارنه بالدليل الذي وجدته سابقاً.',
      },
      placeholder: '0.0.0.0',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: { en: 'Read the "target" line of the config.', ar: 'اقرأ سطر `target` في ملف الإعدادات.' },
      grants: [
        {
          id: 'ev.l03.beacon',
          title: { en: 'Beacon every 300 s', ar: 'اتصال دوري كل 300 ثانية' },
          type: 'ioc',
          content: `${ACT1.stagingDir}/.sync -> ${ACT1.attackerIp} (interval 300s)`,
          links: ['ev.l02.ip', 'ev.l03.artifact'],
        },
      ],
    },
  ],
  guide: {
    nudge: {
      en: 'Plain `ls` hides names that start with a dot. Check `man ls`.',
      ar: 'الأمر `ls` وحده يُخفي الأسماء التي تبدأ بنقطة. راجع `man ls`.',
    },
    clue: {
      en: 'Run `ls -a /tmp`. Compare the hidden folder names with the ones every desktop Linux creates.',
      ar: 'شغّل `ls -a /tmp`. ثم قارن أسماء المجلدات المخفية بالأسماء التي ينشئها كل نظام لينكس له واجهة رسومية.',
    },
    steps: {
      reveal: {
        en: 'Type `ls -a /tmp`. The `-a` option also shows names that start with a dot.',
        ar: 'اكتب `ls -a /tmp`. الخيار `-a` يعرض أيضاً الأسماء التي تبدأ بنقطة.',
      },
      dir: {
        en: 'Three hidden folders are normal on every Linux desktop: `.X11-unix`, `.ICE-unix` and `.font-unix`. The fourth one, `.X11-cache`, only copies their style. Type `.X11-cache`.',
        ar: 'ثلاثة مجلدات مخفية طبيعية في كل جهاز لينكس له واجهة رسومية: `.X11-unix` و`.ICE-unix` و`.font-unix`. المجلد الرابع `.X11-cache` يقلّد شكلها فقط. اكتب `.X11-cache`.',
      },
      handle: {
        en: 'Run `ls -a /tmp/.X11-cache`, then `cat /tmp/.X11-cache/.sync`. The last line of the file is the signature: `gh0st`.',
        ar: 'شغّل `ls -a /tmp/.X11-cache` ثم `cat /tmp/.X11-cache/.sync`. السطر الأخير في الملف هو التوقيع: `gh0st`.',
      },
      target: {
        en: "In the same file, the `target` line holds the address: `203.0.113.77`. It is the same IP as in Samir's ticket.",
        ar: 'في الملف نفسه، سطر `target` فيه العنوان: `203.0.113.77`. وهو العنوان نفسه الموجود في تذكرة سمير.',
      },
    },
    concept: {
      en: 'A name that starts with a dot is only hidden from a plain `ls`. It is a habit of the system, not protection. Attackers use it and choose names that look like real system folders, so compare with what a clean system has.',
      ar: 'الاسم الذي يبدأ بنقطة يختفي فقط من ناتج `ls` العادي. هذا عُرف في النظام وليس حماية. المهاجمون يستغلونه ويختارون أسماء تشبه مجلدات النظام الحقيقية، فقارن دائماً بما يوجد في نظام سليم.',
    },
  },
  intel: {
    id: 'intel.act1',
    text: { en: 'gh0st names tools after system components.', ar: 'المهاجم gh0st يسمّي أدواته بأسماء مكوّنات النظام.' },
  },
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'On Linux, any file or folder whose name starts with "." is hidden from a normal `ls`. It is a convention, not protection: `ls -a` shows everything. Attackers abuse it in writable places like /tmp and /dev/shm, often with names that imitate real system folders.',
      ar: 'في لينكس، كل ملف أو مجلد يبدأ اسمه بنقطة يختفي من ناتج `ls` العادي. هذا عُرف وليس حماية: الأمر `ls -a` يعرض كل شيء. المهاجمون يستغلون ذلك في المجلدات التي يستطيع الجميع الكتابة فيها، مثل `/tmp` و`/dev/shm`، وغالباً بأسماء تقلّد مجلدات النظام الحقيقية.',
    },
    realTools: ['ls -la', 'find / -name ".*"', 'stat', 'Autopsy'],
    takeaway: {
      en: 'A familiar-looking name is not proof of legitimacy. Compare with a known-good baseline.',
      ar: 'الاسم المألوف ليس دليلاً على أن الملف سليم. قارن دائماً بنسخة سليمة معروفة.',
    },
    source: 'MITRE ATT&CK T1564.001 (Hidden Files and Directories); T1036 (Masquerading)',
  },
  echo: {
    intro: {
      en: 'If someone came in at 03:12, they probably left something behind. Hidden files are the classic hiding spot.',
      ar: 'إذا دخل أحدهم الساعة 03:12، فالأغلب أنه ترك شيئاً وراءه. الملفات المخفية هي المخبأ التقليدي.',
    },
    success: {
      en: 'A name: gh0st. And the same IP from Samir’s ticket. The threads are starting to cross.',
      ar: 'ظهر اسم: gh0st. وظهر العنوان نفسه الذي في تذكرة سمير. بدأت الخيوط تتقاطع.',
    },
  },
  solution: 'ls -a /tmp -> .X11-cache (fake; .X11-unix/.ICE-unix/.font-unix are legit). cat /tmp/.X11-cache/.sync -> gh0st, target 203.0.113.77.',
  selfTest: [
    { run: 'ls -a /tmp', includes: '.X11-cache' },
    { run: 'ls -a /tmp/.X11-cache', includes: '.sync' },
    { run: 'cat /tmp/.X11-cache/.sync', includes: ACT1.handle },
    { run: 'cat /tmp/.X11-cache/.sync', includes: ACT1.attackerIp },
  ],
};

export default level;
