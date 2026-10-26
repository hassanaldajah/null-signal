import type { LevelConfig } from '../../engine/schema';
import { ACT3, dumpFile } from './story';

const level: LevelConfig = {
  id: 'L12',
  requires: { levels: ['L11'], evidence: ['ev.l11.loot'] },
  briefing: {
    en: 'The loot folder also held a copy of the old Helix wiki user table. Before judging how well these passwords were protected, recognize HOW each one was stored. Hash formats leave fingerprints: length, character set and prefixes like $2b$ or $6$.',
    ar: 'مجلد loot كان فيه كمان نسخة من جدول مستخدمي الويكي القديم تبع Helix. قبل ما تحكم قديش كلمات المرور كانت محمية، اعرف كيف انخزّنت كل وحدة. صيغ الهاش بتترك بصمات: الطول، نوع الحروف، وبادئات زي $2b$ أو $6$.',
  },
  apps: ['case', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: ACT3.user,
    host: ACT3.host,
    home: ACT3.home,
    cwd: '/srv/wiki/db',
    now: ACT3.now,
    files: {
      [ACT3.dump]: dumpFile(),
      '/srv/wiki/db/README': 'Legacy wiki (2019). Migration to SSO in progress: new accounts use bcrypt, old ones were never re-hashed.\n',
    },
  },
  objectives: [
    {
      id: 'md5',
      prompt: { en: "Which algorithm most likely stored d.brooks's password?", ar: 'أي خوارزمية على الأغلب خزّنت كلمة مرور d.brooks؟' },
      placeholder: 'algorithm',
      validator: { kind: 'answer', accept: ['md5'] },
      derived: '32 hex characters with no prefix: hashid lists MD5 first',
      wrong: { en: 'Run `hashid users.dump`. 32 hex characters and no $ prefix: the classic is listed first.', ar: 'شغّل `hashid users.dump`. ‏32 خانة hex وبدون بادئة $: الخوارزمية المشهورة بتطلع أول وحدة.' },
    },
    {
      id: 'bcrypt',
      prompt: { en: 'Which user is protected by bcrypt?', ar: 'أي مستخدم محمي بـ bcrypt؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: ['m.chen'] },
      wrong: { en: 'bcrypt hashes start with $2a$, $2b$ or $2y$ followed by a cost.', ar: 'هاش bcrypt بيبلّش بـ $2a$ أو $2b$ أو $2y$ وبعده رقم الكلفة.' },
    },
    {
      id: 'fast',
      prompt: { en: 'How many accounts use an unsalted fast hash (MD5 or SHA-1)?', ar: 'كم حساب بيستخدم هاش سريع بدون ملح (MD5 أو SHA-1)؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['3', 'three'] },
      derived: 'd.brooks MD5, l.ito MD5, j.ortiz SHA-1',
      wrong: { en: 'Count the lines whose hash is plain hex with no $ prefix.', ar: 'عدّ الأسطر اللي الهاش فيها hex عادي بدون بادئة $.' },
      grants: [
        {
          id: 'ev.l12.weak-storage',
          title: { en: 'Legacy wiki hashes', ar: 'هاشات الويكي القديم' },
          type: 'hash',
          content: '3 accounts unsalted (d.brooks, l.ito MD5; j.ortiz SHA-1); m.chen bcrypt; s.haddad sha512crypt',
          links: ['ev.l11.loot'],
        },
      ],
    },
    {
      id: 'why',
      prompt: { en: 'What makes bcrypt a better way to store passwords than MD5?', ar: 'شو اللي بيخلّي bcrypt أحسن من MD5 لتخزين كلمات المرور؟' },
      validator: {
        kind: 'choice',
        correct: 'slow',
        options: [
          { id: 'long', label: { en: 'Its output is longer, so it looks more secure', ar: 'ناتجه أطول، فشكله آمن أكثر' } },
          { id: 'slow', label: { en: 'It adds a unique salt and is deliberately slow, so precomputed tables and mass guessing do not work', ar: 'بيضيف ملح مختلف لكل حساب ومقصود يكون بطيء، فالجداول الجاهزة والتخمين بالجملة ما بينفعوا' } },
          { id: 'enc', label: { en: 'It encrypts the password so admins can read it back', ar: 'بيشفّر كلمة المرور عشان المدير يقدر يرجع يقرأها' } },
          { id: 'new', label: { en: 'It is newer, and newer is always safer', ar: 'أحدث، والأحدث دايماً آمن أكثر' } },
        ],
      },
      wrong: { en: 'Two ideas: salt (unique per user) and cost (time per check).', ar: 'فكرتين: الملح (مختلف لكل مستخدم) والكلفة (وقت كل فحص).' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: '`man hashid`, then run it on the whole file.', ar: '`man hashid`، وبعدين شغّله على الملف كله.' }, cost: 15 },
    { tier: 'direction', text: { en: '`hashid users.dump` analyzes every line. Look at prefixes and lengths.', ar: '`hashid users.dump` بيحلّل كل سطر. ركّز على البادئات والأطوال.' }, cost: 30 },
    { tier: 'near-solution', text: { en: 'd.brooks and l.ito: 32 hex (MD5). j.ortiz: 40 hex (SHA-1). m.chen: $2b$. s.haddad: $6$.', ar: 'd.brooks و l.ito: ‏32 hex ‏(MD5). j.ortiz: ‏40 hex ‏(SHA-1). m.chen: ‏$2b$. s.haddad: ‏$6$.' }, cost: 45 },
  ],
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'Hash formats are recognizable: MD5 is 32 hex characters, SHA-1 40, SHA-256 64. Modular crypt formats announce themselves with a prefix: $1$ (md5crypt), $5$/$6$ (sha256/512crypt), $2b$ (bcrypt), $argon2id$. MD5 and SHA-1 were built to be fast, which is good for file checksums and bad for passwords. Password storage should use a salted, slow, memory-hard function (Argon2id, scrypt, bcrypt) so identical passwords look different and every guess is expensive.',
      ar: 'صيغ الهاش بتنعرف: MD5 طوله 32 خانة hex، و SHA-1 ‏40، و SHA-256 ‏64. والصيغ المعيارية بتعرّف عن حالها ببادئة: $1$ (md5crypt)، و $5$/$6$ (sha256/512crypt)، و $2b$ (bcrypt)، و $argon2id$. MD5 و SHA-1 انعملوا ليكونوا سريعين، وهاد منيح لفحص الملفات وسيئ لكلمات المرور. تخزين كلمات المرور لازم يكون بدالة مملّحة وبطيئة وبتستهلك ذاكرة (Argon2id، scrypt، bcrypt)، عشان كلمات المرور المتشابهة تطلع مختلفة وكل تخمين يكلّف.',
    },
    realTools: ['hashid', 'name-that-hash', 'CyberChef', 'OWASP Password Storage Cheat Sheet'],
    takeaway: {
      en: 'Find and re-hash legacy accounts: one forgotten MD5 table undoes years of good policy.',
      ar: 'لاقي الحسابات القديمة وأعد تخزينها بهاش قوي: جدول MD5 واحد منسي بيلغي سنين من السياسات المنيحة.',
    },
    source: 'OWASP Password Storage Cheat Sheet; NIST SP 800-63B §5.1.1.2',
  },
  echo: {
    intro: { en: 'Five users, five fingerprints. Read the shape before you judge the strength.', ar: 'خمس مستخدمين وخمس بصمات. اقرأ الشكل قبل ما تحكم على القوة.' },
    success: { en: 'Three accounts sit behind fast, unsalted hashes. That is our weak spot.', ar: 'ثلاث حسابات ورا هاشات سريعة بدون ملح. هون نقطة ضعفنا.' },
  },
  solution: 'hashid users.dump: d.brooks/l.ito MD5, j.ortiz SHA-1, m.chen bcrypt, s.haddad SHA-512 Crypt. 3 unsalted. Choice: slow.',
  selfTest: [
    { run: 'hashid users.dump', includes: '[+] bcrypt' },
    { run: 'hashid users.dump', includes: '[+] SHA-512 Crypt' },
    { run: 'hashid users.dump', includes: '[+] SHA-1' },
  ],
};

export default level;
