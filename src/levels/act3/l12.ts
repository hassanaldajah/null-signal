import type { LevelConfig } from '../../engine/schema';
import { ACT3, dumpFile } from './story';

const level: LevelConfig = {
  id: 'L12',
  requires: { levels: ['L11'], evidence: ['ev.l11.loot'] },
  briefing: {
    en: 'The loot folder also held a copy of the old Helix wiki user table. Before judging how well these passwords were protected, recognize HOW each one was stored. Hash formats leave fingerprints: length, character set and prefixes like $2b$ or $6$.',
    ar: 'في مجلد `loot` كانت توجد أيضاً نسخة من جدول مستخدمي الويكي القديم في Helix. قبل أن تحكم على مستوى حماية كلمات المرور فيه، اعرف كيف خُزّنت كل واحدة. صيغ الهاش تترك علامات: الطول، ونوع الحروف، وبادئات مثل `$2b$` أو `$6$`.',
  },
  mission: {
    goal: {
      en: 'Recognise how each password in the old wiki table was stored, just from the shape of its hash.',
      ar: 'اعرف كيف خُزّنت كل كلمة مرور في جدول الويكي القديم، من شكل الهاش فقط.',
    },
    investigate: [
      {
        en: 'The file `users.dump` in `/srv/wiki/db`: one user and one hash on each line.',
        ar: 'الملف `users.dump` في `/srv/wiki/db`: في كل سطر مستخدم واحد وهاش واحد.',
      },
      {
        en: 'The `hashid` tool. It names the likely hash type of each line.',
        ar: 'الأداة `hashid`: تذكر نوع الهاش المرجَّح في كل سطر.',
      },
      {
        en: 'Two signs: the length of the hash, and a prefix such as `$2b$` or `$6$`.',
        ar: 'علامتان: طول الهاش، والبادئة مثل `$2b$` أو `$6$`.',
      },
    ],
    success: {
      en: 'You have named the weak algorithm, the account protected by bcrypt, and the number of accounts stored with a fast hash and no salt.',
      ar: 'تكون قد كتبت اسم الخوارزمية الضعيفة، والحساب المحمي بخوارزمية bcrypt، وعدد الحسابات المخزَّنة بهاش سريع ودون ملح.',
    },
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
      prompt: { en: 'In `users.dump`, which algorithm most likely stored the password of `d.brooks`?', ar: 'في الملف `users.dump`، ما الخوارزمية التي خُزّنت بها كلمة مرور `d.brooks` على الأرجح؟' },
      placeholder: 'algorithm',
      validator: { kind: 'answer', accept: ['md5'] },
      derived: '32 hex characters with no prefix: hashid lists MD5 first',
      wrong: { en: 'Run `hashid users.dump`. 32 hex characters and no $ prefix: the classic is listed first.', ar: 'شغّل `hashid users.dump`. الهاش من 32 خانة hex ودون بادئة `$`: الخوارزمية المشهورة تظهر أولاً في القائمة.' },
    },
    {
      id: 'bcrypt',
      prompt: { en: 'Which user is protected by bcrypt?', ar: 'أي مستخدم محمي بخوارزمية bcrypt؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: ['m.chen'] },
      wrong: { en: 'bcrypt hashes start with $2a$, $2b$ or $2y$ followed by a cost.', ar: 'هاش bcrypt يبدأ بالبادئة `$2a$` أو `$2b$` أو `$2y$` وبعدها رقم الكلفة.' },
    },
    {
      id: 'fast',
      prompt: { en: 'How many accounts use an unsalted fast hash (MD5 or SHA-1)?', ar: 'كم حساباً يستخدم هاشاً سريعاً دون ملح (MD5 أو SHA-1)؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['3', 'three'] },
      derived: 'd.brooks MD5, l.ito MD5, j.ortiz SHA-1',
      wrong: { en: 'Count the lines whose hash is plain hex with no $ prefix.', ar: 'عُدّ الأسطر التي فيها هاش من خانات hex عادية دون بادئة `$`.' },
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
      prompt: { en: 'What makes bcrypt a better way to store passwords than MD5?', ar: 'ما الذي يجعل bcrypt أفضل من MD5 لتخزين كلمات المرور؟' },
      validator: {
        kind: 'choice',
        correct: 'slow',
        options: [
          { id: 'long', label: { en: 'Its output is longer, so it looks more secure', ar: 'ناتجه أطول، فيبدو أكثر أماناً' } },
          { id: 'slow', label: { en: 'It adds a unique salt and is deliberately slow, so precomputed tables and mass guessing do not work', ar: 'يضيف ملحاً مختلفاً لكل حساب وهو بطيء عمداً، فلا تنفع معه الجداول الجاهزة ولا التخمين بالجملة' } },
          { id: 'enc', label: { en: 'It encrypts the password so admins can read it back', ar: 'يشفّر كلمة المرور ليستطيع المدير قراءتها لاحقاً' } },
          { id: 'new', label: { en: 'It is newer, and newer is always safer', ar: 'هو أحدث، والأحدث دائماً أكثر أماناً' } },
        ],
      },
      wrong: { en: 'Two ideas: salt (unique per user) and cost (time per check).', ar: 'فكرتان: الملح (مختلف لكل مستخدم) والكلفة (الوقت اللازم لكل فحص).' },
    },
  ],
  guide: {
    nudge: {
      en: '`man hashid`, then run it on the whole file.',
      ar: 'راجع `man hashid` ثم شغّله على الملف كله.',
    },
    clue: {
      en: '`hashid users.dump` analyzes every line. Look at prefixes and lengths.',
      ar: 'الأمر `hashid users.dump` يحلّل كل سطر. انظر إلى البادئات والأطوال.',
    },
    steps: {
      md5: {
        en: 'Run `hashid users.dump`. The hash of `d.brooks` is 32 hex characters with no `$` prefix, and the first type listed for it is MD5. Type `md5`.',
        ar: 'شغّل `hashid users.dump`. هاش الحساب `d.brooks` من 32 خانة hex ودون بادئة `$`، وأول نوع يظهر له هو MD5. اكتب `md5`.',
      },
      bcrypt: {
        en: 'bcrypt hashes start with `$2b$`. Only the line of `m.chen` starts that way.',
        ar: 'هاش bcrypt يبدأ بالبادئة `$2b$`. سطر الحساب `m.chen` وحده يبدأ بها.',
      },
      fast: {
        en: 'Count the lines whose hash is plain hex with no `$` prefix: `d.brooks` and `l.ito` (MD5, 32 characters) and `j.ortiz` (SHA-1, 40 characters). The answer is 3.',
        ar: 'عُدّ الأسطر التي فيها هاش من خانات hex عادية دون بادئة `$`: الحسابان `d.brooks` و`l.ito` (MD5، من 32 خانة) والحساب `j.ortiz` (SHA-1، من 40 خانة). الجواب 3.',
      },
      why: {
        en: 'Choose "It adds a unique salt and is deliberately slow, so precomputed tables and mass guessing do not work".',
        ar: 'اختر الجواب الذي يقول إنه يضيف ملحاً مختلفاً لكل حساب وإنه بطيء عمداً.',
      },
    },
    concept: {
      en: 'A stored password hash can be recognised by its length and its prefix. MD5 and SHA-1 are fast, which is good for checking files and bad for passwords. Passwords should be stored with a slow function and a different salt for every user, such as bcrypt or Argon2.',
      ar: 'هاش كلمة المرور المخزَّن يُعرف من طوله ومن بادئته. خوارزميتا MD5 و SHA-1 سريعتان، وهذا جيد لفحص الملفات وسيئ لكلمات المرور. كلمات المرور تُخزَّن بدالة بطيئة وبملح مختلف لكل مستخدم، مثل bcrypt أو Argon2.',
    },
  },
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'Hash formats are recognizable: MD5 is 32 hex characters, SHA-1 40, SHA-256 64. Modular crypt formats announce themselves with a prefix: $1$ (md5crypt), $5$/$6$ (sha256/512crypt), $2b$ (bcrypt), $argon2id$. MD5 and SHA-1 were built to be fast, which is good for file checksums and bad for passwords. Password storage should use a salted, slow, memory-hard function (Argon2id, scrypt, bcrypt) so identical passwords look different and every guess is expensive.',
      ar: 'صيغ الهاش يمكن تمييزها: MD5 طوله 32 خانة hex، و SHA-1 طوله 40، و SHA-256 طوله 64. والصيغ المعيارية تعرّف نفسها ببادئة: `$1$` (md5crypt)، و`$5$` و`$6$` (sha256crypt و sha512crypt)، و`$2b$` (bcrypt)، و`$argon2id$`. خوارزميتا MD5 و SHA-1 صُمّمتا لتكونا سريعتين، وهذا جيد لفحص الملفات وسيئ لكلمات المرور. تخزين كلمات المرور يحتاج إلى دالة بطيئة مع ملح وتستهلك ذاكرة (Argon2id أو scrypt أو bcrypt)، لتظهر الكلمات المتطابقة مختلفة ويصبح كل تخمين مكلفاً.',
    },
    realTools: ['hashid', 'name-that-hash', 'CyberChef', 'OWASP Password Storage Cheat Sheet'],
    takeaway: {
      en: 'Find and re-hash legacy accounts: one forgotten MD5 table undoes years of good policy.',
      ar: 'ابحث عن الحسابات القديمة وأعد تخزينها بهاش قوي: جدول MD5 واحد منسي يُلغي سنوات من السياسات الجيدة.',
    },
    source: 'OWASP Password Storage Cheat Sheet; NIST SP 800-63B §5.1.1.2',
  },
  echo: {
    intro: { en: 'Five users, five fingerprints. Read the shape before you judge the strength.', ar: 'خمسة مستخدمين وخمس بصمات. اقرأ الشكل قبل أن تحكم على القوة.' },
    success: { en: 'Three accounts sit behind fast, unsalted hashes. That is our weak spot.', ar: 'ثلاثة حسابات محفوظة بهاش سريع ودون ملح. هنا نقطة ضعفنا.' },
  },
  solution: 'hashid users.dump: d.brooks/l.ito MD5, j.ortiz SHA-1, m.chen bcrypt, s.haddad SHA-512 Crypt. 3 unsalted. Choice: slow.',
  selfTest: [
    { run: 'hashid users.dump', includes: '[+] bcrypt' },
    { run: 'hashid users.dump', includes: '[+] SHA-512 Crypt' },
    { run: 'hashid users.dump', includes: '[+] SHA-1' },
  ],
};

export default level;
