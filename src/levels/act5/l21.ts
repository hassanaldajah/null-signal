import type { LevelConfig } from '../../engine/schema';
import { elfStub, gzipStub, pngStub } from '../lib/binary';
import { ACT5, fontsConf, X11_HELPER_TEXT } from './story';

const STASH = `${ACT5.image}${ACT5.stash}`;

const level: LevelConfig = {
  id: 'L21',
  requires: { levels: ['L20'], evidence: ['ev.l10.second-victim', 'ev.l03.artifact'] },
  briefing: {
    en: `Act 5: the files themselves. We imaged helix-ws07 and found a second hidden folder, ${ACT5.stash}: /var/tmp survives a reboot, /tmp does not. The names inside look harmless, but a name is just a label anyone can change. A file's real type is written in its first bytes. Find out what these files really are.`,
    ar: 'الفصل الخامس: الملفات نفسها. أخذنا نسخة من قرص الجهاز `helix-ws07` ووجدنا مجلداً مخفياً ثانياً هو `/var/tmp/.fontconfig-cache`: المجلد `/var/tmp` يبقى بعد إعادة التشغيل، أما `/tmp` فلا. الأسماء التي بداخله تبدو بريئة، لكن الاسم مجرد ملصق يستطيع أي شخص تغييره. النوع الحقيقي للملف مكتوب في بايتاته الأولى. اعرف ما هي هذه الملفات فعلاً.',
  },
  mission: {
    goal: {
      en: 'Find out what the files in the second hidden folder really are, by reading their first bytes instead of their names.',
      ar: 'اعرف النوع الحقيقي للملفات في المجلد المخفي الثاني، بقراءة بايتاتها الأولى لا أسمائها.',
    },
    investigate: [
      {
        en: 'The hidden folder `var/tmp/.fontconfig-cache` inside the disk image. Use `ls -a` to see it.',
        ar: 'المجلد المخفي `var/tmp/.fontconfig-cache` داخل نسخة القرص. استخدم `ls -a` لتراه.',
      },
      {
        en: 'The output of `file *` inside that folder: the real type of each file.',
        ar: 'ناتج الأمر `file *` داخل ذلك المجلد: النوع الحقيقي لكل ملف.',
      },
      {
        en: 'The first bytes shown by `xxd -l 16 FILE`: `1f 8b` is gzip, `7f 45 4c 46` is a Linux program, `89 50 4e 47` is a PNG picture.',
        ar: 'البايتات الأولى التي يعرضها الأمر `xxd -l 16 FILE`: القيمة `1f 8b` تعني gzip، و`7f 45 4c 46` تعني برنامج لينكس، و`89 50 4e 47` تعني صورة PNG.',
      },
    ],
    success: {
      en: 'You have named the hidden archive and its original name, and the program that pretends to be a picture. One evidence card is pinned.',
      ar: 'تكون قد كتبت اسم الأرشيف المخفي واسمه الأصلي، والبرنامج المتنكّر في شكل صورة. تُثبَّت بطاقة دليل واحدة.',
    },
  },
  apps: ['case', 'terminal', 'hex', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT5.soc,
    home: '/home/a.nasser',
    cwd: ACT5.image,
    now: ACT5.now,
    dirs: [`${ACT5.image}/var/tmp/systemd-private-7c1e2d-chrony.service-hR2k/tmp`],
    files: {
      [`${ACT5.image}/README-image.txt`]: {
        content: `helix-ws07 disk image, acquired 2026-03-14 18:20 UTC by a.nasser. Mounted read-only.\nPaths below this folder are the paths on ws07: ./var/tmp here = /var/tmp on ws07.\n`,
        mtime: '2026-03-14T18:40:00Z',
      },
      [`${ACT5.image}/var/tmp/kdecache-s.haddad/icon-cache.kcache`]: { content: 'KDE icon cache\n', owner: 's.haddad', mtime: '2026-03-11T09:02:00Z' },
      [`${STASH}/fonts.conf`]: {
        content: fontsConf(),
        owner: 's.haddad',
        mtime: ACT5.noteAt,
      },
      [`${STASH}/fonts.cache-7`]: { content: gzipStub(ACT5.mailbox, ACT5.mailboxStagedAt, 320, 2101), owner: 's.haddad', mtime: ACT5.mailboxStagedAt },
      [`${STASH}/x11-icon.png`]: {
        content: elfStub(X11_HELPER_TEXT),
        mode: '-rwxr-xr-x',
        owner: 's.haddad',
        mtime: '2026-03-13T03:58:24Z',
      },
      [`${STASH}/screen-0313.png`]: { content: pngStub(1920, 1080, 160, 2102), owner: 's.haddad', mtime: '2026-03-13T04:02:51Z' },
    },
  },
  objectives: [
    {
      id: 'archive',
      prompt: { en: 'Which file in the hidden folder is really a compressed archive?', ar: 'أي ملف في المجلد المخفي هو في الحقيقة أرشيف مضغوط؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['fonts.cache-7', `${STASH}/fonts.cache-7`] },
      wrong: {
        en: 'Names lie. The folder starts with a dot (ls -a), and inside it `file *` reads the first bytes of every file.',
        ar: 'الأسماء تكذب. اسم المجلد يبدأ بنقطة (استخدم `ls -a`)، وداخله يقرأ الأمر `file *` البايتات الأولى في كل ملف.',
      },
    },
    {
      id: 'name',
      prompt: { en: 'gzip keeps the name a file had when it was compressed. What was this one called?', ar: 'برنامج gzip يحفظ الاسم الذي كان للملف عند ضغطه. ماذا كان اسم هذا الملف؟' },
      placeholder: 'name.tar',
      validator: { kind: 'answer', accept: [ACT5.mailbox] },
      wrong: { en: 'Run file on the archive: it prints was "…".', ar: 'شغّل `file` على الأرشيف: يطبع الاسم بعد كلمة `was`.' },
      grants: [
        {
          id: 'ev.l21.mailbox',
          title: { en: "Mei Chen's mailbox staged for exfiltration", ar: 'صندوق بريد مي تشين مجهَّز للتسريب' },
          type: 'file',
          content: `ws07:${ACT5.stash}/fonts.cache-7 = gzip of ${ACT5.mailbox} (Mar 13 08:41)`,
          links: ['ev.l10.second-victim', 'ev.l03.artifact'],
        },
      ],
    },
    {
      id: 'program',
      prompt: { en: 'Which file is a Linux program dressed up as a picture?', ar: 'أي ملف هو برنامج لينكس متنكّر في شكل صورة؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['x11-icon.png', `${STASH}/x11-icon.png`] },
      wrong: { en: 'Linux programs start with the bytes 7f 45 4c 46 (".ELF"). Compare with xxd -l 16 <file>.', ar: 'برامج لينكس تبدأ بالبايتات `7f 45 4c 46` (أي `.ELF`). قارن بالأمر `xxd -l 16 FILE`.' },
    },
    {
      id: 'why',
      prompt: { en: 'Why rename files like this?', ar: 'لماذا تُغيَّر أسماء الملفات بهذه الطريقة؟' },
      validator: {
        kind: 'choice',
        correct: 'label',
        options: [
          { id: 'size', label: { en: 'To make the files smaller', ar: 'لتصبح الملفات أصغر' } },
          { id: 'label', label: { en: 'To slip past people and tools that judge a file by its name or extension', ar: 'لتمرّ أمام الناس والأدوات التي تحكم على الملف من اسمه أو امتداده' } },
          { id: 'linux', label: { en: 'Linux needs the right extension to open a file', ar: 'لأن لينكس يحتاج إلى الامتداد الصحيح ليفتح الملف' } },
        ],
      },
      wrong: { en: 'Did the rename change a single byte inside the file?', ar: 'هل غيّر تبديل الاسم بايتاً واحداً داخل الملف؟' },
    },
  ],
  guide: {
    nudge: {
      en: 'The folder is hidden: run `ls -a var/tmp`, then `cd` into it and run `file *`.',
      ar: 'المجلد مخفي: شغّل `ls -a var/tmp` ثم ادخل إليه بالأمر `cd` وشغّل `file *`.',
    },
    clue: {
      en: '`file` reads magic bytes. For a closer look, run `xxd -l 16 FILE`. `1f 8b` is gzip, `7f 45 4c 46` is an ELF program, `89 50 4e 47` is PNG.',
      ar: 'الأمر `file` يقرأ البايتات المميِّزة. لنظرة أدق شغّل `xxd -l 16 FILE`. القيمة `1f 8b` تعني gzip، و`7f 45 4c 46` تعني برنامج ELF، و`89 50 4e 47` تعني PNG.',
    },
    steps: {
      archive: {
        en: 'Run `ls -a var/tmp`, then `cd var/tmp/.fontconfig-cache` and `file *`. The line for `fonts.cache-7` says "gzip compressed data". Type `fonts.cache-7`.',
        ar: 'شغّل `ls -a var/tmp` ثم `cd var/tmp/.fontconfig-cache` ثم `file *`. سطر الملف `fonts.cache-7` فيه العبارة `gzip compressed data`. اكتب `fonts.cache-7`.',
      },
      name: {
        en: 'The same line continues with `was "m.chen-mailbox.tar"`. gzip keeps the original name inside the file. Type `m.chen-mailbox.tar`.',
        ar: 'السطر نفسه يكمل بالعبارة `was "m.chen-mailbox.tar"`. برنامج gzip يحفظ الاسم الأصلي داخل الملف. اكتب `m.chen-mailbox.tar`.',
      },
      program: {
        en: 'In the output of `file *`, `x11-icon.png` is reported as ELF, a Linux program. `xxd -l 16 x11-icon.png` starts with `7f45 4c46`. Type `x11-icon.png`.',
        ar: 'في ناتج `file *` يظهر الملف `x11-icon.png` على أنه ELF، أي برنامج لينكس. والأمر `xxd -l 16 x11-icon.png` يبدأ بالقيمة `7f45 4c46`. اكتب `x11-icon.png`.',
      },
      why: {
        en: 'Choose "To slip past people and tools that judge a file by its name or extension". Renaming did not change one byte inside.',
        ar: 'اختر الجواب الذي يقول إن الهدف هو المرور أمام الناس والأدوات التي تحكم على الملف من اسمه أو امتداده. تغيير الاسم لم يغيّر بايتاً واحداً في الداخل.',
      },
    },
    concept: {
      en: "A file's name is a label that anyone can change. Its real type is written in its first bytes, called the file signature. Check the signature with `file` or `xxd` before you decide what a file is.",
      ar: 'اسم الملف ملصق يستطيع أي شخص تغييره. أما نوعه الحقيقي فمكتوب في بايتاته الأولى، وتسمى توقيع الملف. افحص التوقيع بالأمر `file` أو `xxd` قبل أن تحكم على نوع الملف.',
    },
  },
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: "A file's name and extension are just a label anyone can change. Its real type is in its first bytes, the magic number or file signature: ff d8 ff for JPEG, 89 50 4e 47 for PNG, 25 50 44 46 (%PDF) for PDF, 1f 8b for gzip, 7f 45 4c 46 for Linux programs (ELF), 4d 5a (MZ) for Windows programs. Attackers rename files so they look boring to people and to tools that trust extensions (MITRE T1036.008). gzip even keeps the original name inside its header, so a renamed archive can still tell you what it was.",
      ar: 'اسم الملف وامتداده مجرد ملصق يستطيع أي شخص تغييره. نوعه الحقيقي موجود في بايتاته الأولى، وتسمى الرقم المميِّز أو توقيع الملف: `ff d8 ff` لصور JPEG، و`89 50 4e 47` لصور PNG، و`25 50 44 46` (أي `%PDF`) لملفات PDF، و`1f 8b` لملفات gzip، و`7f 45 4c 46` لبرامج لينكس (ELF)، و`4d 5a` (أي `MZ`) لبرامج ويندوز. المهاجمون يغيّرون الأسماء لتبدو الملفات عادية للناس وللأدوات التي تصدّق الامتداد (MITRE T1036.008). وبرنامج gzip يحفظ الاسم الأصلي داخل رأس الملف، فالأرشيف الذي غُيّر اسمه يستطيع أن يخبرك ماذا كان.',
    },
    realTools: ['file', 'xxd / hexdump', 'TrID', 'YARA', 'DLP content inspection'],
    takeaway: {
      en: 'Trust bytes, not names. Check the signature before you decide what a file is.',
      ar: 'صدّق البايتات لا الأسماء. افحص التوقيع قبل أن تحكم على نوع الملف.',
    },
    source: 'MITRE ATT&CK T1036.008 (Masquerade File Type); RFC 1952 (GZIP file format); Gary Kessler, File Signatures Table',
  },
  echo: {
    intro: { en: "New act, new rule: names lie, bytes don't. Let's open gh0st's suitcase.", ar: 'فصل جديد وقاعدة جديدة: الأسماء تكذب والبايتات لا تكذب. لنفتح حقيبة gh0st.' },
    success: {
      en: "Mei Chen's whole mailbox, disguised as a font cache, next to a program pretending to be an icon. Next: what did they try to throw away?",
      ar: 'صندوق بريد مي تشين كاملاً، متنكّراً في شكل ملف خطوط، وبجانبه برنامج يدّعي أنه أيقونة. التالي: ماذا حاولوا أن يرموا؟',
    },
  },
  solution: `ls -a ${ACT5.image}/var/tmp -> .fontconfig-cache; cd there; file * -> fonts.cache-7: gzip, was "${ACT5.mailbox}"; x11-icon.png: ELF (xxd -l 16 -> 7f45 4c46). Choice: label.`,
  selfTest: [
    { run: `ls -a ${ACT5.image}/var/tmp`, includes: '.fontconfig-cache' },
    { run: `cd ${STASH}`, includes: '' },
    { run: 'file *', includes: `fonts.cache-7: gzip compressed data, was "${ACT5.mailbox}"` },
    { run: 'file *', includes: 'x11-icon.png: ELF' },
    { run: 'xxd -l 16 x11-icon.png', includes: '7f45 4c46' },
    { run: 'file screen-0313.png', includes: 'PNG image data' },
  ],
};

export default level;
