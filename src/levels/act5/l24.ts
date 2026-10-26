import type { LevelConfig } from '../../engine/schema';
import { elfStub, gzipStub, pngStub } from '../lib/binary';
import { ACT5, fontsConf, X11_HELPER_TEXT } from './story';

const STASH = `${ACT5.image}${ACT5.stash}`;

const level: LevelConfig = {
  id: 'L24',
  requires: { levels: ['L23'], evidence: ['ev.l21.mailbox', 'ev.l10.second-victim'] },
  briefing: {
    en: `Back to the stash on ws07. The photo showed us a plan; gh0st also wrote notes. One file in this folder holds more than it shows: on screen it looks perfectly normal, but its size and its bytes disagree with what you see. A terminal obeys invisible control characters, and those can paint over text. Find the file, find the trick, read the message.`,
    ar: `رجعنا على مخبأ ws07. الصورة ورّتنا خطة؛ و gh0st كتب ملاحظات كمان. ملف واحد بهالمجلد فيه أكثر من اللي بيبيّن: على الشاشة شكله طبيعي تماماً، بس حجمه وبايتاته مش متفقين مع اللي بتشوفه. الطرفية بتطيع رموز تحكم مخفية، وهاي بتقدر ترسم فوق النص. لاقي الملف، واعرف الحيلة، واقرأ الرسالة.`,
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
      prompt: { en: 'Which file in the stash hides more text than it shows?', ar: 'أي ملف بالمخبأ مخبّي نص أكثر من اللي بيبيّن؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: ['fonts.conf', `${STASH}/fonts.conf`] },
      wrong: {
        en: 'Compare what you see with what is there: file * describes line endings, wc -c counts bytes. A normal copy of the same file lives in ~/.config/fontconfig in Samir\'s home.',
        ar: 'قارن اللي بتشوفه مع اللي موجود: ‏file * بيوصف نهايات الأسطر، و wc -c بيعدّ البايتات. ونسخة طبيعية من نفس الملف موجودة بـ ‎~/.config/fontconfig بمجلد سمير.',
      },
    },
    {
      id: 'char',
      prompt: { en: 'Which invisible character hides the message?', ar: 'أي رمز مخفي بيخبّي الرسالة؟' },
      placeholder: 'character name',
      validator: { kind: 'answer', accept: ['carriage return', 'cr', '\\r', '^m', '0d', '0x0d', 'return', 'carriage-return'] },
      derived: 'cat -A shows ^M (carriage return, byte 0d) in the middle of three lines; file says "with CR, LF line terminators".',
      wrong: {
        en: 'cat -A makes control characters visible: ^I is a tab, ^M is ... ? (xxd shows the byte too).',
        ar: 'cat -A بيورجيك رموز التحكم: ‏^I هو tab، و ^M هو ... ؟ (و xxd بيورجيك البايت كمان).',
      },
    },
    {
      id: 'next',
      prompt: { en: 'Read the hidden lines. Which computer is next on gh0st\'s list?', ar: 'اقرأ الأسطر المخفية. أي جهاز الجاي على قائمة gh0st؟' },
      placeholder: 'host name',
      validator: { kind: 'answer', accept: ['FIN03', ACT5.finHost] },
      wrong: { en: 'cat -v fonts.conf prints the hidden comments instead of letting the visible lines paint over them.', ar: 'cat -v fonts.conf بيطبع التعليقات المخفية بدل ما يخلّي الأسطر الظاهرة ترسم فوقها.' },
      grants: [
        {
          id: 'ev.l24.next',
          title: { en: "gh0st's hidden note: the finance PC is next", ar: 'ملاحظة gh0st المخفية: جهاز المالية هو الجاي' },
          type: 'note',
          content: `fonts.conf (CR-hidden, 08:47 UTC): next ${ACT5.finHost} as m.chen over RDP; sync.exe named svchost, start at logon; then wipe ws07`,
          links: ['ev.l21.mailbox', 'ev.l10.second-victim'],
        },
      ],
    },
    {
      id: 'how',
      prompt: { en: 'According to the note, how will the program keep running on that computer?', ar: 'حسب الملاحظة، كيف البرنامج رح يضل شغّال على هداك الجهاز؟' },
      validator: {
        kind: 'choice',
        correct: 'logon',
        options: [
          { id: 'cron', label: { en: 'A cron job every 10 minutes', ar: 'مهمة cron كل 10 دقايق' } },
          { id: 'logon', label: { en: 'Named like svchost and started at every user logon', ar: 'باسم شبه svchost وبيشتغل كل ما المستخدم يسجّل دخول' } },
          { id: 'service', label: { en: 'Installed as a Windows service called sync', ar: 'منصّب كخدمة ويندوز اسمها sync' } },
        ],
      },
      wrong: { en: 'Read the third hidden line again, word by word.', ar: 'اقرأ السطر المخفي الثالث مرة ثانية، كلمة كلمة.' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'file * and wc -c * : one file is "with CR, LF line terminators" and is much bigger than it looks.', ar: '‏file * و wc -c * : ملف واحد "with CR, LF line terminators" وحجمه أكبر بكثير من شكله.' }, cost: 15 },
    {
      tier: 'direction',
      text: {
        en: 'A carriage return (\\r, byte 0d) sends the cursor back to the start of the line, so the text after it prints over the text before it. cat -A shows it as ^M.',
        ar: 'رمز الرجوع (\\r، البايت 0d) بيرجّع المؤشر لأول السطر، فالنص اللي بعده بينطبع فوق النص اللي قبله. ‏cat -A بيورجيه ^M.',
      },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'cat -A fonts.conf: four comments hide behind ^M. They name the next computer, the account, the disguise and when it starts.',
        ar: 'cat -A fonts.conf: في أربع تعليقات مخبّاية ورا ^M. بتذكر الجهاز الجاي، والحساب، والتنكّر، وإيمتى بيشتغل.',
      },
      cost: 45,
    },
  ],
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'A terminal does not just print characters, it obeys control characters. A carriage return (\\r, 0x0d) moves the cursor back to the start of the line, so whatever follows prints over what came before: the file holds both, the screen shows one. The same idea hides text in logs (log injection), in source code (Unicode direction marks, the "Trojan Source" issue, CVE-2021-42574) and in terminal output (escape sequences). Investigators never trust the screen alone: cat -A or cat -v, xxd and file show what is really in the bytes, and comparing sizes with a known-good copy shows that something is there. Hiding content like this is MITRE T1027 (Obfuscated Files or Information).',
      ar: 'الطرفية ما بتطبع الحروف بس، هي بتطيع رموز التحكم. رمز الرجوع (\\r، ‏0x0d) بيرجّع المؤشر لأول السطر، فاللي بعده بينطبع فوق اللي قبله: الملف فيه الاثنين، والشاشة بتورجيك واحد. نفس الفكرة بتخبّي نص بالسجلات (حقن السجلات)، وبالكود المصدري (علامات اتجاه يونيكود، مشكلة "Trojan Source"، ‏CVE-2021-42574)، وبمخرجات الطرفية (تسلسلات escape). المحقق ما بيثق بالشاشة لحالها: ‏cat -A أو cat -v، و xxd، و file بيورّوا الموجود فعلاً بالبايتات، ومقارنة الحجم مع نسخة سليمة بتورجيك إنه في إشي. تخبية المحتوى بهالطريقة هي MITRE T1027 (تمويه الملفات أو المعلومات).',
    },
    realTools: ['cat -A / cat -v', 'xxd / hexdump', 'less (shows ^M)', 'grep -P "\\r"', 'editors with "show invisibles"'],
    takeaway: {
      en: 'The screen is an interpretation. When text matters, look at the bytes.',
      ar: 'الشاشة مجرد تفسير. لما النص يكون مهم، اطّلع على البايتات.',
    },
    source: 'MITRE ATT&CK T1027 (Obfuscated Files or Information); ECMA-48 (control functions, CR); Boucher & Anderson, "Trojan Source" (2021), CVE-2021-42574',
  },
  echo: {
    intro: { en: 'Everything here looks innocent. That is exactly what bothers me.', ar: 'كل إشي هون شكله بريء. وهاد بالضبط اللي مضايقني.' },
    success: {
      en: `Their to-do list, painted over with carriage returns: ${ACT5.finHost}, Mei's account, a fake svchost. Act 6 starts there.`,
      ar: `قائمة مهامهم، مرسوم فوقها برموز رجوع: ${ACT5.finHost}، وحساب مي، و svchost مزيّف. الفصل السادس بيبلّش من هناك.`,
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
