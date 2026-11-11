import type { LevelConfig } from '../../engine/schema';
import { elfStub, gzipStub, pngStub } from '../lib/binary';
import { ACT5, fontsConf, X11_HELPER_TEXT } from './story';

const STASH = `${ACT5.image}${ACT5.stash}`;

const level: LevelConfig = {
  id: 'L24',
  requires: { levels: ['L23'], evidence: ['ev.l21.mailbox', 'ev.l10.second-victim'] },
  briefing: {
    en: `Back to the stash on ws07. The photo showed us a plan; gh0st also wrote notes. One file in this folder holds more than it shows: on screen it looks perfectly normal, but its size and its bytes disagree with what you see. A terminal obeys invisible control characters, and those can paint over text. Find the file, find the trick, read the message.`,
    ar: 'نعود إلى المخبأ على الجهاز ws07. الصورة كشفت لنا خطة، وقد كتب gh0st ملاحظات أيضاً. ملف واحد في هذا المجلد يحتوي على أكثر مما يعرض: يبدو على الشاشة طبيعياً تماماً، لكن حجمه وبايتاته لا يوافقان ما تراه. الطرفية تنفّذ رموز تحكم غير مرئية، وهذه الرموز تستطيع أن ترسم فوق النص. اعثر على الملف، واعرف الحيلة، واقرأ الرسالة.',
  },
  mission: {
    goal: {
      en: "Find the file in the stash that hides text behind invisible characters, and read the attacker's hidden note.",
      ar: 'اعثر في المخبأ على الملف الذي يُخفي نصاً خلف رموز غير مرئية، واقرأ الملاحظة التي أخفاها المهاجم.',
    },
    investigate: [
      {
        en: 'The output of `file *` and `wc -c *` in the stash: one text file has unusual line endings and is bigger than it looks.',
        ar: 'ناتج الأمرين `file *` و`wc -c *` في المخبأ: ملف نصي واحد له نهايات أسطر غير معتادة وحجمه أكبر مما يبدو.',
      },
      {
        en: 'The same file shown with `cat -A`: control characters become visible, for example `^M`.',
        ar: 'الملف نفسه عند عرضه بالأمر `cat -A`: رموز التحكم تصبح مرئية، مثل `^M`.',
      },
      {
        en: 'The hidden comment lines: the next computer, the account and how the program will start.',
        ar: 'أسطر التعليقات المخفية: الجهاز التالي، والحساب، وطريقة تشغيل البرنامج.',
      },
    ],
    success: {
      en: 'You have named the file, the invisible character, the next target computer and how the program would keep running there.',
      ar: 'تكون قد كتبت اسم الملف، واسم الرمز غير المرئي، والجهاز المستهدف التالي، وعرفت كيف كان البرنامج سيبقى يعمل هناك.',
    },
  },
  apps: ['case', 'terminal', 'hex', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT5.soc,
    home: '/home/a.nasser',
    cwd: STASH,
    now: '2026-03-15T13:00:00Z',
    files: {
      [`${STASH}/fonts.conf`]: { content: fontsConf(), owner: 's.haddad', mtime: ACT5.noteAt },
      [`${STASH}/fonts.cache-7`]: { content: gzipStub(ACT5.mailbox, ACT5.mailboxStagedAt, 320, 2101), owner: 's.haddad', mtime: ACT5.mailboxStagedAt },
      [`${STASH}/x11-icon.png`]: {
        content: elfStub(X11_HELPER_TEXT),
        mode: '-rwxr-xr-x',
        owner: 's.haddad',
        mtime: '2026-03-13T03:58:24Z',
      },
      [`${STASH}/screen-0313.png`]: { content: pngStub(1920, 1080, 160, 2102), owner: 's.haddad', mtime: '2026-03-13T04:02:51Z' },
      [`${ACT5.image}/home/s.haddad/.config/fontconfig/fonts.conf`]: {
        content: '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <dir>~/.local/share/fonts</dir>\n</fontconfig>\n',
        owner: 's.haddad',
        mtime: '2025-04-02T10:00:00Z',
      },
    },
  },
  objectives: [
    {
      id: 'file',
      prompt: { en: 'Which file in the stash hides more text than it shows?', ar: 'أي ملف في المخبأ يُخفي نصاً أكثر مما يعرض؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['fonts.conf', `${STASH}/fonts.conf`] },
      wrong: {
        en: "Compare what you see with what is there: `file *` describes line endings, `wc -c` counts bytes. A normal copy of the same file lives in `.config/fontconfig` in Samir's home.",
        ar: 'قارن ما تراه بما هو موجود: الأمر `file *` يصف نهايات الأسطر، والأمر `wc -c` يعدّ البايتات. وتوجد نسخة طبيعية من الملف نفسه في المجلد `.config/fontconfig` داخل مجلد سمير الرئيسي.',
      },
    },
    {
      id: 'char',
      prompt: { en: 'Which invisible character hides the message?', ar: 'أي رمز غير مرئي يُخفي الرسالة؟ (اكتب اسمه بالإنجليزية)' },
      placeholder: 'character name',
      validator: { kind: 'answer', accept: ['carriage return', 'cr', '\\r', '^m', '0d', '0x0d', 'return', 'carriage-return'] },
      derived: 'cat -A shows ^M (carriage return, byte 0d) in the middle of three lines; file says "with CR, LF line terminators".',
      wrong: {
        en: '`cat -A` makes control characters visible: `^I` is a tab, and `^M` is ... ? (`xxd` shows the byte too.)',
        ar: 'الأمر `cat -A` يُظهر رموز التحكم: الرمز `^I` هو المسافة الجدولية، فما الرمز `^M`؟ (والأمر `xxd` يعرض البايت أيضاً.)',
      },
    },
    {
      id: 'next',
      prompt: { en: 'Read the hidden lines. Which computer is next on gh0st\'s list?', ar: 'اقرأ الأسطر المخفية. أي جهاز هو التالي في قائمة gh0st؟' },
      placeholder: 'host name',
      validator: { kind: 'answer', accept: ['FIN03', ACT5.finHost] },
      wrong: { en: '`cat -v fonts.conf` prints the hidden comments instead of letting the visible lines paint over them.', ar: 'الأمر `cat -v fonts.conf` يطبع التعليقات المخفية بدل أن تُرسم الأسطر الظاهرة فوقها.' },
      grants: [
        {
          id: 'ev.l24.next',
          title: { en: "gh0st's hidden note: the finance PC is next", ar: 'ملاحظة gh0st المخفية: جهاز المالية هو التالي' },
          type: 'note',
          content: `fonts.conf (CR-hidden, 08:47 UTC): next ${ACT5.finHost} as m.chen over RDP; sync.exe named svchost, start at logon; then wipe ws07`,
          links: ['ev.l21.mailbox', 'ev.l10.second-victim'],
        },
      ],
    },
    {
      id: 'how',
      prompt: { en: 'According to the note, how will the program keep running on that computer?', ar: 'حسب الملاحظة، كيف سيبقى البرنامج يعمل على ذلك الجهاز؟' },
      validator: {
        kind: 'choice',
        correct: 'logon',
        options: [
          { id: 'cron', label: { en: 'A cron job every 10 minutes', ar: 'مهمة cron كل 10 دقائق' } },
          { id: 'logon', label: { en: 'Named like svchost and started at every user logon', ar: 'باسم يشبه svchost، ويعمل عند كل تسجيل دخول للمستخدم' } },
          { id: 'service', label: { en: 'Installed as a Windows service called sync', ar: 'يُثبَّت كخدمة ويندوز اسمها sync' } },
        ],
      },
      wrong: { en: 'Read the third hidden line again, word by word.', ar: 'اقرأ السطر المخفي الثالث مرة أخرى، كلمة كلمة.' },
    },
  ],
  guide: {
    nudge: {
      en: 'Run `file *` and `wc -c *`: one file is "with CR, LF line terminators" and is much bigger than it looks.',
      ar: 'شغّل `file *` و`wc -c *`: ملف واحد يوصف بالعبارة `with CR, LF line terminators` وحجمه أكبر كثيراً مما يبدو.',
    },
    clue: {
      en: 'A carriage return (`\\r`, byte `0d`) sends the cursor back to the start of the line, so the text after it prints over the text before it. `cat -A` shows it as `^M`.',
      ar: 'رمز الرجوع إلى أول السطر (`\\r`، أي البايت `0d`) يعيد المؤشر إلى بداية السطر، فيُطبع النص الذي بعده فوق النص الذي قبله. الأمر `cat -A` يعرضه بالشكل `^M`.',
    },
    steps: {
      file: {
        en: 'Run `file *`. `fonts.conf` is described as "with CR, LF line terminators", which is unusual on Linux. Type `fonts.conf`.',
        ar: 'شغّل `file *`. الملف `fonts.conf` يوصف بالعبارة `with CR, LF line terminators`، وهذا غير معتاد في لينكس. اكتب `fonts.conf`.',
      },
      char: {
        en: 'Run `cat -A fonts.conf`. A `^M` appears in the middle of some lines. `^M` is the carriage return. Type `carriage return`.',
        ar: 'شغّل `cat -A fonts.conf`. يظهر الرمز `^M` في وسط بعض الأسطر. هذا الرمز هو الرجوع إلى أول السطر. اكتب `carriage return`.',
      },
      next: {
        en: 'Run `cat -v fonts.conf` to print the hidden comments. One of them says `next: FIN03 as m.chen, rdp`. Type `FIN03`.',
        ar: 'شغّل `cat -v fonts.conf` لطباعة التعليقات المخفية. أحدها فيه `next: FIN03 as m.chen, rdp`. اكتب `FIN03`.',
      },
      how: {
        en: 'The next hidden comment says `sync.exe as svchost, logon`. Choose "Named like svchost and started at every user logon".',
        ar: 'التعليق المخفي التالي فيه `sync.exe as svchost, logon`. اختر الجواب الذي يذكر اسماً يشبه svchost وتشغيلاً عند كل تسجيل دخول.',
      },
    },
    concept: {
      en: 'A terminal does not only print characters, it also obeys control characters. A carriage return lets later text paint over earlier text, so the screen shows one thing while the file holds two. When text matters, look at the bytes with `cat -A` or `xxd`.',
      ar: 'الطرفية لا تطبع الحروف فقط، بل تنفّذ رموز التحكم أيضاً. رمز الرجوع إلى أول السطر يجعل النص اللاحق يُرسم فوق النص السابق، فتعرض الشاشة شيئاً ويحتوي الملف على شيئين. عندما يكون النص مهماً، افحص البايتات بالأمر `cat -A` أو `xxd`.',
    },
  },
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'A terminal does not just print characters, it obeys control characters. A carriage return (\\r, 0x0d) moves the cursor back to the start of the line, so whatever follows prints over what came before: the file holds both, the screen shows one. The same idea hides text in logs (log injection), in source code (Unicode direction marks, the "Trojan Source" issue, CVE-2021-42574) and in terminal output (escape sequences). Investigators never trust the screen alone: cat -A or cat -v, xxd and file show what is really in the bytes, and comparing sizes with a known-good copy shows that something is there. Hiding content like this is MITRE T1027 (Obfuscated Files or Information).',
      ar: 'الطرفية لا تطبع الحروف فقط، بل تنفّذ رموز التحكم. رمز الرجوع إلى أول السطر (`\\r`، أي `0x0d`) يعيد المؤشر إلى بداية السطر، فيُطبع ما بعده فوق ما قبله: الملف يحتوي على النصين، والشاشة تعرض واحداً. الفكرة نفسها تُخفي نصاً في السجلات (حقن السجلات)، وفي الشيفرة المصدرية (علامات اتجاه يونيكود، وهي مشكلة Trojan Source ورقمها CVE-2021-42574)، وفي مخرجات الطرفية. المحقق لا يثق بالشاشة وحدها: الأوامر `cat -A` و`cat -v` و`xxd` و`file` تعرض ما في البايتات فعلاً، ومقارنة الحجم بنسخة سليمة تكشف أن هناك شيئاً زائداً. إخفاء المحتوى بهذه الطريقة يصنَّف ضمن MITRE T1027.',
    },
    realTools: ['cat -A / cat -v', 'xxd / hexdump', 'less (shows ^M)', 'grep -P "\\r"', 'editors with "show invisibles"'],
    takeaway: {
      en: 'The screen is an interpretation. When text matters, look at the bytes.',
      ar: 'الشاشة مجرد تفسير. عندما يكون النص مهماً، انظر إلى البايتات.',
    },
    source: 'MITRE ATT&CK T1027 (Obfuscated Files or Information); ECMA-48 (control functions, CR); Boucher & Anderson, "Trojan Source" (2021), CVE-2021-42574',
  },
  echo: {
    intro: { en: 'Everything here looks innocent. That is exactly what bothers me.', ar: 'كل شيء هنا يبدو بريئاً. وهذا بالتحديد ما يقلقني.' },
    success: {
      en: `Their to-do list, painted over with carriage returns: ${ACT5.finHost}, Mei's account, a fake svchost. Act 6 starts there.`,
      ar: 'قائمة مهامهم كانت مغطّاة برموز الرجوع إلى أول السطر: الجهاز `HELIX-FIN03`، وحساب مي، وبرنامج svchost مزيّف. من هناك يبدأ الفصل السادس.',
    },
  },
  solution: 'file * -> fonts.conf "with CR, LF line terminators"; wc -c shows it is bigger than the clean copy in ~s.haddad/.config/fontconfig. cat -A fonts.conf -> ^M = carriage return; hidden: next FIN03 as m.chen (rdp), sync.exe as svchost, logon, wipe ws07. Choice: logon.',
  selfTest: [
    { run: 'file *', includes: 'fonts.conf: XML 1.0 document, ASCII text, with CR, LF line terminators' },
    { run: 'cat -A fonts.conf', includes: '^M' },
    { run: 'cat -v fonts.conf', includes: 'next: FIN03 as m.chen, rdp' },
    { run: 'cat -v fonts.conf', includes: 'sync.exe as svchost, logon' },
    { run: 'xxd -s 64 -l 64 fonts.conf', includes: '0d' },
    { run: `wc -c fonts.conf ${ACT5.image}/home/s.haddad/.config/fontconfig/fonts.conf`, includes: 'fonts.conf' },
  ],
};

export default level;
