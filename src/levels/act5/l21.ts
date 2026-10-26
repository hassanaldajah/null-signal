import type { LevelConfig } from '../../engine/schema';
import { elfStub, gzipStub, pngStub } from '../lib/binary';
import { ACT5, fontsConf, X11_HELPER_TEXT } from './story';

const STASH = `${ACT5.image}${ACT5.stash}`;

const level: LevelConfig = {
  id: 'L21',
  requires: { levels: ['L20'], evidence: ['ev.l10.second-victim', 'ev.l03.artifact'] },
  briefing: {
    en: `Act 5: the files themselves. We imaged helix-ws07 and found a second hidden folder, ${ACT5.stash}: /var/tmp survives a reboot, /tmp does not. The names inside look harmless, but a name is just a label anyone can change. A file's real type is written in its first bytes. Find out what these files really are.`,
    ar: `الفصل الخامس: الملفات نفسها. أخذنا نسخة من قرص helix-ws07 ولقينا مجلد مخفي ثاني، ${ACT5.stash}: مجلد /var/tmp بيضل بعد إعادة التشغيل، و /tmp لأ. الأسماء جوّا شكلها بريئة، بس الاسم مجرد ملصق أي حدا بيقدر يغيّره. النوع الحقيقي للملف مكتوب بأول بايتات فيه. اعرف شو هالملفات فعلاً.`,
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
      prompt: { en: 'Which file in the hidden folder is really a compressed archive?', ar: 'أي ملف بالمجلد المخفي هو بالحقيقة أرشيف مضغوط؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['fonts.cache-7', `${STASH}/fonts.cache-7`] },
      wrong: {
        en: 'Names lie. The folder starts with a dot (ls -a), and inside it `file *` reads the first bytes of every file.',
        ar: 'الأسماء بتكذب. المجلد اسمه بيبلّش بنقطة (ls -a)، وجوّاه `file *` بيقرأ أول بايتات كل ملف.',
      },
    },
    {
      id: 'name',
      prompt: { en: 'gzip keeps the name a file had when it was compressed. What was this one called?', ar: 'gzip بيحتفظ بالاسم اللي كان للملف لما انضغط. شو كان اسم هاد؟' },
      placeholder: 'name.tar',
      validator: { kind: 'answer', accept: [ACT5.mailbox] },
      wrong: { en: 'Run file on the archive: it prints was "…".', ar: 'شغّل file على الأرشيف: بيطبع was "…".' },
      grants: [
        {
          id: 'ev.l21.mailbox',
          title: { en: "Mei Chen's mailbox staged for exfiltration", ar: 'صندوق بريد مي تشين مجهّز للتسريب' },
          type: 'file',
          content: `ws07:${ACT5.stash}/fonts.cache-7 = gzip of ${ACT5.mailbox} (Mar 13 08:41)`,
          links: ['ev.l10.second-victim', 'ev.l03.artifact'],
        },
      ],
    },
    {
      id: 'program',
      prompt: { en: 'Which file is a Linux program dressed up as a picture?', ar: 'أي ملف هو برنامج لينكس متنكّر بشكل صورة؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['x11-icon.png', `${STASH}/x11-icon.png`] },
      wrong: { en: 'Linux programs start with the bytes 7f 45 4c 46 (".ELF"). Compare with xxd -l 16 <file>.', ar: 'برامج لينكس بتبلّش بالبايتات 7f 45 4c 46 (".ELF"). قارن بـ xxd -l 16 <الملف>.' },
    },
    {
      id: 'why',
      prompt: { en: 'Why rename files like this?', ar: 'ليش يغيّروا أسماء الملفات هيك؟' },
      validator: {
        kind: 'choice',
        correct: 'label',
        options: [
          { id: 'size', label: { en: 'To make the files smaller', ar: 'عشان الملفات تصير أصغر' } },
          { id: 'label', label: { en: 'To slip past people and tools that judge a file by its name or extension', ar: 'عشان يمرقوا من الناس والأدوات اللي بتحكم على الملف من اسمه أو امتداده' } },
          { id: 'linux', label: { en: 'Linux needs the right extension to open a file', ar: 'لينكس بحاجة للامتداد الصح ليفتح الملف' } },
        ],
      },
      wrong: { en: 'Did the rename change a single byte inside the file?', ar: 'تغيير الاسم غيّر ولا بايت جوّا الملف؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: `The folder is hidden: ls -a ${ACT5.image}/var/tmp, then cd into it and run file *`, ar: `المجلد مخفي: ls -a ${ACT5.image}/var/tmp، وبعدين ادخله بـ cd وشغّل file *` }, cost: 15 },
    {
      tier: 'direction',
      text: {
        en: 'file reads magic bytes. For a closer look: xxd -l 16 <file>. 1f 8b = gzip, 7f 45 4c 46 = ELF program, 89 50 4e 47 = PNG.',
        ar: 'file بيقرأ البايتات السحرية. لنظرة أقرب: xxd -l 16 <الملف>. ‏1f 8b = gzip، و 7f 45 4c 46 = برنامج ELF، و 89 50 4e 47 = PNG.',
      },
      cost: 30,
    },
    { tier: 'near-solution', text: { en: `fonts.cache-7 is gzip and was "${ACT5.mailbox}". x11-icon.png starts with 7f 45 4c 46: a program.`, ar: `fonts.cache-7 هو gzip وكان اسمه "${ACT5.mailbox}". و x11-icon.png بيبلّش بـ 7f 45 4c 46: برنامج.` }, cost: 45 },
  ],
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: "A file's name and extension are just a label anyone can change. Its real type is in its first bytes, the magic number or file signature: ff d8 ff for JPEG, 89 50 4e 47 for PNG, 25 50 44 46 (%PDF) for PDF, 1f 8b for gzip, 7f 45 4c 46 for Linux programs (ELF), 4d 5a (MZ) for Windows programs. Attackers rename files so they look boring to people and to tools that trust extensions (MITRE T1036.008). gzip even keeps the original name inside its header, so a renamed archive can still tell you what it was.",
      ar: 'اسم الملف وامتداده مجرد ملصق أي حدا بيقدر يغيّره. نوعه الحقيقي موجود بأول بايتات فيه، اللي اسمها الرقم السحري أو توقيع الملف: ff d8 ff لـ JPEG، و 89 50 4e 47 لـ PNG، و 25 50 44 46 (%PDF) لـ PDF، و 1f 8b لـ gzip، و 7f 45 4c 46 لبرامج لينكس (ELF)، و 4d 5a (MZ) لبرامج ويندوز. المهاجمين بيغيّروا الأسماء عشان الملفات تبيّن عادية للناس وللأدوات اللي بتصدّق الامتداد (MITRE T1036.008). وكمان gzip بيحتفظ بالاسم الأصلي جوّا رأس الملف، فالأرشيف المعاد تسميته بيقدر يحكيلك شو كان.',
    },
    realTools: ['file', 'xxd / hexdump', 'TrID', 'YARA', 'DLP content inspection'],
    takeaway: {
      en: 'Trust bytes, not names. Check the signature before you decide what a file is.',
      ar: 'صدّق البايتات، مش الأسماء. افحص التوقيع قبل ما تقرّر شو الملف.',
    },
    source: 'MITRE ATT&CK T1036.008 (Masquerade File Type); RFC 1952 (GZIP file format); Gary Kessler, File Signatures Table',
  },
  echo: {
    intro: { en: "New act, new rule: names lie, bytes don't. Let's open gh0st's suitcase.", ar: 'فصل جديد وقاعدة جديدة: الأسماء بتكذب والبايتات لأ. خلّينا نفتح شنطة gh0st.' },
    success: {
      en: "Mei Chen's whole mailbox, disguised as a font cache, next to a program pretending to be an icon. Next: what did they try to throw away?",
      ar: 'صندوق بريد مي تشين كامل، متنكّر كملف خطوط، وجنبه برنامج عامل حاله أيقونة. الجاي: شو حاولوا يرموا؟',
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
