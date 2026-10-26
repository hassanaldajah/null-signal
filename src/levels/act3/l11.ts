import type { LevelConfig } from '../../engine/schema';
import { ACT3, b64 } from './story';

const VPN = `${ACT3.loot}/vpn.profile`;

const level: LevelConfig = {
  id: 'L11',
  requires: { levels: ['L10'], evidence: ['ev.l03.artifact', 'ev.l10.patient-zero'] },
  briefing: {
    en: 'Back on helix-ws07: next to the beacon, gh0st left a "loot" folder. The values inside look scrambled, but scrambled is not secret. Encoding (like base64) only changes how data is written, and anyone can reverse it. Hashing is one-way. Learn to tell them apart.',
    ar: 'رجعنا على helix-ws07: جنب برنامج الاتصال، gh0st ترك مجلد "loot". القيم اللي جوّا شكلها ملخبطة، بس الملخبط مش سري. الترميز (زي base64) بيغيّر طريقة كتابة البيانات بس، وأي حدا بيقدر يرجّعها. أما الهاش فباتجاه واحد. تعلّم تفرّق بينهم.',
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
        en: 'Decode the auth value in vpn.profile. Whose account is it?',
        ar: 'فكّ ترميز قيمة auth بملف vpn.profile. حساب مين هاد؟',
      },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT3.user] },
      wrong: { en: 'Pipe the value into `base64 -d`: `echo VALUE | base64 -d`.', ar: 'مرّر القيمة لـ `base64 -d`: `echo VALUE | base64 -d`.' },
      grants: [
        {
          id: 'ev.l11.loot',
          title: { en: 'Stolen logins in the loot folder', ar: 'بيانات دخول مسروقة بمجلد loot' },
          type: 'credential',
          content: `${ACT3.loot}: base64 user:password for ${ACT3.user} (VPN) and ${ACT3.secondVictim} (mail)`,
          links: ['ev.l03.artifact', 'ev.l10.patient-zero'],
        },
      ],
    },
    {
      id: 'second',
      prompt: { en: 'The other profile holds a second stolen account. Which one?', ar: 'الملف الثاني فيه حساب مسروق ثاني. أي حساب؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT3.secondVictim] },
      derived: 'base64 -d of the mail.profile auth value',
      wrong: { en: 'Decode the auth line of mail.profile the same way.', ar: 'فكّ سطر auth بملف mail.profile بنفس الطريقة.' },
    },
    {
      id: 'checksum',
      prompt: { en: 'Run sha256sum on vpn.profile. How many hex characters long is the result?', ar: 'شغّل sha256sum على vpn.profile. كم خانة hex طول النتيجة؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['64'] },
      derived: 'SHA-256 = 256 bits = 64 hex characters',
      wrong: { en: 'Count the characters before the two spaces. 256 bits / 4 bits per hex character.', ar: 'عدّ الخانات قبل المسافتين. 256 بت ÷ 4 بت لكل خانة hex.' },
    },
    {
      id: 'difference',
      prompt: { en: 'Which statement is true?', ar: 'أي جملة صحيحة؟' },
      validator: {
        kind: 'choice',
        correct: 'right',
        options: [
          { id: 'enc', label: { en: 'base64 is encryption; without a key nobody can read it', ar: 'base64 تشفير؛ بدون مفتاح ما حدا بيقدر يقرأه' } },
          { id: 'right', label: { en: 'base64 is reversible by anyone; a hash cannot be turned back into the input', ar: 'base64 أي حدا بيرجّعه؛ والهاش ما بيرجع للمدخل الأصلي' } },
          { id: 'same', label: { en: 'base64 and SHA-256 are both one-way hashes', ar: 'base64 و SHA-256 الاثنين هاش باتجاه واحد' } },
          { id: 'hash', label: { en: 'A hash can be decoded with sha256sum -d', ar: 'الهاش بينفك بـ sha256sum -d' } },
        ],
      },
      wrong: { en: 'You decoded base64 without any key. Could you do that with the sha256sum output?', ar: 'فكّيت base64 بدون أي مفتاح. بتقدر تعمل هيك مع ناتج sha256sum؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: '`cat vpn.profile`, then `man base64`.', ar: '`cat vpn.profile`، وبعدين `man base64`.' }, cost: 15 },
    { tier: 'direction', text: { en: 'Copy the text after "auth = " and run `echo THAT_TEXT | base64 -d`.', ar: 'انسخ النص اللي بعد "auth = " وشغّل `echo النص | base64 -d`.' }, cost: 30 },
    { tier: 'near-solution', text: { en: 'The decoded text is user:password. The user is before the colon.', ar: 'النص المفكوك شكله user:password. المستخدم قبل النقطتين.' }, cost: 45 },
  ],
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'Encoding (base64, hex, URL encoding) makes data safe to transport, not secret: the method is public and needs no key. Encryption needs a key to reverse. Hashing (SHA-256) is one-way: the same input always gives the same fixed-length digest, which makes it good for integrity checks and for storing passwords (with salt and a slow algorithm). Attackers and lazy software often "hide" credentials with base64, which protects nothing.',
      ar: 'الترميز (base64، hex، ترميز الروابط) بيخلّي البيانات سهلة النقل، مش سرية: الطريقة معروفة وما بدها مفتاح. التشفير بدّه مفتاح ليرجع. والهاش (SHA-256) باتجاه واحد: نفس المدخل دايماً بيعطي نفس البصمة بطول ثابت، وهاد بيخلّيه منيح لفحص سلامة الملفات ولتخزين كلمات المرور (مع ملح وخوارزمية بطيئة). المهاجمين والبرامج الكسولة كثير بيخبّوا بيانات الدخول بـ base64، وهاد ما بيحمي إشي.',
    },
    realTools: ['base64', 'CyberChef', 'sha256sum', 'secret scanners (gitleaks, trufflehog)'],
    takeaway: {
      en: 'If it can be read back without a key, treat it as plaintext.',
      ar: 'إذا بينقرأ بدون مفتاح، اعتبره نص مكشوف.',
    },
    source: 'RFC 4648 (Base16/32/64 encodings); NIST FIPS 180-4 (Secure Hash Standard)',
  },
  echo: {
    intro: { en: 'Scrambled is not secret. Decode first, panic later.', ar: 'الملخبط مش سري. فك الترميز أول، وبعدين اقلق.' },
    success: { en: 'Two live logins, stored in the open. Both accounts are on our reset list already.', ar: 'بيانات دخول لحسابين، مخزّنة على المكشوف. والحسابين على قائمة تغيير كلمات السر أصلاً.' },
  },
  solution: 'cat vpn.profile; echo <auth> | base64 -d -> s.haddad:Falcon#Rise26. mail.profile -> m.chen. sha256sum = 64 hex. Choice: right.',
  selfTest: [
    { run: `echo ${b64(`${ACT3.user}:${ACT3.password}`)} | base64 -d`, includes: `${ACT3.user}:` },
    { run: `cat mail.profile`, includes: 'auth' },
    { run: 'sha256sum vpn.profile', includes: 'vpn.profile' },
  ],
};

export default level;
