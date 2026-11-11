import type { LevelConfig } from '../../engine/schema';
import { ACT3, b64 } from './story';

const VPN = `${ACT3.loot}/vpn.profile`;

const level: LevelConfig = {
  id: 'L11',
  requires: { levels: ['L10'], evidence: ['ev.l03.artifact', 'ev.l10.patient-zero'] },
  briefing: {
    en: 'Back on helix-ws07: next to the beacon, gh0st left a "loot" folder. The values inside look scrambled, but scrambled is not secret. Encoding (like base64) only changes how data is written, and anyone can reverse it. Hashing is one-way. Learn to tell them apart.',
    ar: 'نعود إلى الجهاز `helix-ws07`: بجانب برنامج الاتصال ترك gh0st مجلداً اسمه `loot`. القيم التي بداخله تبدو مبعثرة، لكن المبعثر ليس سرياً. الترميز (مثل base64) يغيّر طريقة كتابة البيانات فقط، وأي شخص يستطيع عكسه. أما الهاش (التجزئة) فيعمل في اتجاه واحد. تعلّم التفريق بينهما.',
  },
  mission: {
    goal: {
      en: 'Read the "scrambled" values in the attacker\'s loot folder and learn the difference between encoding and hashing.',
      ar: 'اقرأ القيم «المبعثرة» في مجلد المسروقات الذي تركه المهاجم، وتعلّم الفرق بين الترميز والهاش.',
    },
    investigate: [
      {
        en: 'The files `vpn.profile` and `mail.profile`: the `auth` line in each one.',
        ar: 'الملفان `vpn.profile` و`mail.profile`: سطر `auth` في كل منهما.',
      },
      {
        en: 'The `README` file. It says how the `auth` value was written.',
        ar: 'الملف `README`: يشرح كيف كُتبت قيمة `auth`.',
      },
      {
        en: 'The output of `sha256sum vpn.profile`: a fingerprint with a fixed length.',
        ar: 'ناتج الأمر `sha256sum vpn.profile`: بصمة لها طول ثابت.',
      },
    ],
    success: {
      en: 'You have named the two accounts found in the files, the length of a SHA-256 value, and the true statement about base64 and hashes.',
      ar: 'تكون قد كتبت اسمي الحسابين الموجودين في الملفين، وطول قيمة SHA-256، واخترت العبارة الصحيحة عن base64 والهاش.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: ACT3.user,
    host: ACT3.host,
    home: ACT3.home,
    cwd: ACT3.loot,
    now: ACT3.now,
    files: {
      [VPN]: `# exported VPN profile\nserver = vpn.${ACT3.domain}\nauth   = ${b64(`${ACT3.user}:${ACT3.password}`)}\n`,
      [`${ACT3.loot}/mail.profile`]: `# exported mail profile\nserver = mail.${ACT3.domain}\nauth   = ${b64(`${ACT3.secondVictim}:Tr0ubadour&3xplore`)}\n`,
      [`${ACT3.loot}/README`]: 'profiles: auth = base64(user:pass)\nintegrity: sha256 of each profile in SHA256SUMS\n',
      [`${ACT3.loot}/SHA256SUMS`]: 'see sha256sum\n',
    },
  },
  objectives: [
    {
      id: 'decode',
      prompt: {
        en: 'Decode the `auth` value in `vpn.profile`. Whose account is it?',
        ar: 'فكّ ترميز قيمة `auth` في الملف `vpn.profile`. لمن هذا الحساب؟',
      },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT3.user] },
      wrong: { en: 'Pipe the value into `base64 -d`: `echo VALUE | base64 -d`.', ar: 'مرّر القيمة إلى الأمر `base64 -d` هكذا: `echo VALUE | base64 -d`.' },
      grants: [
        {
          id: 'ev.l11.loot',
          title: { en: 'Stolen logins in the loot folder', ar: 'بيانات دخول مسروقة في مجلد loot' },
          type: 'credential',
          content: `${ACT3.loot}: base64 user:password for ${ACT3.user} (VPN) and ${ACT3.secondVictim} (mail)`,
          links: ['ev.l03.artifact', 'ev.l10.patient-zero'],
        },
      ],
    },
    {
      id: 'second',
      prompt: { en: 'The other profile, `mail.profile`, holds a second stolen account. Which one?', ar: 'الملف الآخر `mail.profile` فيه حساب مسروق ثانٍ. ما هو؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT3.secondVictim] },
      derived: 'base64 -d of the mail.profile auth value',
      wrong: { en: 'Decode the auth line of mail.profile the same way.', ar: 'فكّ ترميز سطر `auth` في الملف `mail.profile` بالطريقة نفسها.' },
    },
    {
      id: 'checksum',
      prompt: { en: 'Run `sha256sum` on `vpn.profile`. How many hex characters long is the result?', ar: 'شغّل `sha256sum` على الملف `vpn.profile`. كم خانة hex في الناتج؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['64'] },
      derived: 'SHA-256 = 256 bits = 64 hex characters',
      wrong: { en: 'Count the characters before the two spaces. 256 bits / 4 bits per hex character.', ar: 'عُدّ الخانات التي قبل المسافتين. 256 بت مقسومة على 4 بت لكل خانة.' },
    },
    {
      id: 'difference',
      prompt: { en: 'Which statement is true?', ar: 'أي عبارة صحيحة؟' },
      validator: {
        kind: 'choice',
        correct: 'right',
        options: [
          { id: 'enc', label: { en: 'base64 is encryption; without a key nobody can read it', ar: 'الترميز base64 تشفير، ولا أحد يستطيع قراءته دون مفتاح' } },
          { id: 'right', label: { en: 'base64 is reversible by anyone; a hash cannot be turned back into the input', ar: 'الترميز base64 يستطيع أي شخص عكسه، أما الهاش فلا يمكن إرجاعه إلى النص الأصلي' } },
          { id: 'same', label: { en: 'base64 and SHA-256 are both one-way hashes', ar: 'كل من base64 و SHA-256 هاش في اتجاه واحد' } },
          { id: 'hash', label: { en: 'A hash can be decoded with sha256sum -d', ar: 'الهاش يمكن فكّه بالأمر `sha256sum -d`' } },
        ],
      },
      wrong: { en: 'You decoded base64 without any key. Could you do that with the sha256sum output?', ar: 'فككت ترميز base64 دون أي مفتاح. هل تستطيع فعل ذلك مع ناتج `sha256sum`؟' },
    },
  ],
  guide: {
    nudge: {
      en: '`cat vpn.profile`, then `man base64`.',
      ar: 'شغّل `cat vpn.profile` ثم راجع `man base64`.',
    },
    clue: {
      en: 'Copy the text after `auth =` and run `echo TEXT | base64 -d`, with the copied text in place of `TEXT`.',
      ar: 'انسخ النص الذي يأتي بعد `auth =` ثم شغّل `echo TEXT | base64 -d` بوضع النص المنسوخ مكان `TEXT`.',
    },
    steps: {
      decode: {
        en: 'Run `cat vpn.profile` and copy the value after `auth =`. Then run `echo VALUE | base64 -d` with that value. The result has the form user:password. The user before the colon is `s.haddad`.',
        ar: 'شغّل `cat vpn.profile` وانسخ القيمة التي بعد `auth =`. ثم شغّل `echo VALUE | base64 -d` بوضع القيمة مكان `VALUE`. الناتج بصيغة «مستخدم:كلمة مرور». المستخدم الذي قبل النقطتين هو `s.haddad`.',
      },
      second: {
        en: 'Do the same with `cat mail.profile`. The decoded user is `m.chen`.',
        ar: 'افعل الشيء نفسه مع `cat mail.profile`. المستخدم الذي يظهر بعد فكّ الترميز هو `m.chen`.',
      },
      checksum: {
        en: 'Run `sha256sum vpn.profile` and count the characters before the two spaces: 64. SHA-256 is 256 bits, and each hex character holds 4 bits.',
        ar: 'شغّل `sha256sum vpn.profile` وعُدّ الخانات التي قبل المسافتين: 64. طول SHA-256 هو 256 بت، وكل خانة hex تحمل 4 بت.',
      },
      difference: {
        en: 'Choose "base64 is reversible by anyone; a hash cannot be turned back into the input". You decoded base64 with no key, and you cannot do that with the output of `sha256sum`.',
        ar: 'اختر العبارة التي تقول إن base64 يستطيع أي شخص عكسه وإن الهاش لا يمكن إرجاعه. لقد فككت base64 دون مفتاح، ولا تستطيع فعل ذلك مع ناتج `sha256sum`.',
      },
    },
    concept: {
      en: 'Encoding such as base64 only changes how data is written, so anyone can reverse it. A hash is a one-way fingerprint: the same input always gives the same value, but the value cannot be turned back. If you can read something back without a key, treat it as plain text.',
      ar: 'الترميز مثل base64 يغيّر طريقة كتابة البيانات فقط، فيستطيع أي شخص عكسه. أما الهاش فبصمة في اتجاه واحد: المدخل نفسه يعطي دائماً القيمة نفسها، لكن القيمة لا تعود إلى أصلها. كل ما تستطيع قراءته دون مفتاح اعتبره نصاً مكشوفاً.',
    },
  },
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'Encoding (base64, hex, URL encoding) makes data safe to transport, not secret: the method is public and needs no key. Encryption needs a key to reverse. Hashing (SHA-256) is one-way: the same input always gives the same fixed-length digest, which makes it good for integrity checks and for storing passwords (with salt and a slow algorithm). Attackers and lazy software often "hide" credentials with base64, which protects nothing.',
      ar: 'الترميز (base64 أو hex أو ترميز الروابط) يجعل البيانات سهلة النقل، لا سرية: الطريقة معروفة ولا تحتاج إلى مفتاح. التشفير يحتاج إلى مفتاح لعكسه. أما الهاش (مثل SHA-256) فيعمل في اتجاه واحد: المدخل نفسه يعطي دائماً البصمة نفسها وبطول ثابت، وهذا يجعله مناسباً لفحص سلامة الملفات ولتخزين كلمات المرور (مع ملح وخوارزمية بطيئة). المهاجمون والبرامج المهملة «يخفون» بيانات الدخول كثيراً بالترميز base64، وهذا لا يحمي شيئاً.',
    },
    realTools: ['base64', 'CyberChef', 'sha256sum', 'secret scanners (gitleaks, trufflehog)'],
    takeaway: {
      en: 'If it can be read back without a key, treat it as plaintext.',
      ar: 'كل ما يمكن قراءته دون مفتاح اعتبره نصاً مكشوفاً.',
    },
    source: 'RFC 4648 (Base16/32/64 encodings); NIST FIPS 180-4 (Secure Hash Standard)',
  },
  echo: {
    intro: { en: 'Scrambled is not secret. Decode first, panic later.', ar: 'المبعثر ليس سرياً. فكّ الترميز أولاً، ثم اقلق بعد ذلك.' },
    success: { en: 'Two live logins, stored in the open. Both accounts are on our reset list already.', ar: 'بيانات دخول لحسابين محفوظة دون أي حماية. والحسابان موجودان أصلاً في قائمة تغيير كلمات المرور.' },
  },
  solution: 'cat vpn.profile; echo <auth> | base64 -d -> s.haddad:Falcon#Rise26. mail.profile -> m.chen. sha256sum = 64 hex. Choice: right.',
  selfTest: [
    { run: `echo ${b64(`${ACT3.user}:${ACT3.password}`)} | base64 -d`, includes: `${ACT3.user}:` },
    { run: `cat mail.profile`, includes: 'auth' },
    { run: 'sha256sum vpn.profile', includes: 'vpn.profile' },
  ],
};

export default level;
