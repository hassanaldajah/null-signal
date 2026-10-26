import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const H = ACT1.home;

const level: LevelConfig = {
  id: 'L03',
  requires: { levels: ['L02'], evidence: ['ev.l02.ip'] },
  briefing: {
    en: 'The 03:12 login came from outside. Intruders like to leave tools behind, usually where nobody looks: hidden files (names starting with a dot) in places like /tmp. Find what does not belong.',
    ar: 'دخول الساعة 03:12 كان من برّا. المتسللين بيحبوا يتركوا أدوات وين ما حدا بيتطلّع: ملفات مخفية (أسماؤها بتبلّش بنقطة) بأماكن مثل /tmp. لاقي الشي اللي مش مكانه.',
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
      prompt: { en: 'List /tmp INCLUDING hidden entries.', ar: 'اعرض محتويات /tmp مع الملفات المخفية.' },
      validator: { kind: 'command', pattern: '^ls\\s+(.*\\s)?-[a-zA-Z]*[aA]' },
    },
    {
      id: 'dir',
      prompt: {
        en: 'One hidden folder in /tmp is NOT created by the system. What is its name?',
        ar: 'في مجلد مخفي واحد بـ /tmp مش من النظام. شو اسمه؟',
      },
      placeholder: '.name',
      validator: { kind: 'answer', accept: [ACT1.stagingDir.slice(5), ACT1.stagingDir, `${ACT1.stagingDir}/`] },
      wrong: {
        en: '.X11-unix, .ICE-unix and .font-unix exist on almost every Linux desktop. Which name imitates them?',
        ar: '.X11-unix و .ICE-unix و .font-unix موجودين تقريباً على كل جهاز لينكس فيه واجهة. أي اسم بيقلّدهم؟',
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
      prompt: { en: 'The file inside is signed. What is the author handle?', ar: 'الملف اللي جوّا موقّع. شو اسم الكاتب المستعار؟' },
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
        en: 'Where does this agent connect to? Confirm it against your earlier evidence.',
        ar: 'لوين هالبرنامج بيتصل؟ تأكّد منه مقابل دليلك السابق.',
      },
      placeholder: '0.0.0.0',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: { en: 'Read the "target" line of the config.', ar: 'اقرأ سطر "target" بالإعدادات.' },
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
  hints: [
    {
      tier: 'nudge',
      text: { en: 'Plain `ls` hides names that start with a dot. Check `man ls`.', ar: '`ls` العادي بيخبّي الأسماء اللي بتبلّش بنقطة. شوف `man ls`.' },
      cost: 10,
    },
    {
      tier: 'direction',
      text: {
        en: 'Run `ls -a /tmp`. Compare the hidden folder names with the ones every desktop Linux creates.',
        ar: 'شغّل `ls -a /tmp`. قارن أسماء المجلدات المخفية مع اللي بيعملها كل لينكس فيه واجهة.',
      },
      cost: 20,
    },
    {
      tier: 'near-solution',
      text: {
        en: '.X11-unix is real. .X11-cache only pretends. Try `ls -a /tmp/.X11-cache` then `cat` the file you find.',
        ar: '.X11-unix حقيقي. .X11-cache بس بيتظاهر. جرّب `ls -a /tmp/.X11-cache` وبعدين `cat` للملف اللي بتلاقيه.',
      },
      cost: 35,
    },
  ],
  intel: {
    id: 'intel.act1',
    text: { en: 'gh0st names tools after system components.', ar: 'gh0st بيسمّي أدواته بأسماء مكوّنات النظام.' },
  },
  rewards: { points: 100 },
  debrief: {
    concept: {
      en: 'On Linux, any file or folder whose name starts with "." is hidden from a normal `ls`. It is a convention, not protection: `ls -a` shows everything. Attackers abuse it in writable places like /tmp and /dev/shm, often with names that imitate real system folders.',
      ar: 'بلينكس، أي ملف أو مجلد اسمه بيبلّش بـ "." بيختفي من `ls` العادي. هاد عُرف مش حماية: `ls -a` بيوري كل شي. المهاجمين بيستغلّوه بأماكن قابلة للكتابة مثل /tmp و /dev/shm، وغالباً بأسماء بتقلّد مجلدات النظام الحقيقية.',
    },
    realTools: ['ls -la', 'find / -name ".*"', 'stat', 'Autopsy'],
    takeaway: {
      en: 'A familiar-looking name is not proof of legitimacy. Compare with a known-good baseline.',
      ar: 'الاسم المألوف مش دليل إنه شرعي. قارن دايماً مع نسخة سليمة معروفة.',
    },
    source: 'MITRE ATT&CK T1564.001 (Hidden Files and Directories); T1036 (Masquerading)',
  },
  echo: {
    intro: {
      en: 'If someone came in at 03:12, they probably left something behind. Hidden files are the classic hiding spot.',
      ar: 'إذا حدا دخل الساعة 03:12، غالباً ترك إشي وراه. الملفات المخفية هي المخبأ الكلاسيكي.',
    },
    success: {
      en: 'A name: gh0st. And the same IP from Samir’s ticket. The threads are starting to cross.',
      ar: 'اسم: gh0st. ونفس الـ IP من تذكرة سمير. الخيوط بلّشت تتقاطع.',
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
