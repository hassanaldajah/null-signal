import type { LevelConfig } from '../../engine/schema';
import { ACT3 } from './story';

const CSV = '/opt/audit/accounts.csv';
const POLICY = '/opt/audit/policy.txt';

const level: LevelConfig = {
  id: 'L13',
  requires: { levels: ['L12'], evidence: ['ev.l12.weak-storage'] },
  briefing: {
    en: 'Before the reset wave, security wants an account audit. The export below holds facts ABOUT each account (length of the password, its age, MFA, whether it is shared), never the passwords themselves. Compare every row with the policy and flag what breaks it.',
    ar: 'قبل تغيير كلمات المرور، يريد فريق الأمن تدقيقاً للحسابات. الملف يحتوي على معلومات عن كل حساب (طول كلمة المرور، وعمرها، وحالة التحقق بخطوتين، وهل الحساب مشترك)، ولا يحتوي على كلمات المرور نفسها. قارن كل سطر بالسياسة وحدّد ما يخالفها.',
  },
  mission: {
    goal: {
      en: 'Audit the account list against the company policy without seeing any password.',
      ar: 'دقّق قائمة الحسابات مقابل سياسة الشركة دون أن ترى أي كلمة مرور.',
    },
    investigate: [
      {
        en: 'The file `policy.txt` in `/opt/audit`: the three rules.',
        ar: 'الملف `policy.txt` في `/opt/audit`: فيه القواعد الثلاث.',
      },
      {
        en: 'The file `accounts.csv`: one row per account, with the columns `user`, `length`, `age_days`, `mfa` and `shared`.',
        ar: 'الملف `accounts.csv`: سطر لكل حساب، وأعمدته `user` و`length` و`age_days` و`mfa` و`shared`.',
      },
      {
        en: 'Rows that break a rule: MFA is off, the length is under 12, or the account is shared.',
        ar: 'الأسطر التي تخالف قاعدة: التحقق بخطوتين معطَّل، أو الطول أقل من 12، أو الحساب مشترك.',
      },
    ],
    success: {
      en: 'You have counted the accounts without MFA, named the two short ones and the shared one, and picked the change that protects the most.',
      ar: 'تكون قد عددت الحسابات التي لا تستخدم التحقق بخطوتين، وكتبت الحسابين القصيرين والحساب المشترك، واخترت التغيير الأكثر حماية.',
    },
  },
  apps: ['case', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: ACT3.user,
    host: ACT3.host,
    home: ACT3.home,
    cwd: '/opt/audit',
    now: ACT3.now,
    files: {
      [POLICY]: 'Helix account policy\n- minimum length: 12\n- MFA: required for every account\n- shared accounts: not allowed\n',
      [CSV]: [
        'user,length,age_days,mfa,shared',
        's.haddad,13,12,yes,no',
        'm.chen,18,40,yes,no',
        'j.ortiz,10,210,no,no',
        'd.brooks,9,400,no,no',
        'l.ito,14,95,yes,no',
        'r.khalil,16,30,yes,no',
        'ops-backup,12,900,no,yes',
        'a.nasser,20,15,yes,no',
      ].join('\n') + '\n',
    },
  },
  objectives: [
    {
      id: 'no-mfa',
      prompt: { en: 'In `accounts.csv`, how many accounts have MFA turned off?', ar: 'في الملف `accounts.csv`، كم حساباً التحقق بخطوتين (MFA) فيه معطَّل؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['3', 'three'] },
      derived: 'grep ",no,[a-z]*$" style filter: j.ortiz, d.brooks, ops-backup',
      wrong: { en: 'Look at the 4th column. `grep` or `cut -d, -f1,4` helps.', ar: 'انظر إلى العمود الرابع. يساعدك الأمر `grep` أو الأمر `cut -d, -f1,4`.' },
    },
    {
      id: 'short',
      prompt: { en: 'Which personal accounts are shorter than the 12-character minimum? (comma separated)', ar: 'أي الحسابات الشخصية كلمة مروره أقصر من الحد الأدنى (12 خانة)؟ افصل بين الاسمين بفاصلة.' },
      placeholder: 'user, user',
      validator: { kind: 'answer', accept: ['j.ortiz, d.brooks', 'd.brooks, j.ortiz', 'j.ortiz,d.brooks', 'd.brooks,j.ortiz'] },
      derived: 'rows with length < 12 and shared=no',
      wrong: { en: 'Column 2 is the length. Two people are under 12.', ar: 'العمود الثاني هو الطول. يوجد شخصان أقل من 12.' },
    },
    {
      id: 'shared',
      prompt: { en: 'Which account breaks the "no shared accounts" rule?', ar: 'أي حساب يخالف قاعدة «الحسابات المشتركة ممنوعة»؟' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: ['ops-backup'] },
      wrong: { en: 'Last column says yes for one row.', ar: 'العمود الأخير قيمته `yes` في سطر واحد فقط.' },
      grants: [
        {
          id: 'ev.l13.audit',
          title: { en: 'Account policy audit', ar: 'تدقيق سياسة الحسابات' },
          type: 'note',
          content: 'No MFA: j.ortiz, d.brooks, ops-backup. Too short: j.ortiz, d.brooks. Shared: ops-backup (900 days old)',
          links: ['ev.l12.weak-storage'],
        },
      ],
    },
    {
      id: 'fix',
      prompt: { en: 'Which single change protects these accounts the most?', ar: 'أي تغيير واحد يحمي هذه الحسابات أكثر من غيره؟' },
      validator: {
        kind: 'choice',
        correct: 'mfa',
        options: [
          { id: 'monthly', label: { en: 'Force everyone to change passwords every month', ar: 'إجبار الجميع على تغيير كلمات المرور كل شهر' } },
          { id: 'mfa', label: { en: 'Turn on MFA everywhere and give the shared account an owner', ar: 'تفعيل التحقق بخطوتين في كل مكان وتحديد مالك للحساب المشترك' } },
          { id: 'symbols', label: { en: 'Require three symbols in every password', ar: 'اشتراط ثلاثة رموز في كل كلمة مرور' } },
          { id: 'hide', label: { en: 'Hide the audit file', ar: 'إخفاء ملف التدقيق' } },
        ],
      },
      wrong: { en: 'NIST discourages forced periodic changes and odd composition rules. What stops a stolen password from being enough?', ar: 'إرشادات NIST لا تنصح بالتغيير الدوري الإجباري ولا بقواعد التركيب الغريبة. ما الذي يجعل كلمة المرور المسروقة غير كافية وحدها؟' },
    },
  ],
  guide: {
    nudge: {
      en: '`cat policy.txt`, then `cat accounts.csv`.',
      ar: 'شغّل `cat policy.txt` ثم `cat accounts.csv`.',
    },
    clue: {
      en: '`cut -d, -f1,2,4,5 accounts.csv` shows just the columns you need.',
      ar: 'الأمر `cut -d, -f1,2,4,5 accounts.csv` يعرض الأعمدة التي تحتاجها فقط.',
    },
    steps: {
      'no-mfa': {
        en: 'Run `cat accounts.csv` and look at the fourth column, `mfa`. Three rows say `no`: `j.ortiz`, `d.brooks` and `ops-backup`. The answer is 3.',
        ar: 'شغّل `cat accounts.csv` وانظر إلى العمود الرابع `mfa`. ثلاثة أسطر قيمتها `no`: الحسابات `j.ortiz` و`d.brooks` و`ops-backup`. الجواب 3.',
      },
      short: {
        en: 'The second column is the password length, and the policy minimum is 12. `j.ortiz` has 10 and `d.brooks` has 9. Type `j.ortiz, d.brooks`.',
        ar: 'العمود الثاني هو طول كلمة المرور، والحد الأدنى في السياسة 12. طول كلمة `j.ortiz` هو 10، وطول كلمة `d.brooks` هو 9. اكتب `j.ortiz, d.brooks`.',
      },
      shared: {
        en: 'The last column, `shared`, says `yes` on one row only: `ops-backup`.',
        ar: 'العمود الأخير `shared` قيمته `yes` في سطر واحد فقط: `ops-backup`.',
      },
      fix: {
        en: 'Choose "Turn on MFA everywhere and give the shared account an owner". With MFA, a stolen password is not enough.',
        ar: 'اختر «تفعيل التحقق بخطوتين في كل مكان وتحديد مالك للحساب المشترك». مع التحقق بخطوتين لا تكفي كلمة المرور المسروقة وحدها.',
      },
    },
    concept: {
      en: 'A good audit reads facts about accounts, such as length, age, MFA and owner. It never needs the passwords themselves. Two-step login protects more than any password rule, and a shared account hides who really used it.',
      ar: 'التدقيق الجيد يقرأ حقائق عن الحسابات، مثل الطول والعمر والتحقق بخطوتين والمالك. ولا يحتاج إلى كلمات المرور نفسها أبداً. التحقق بخطوتين يحمي أكثر من أي قاعدة لكلمات المرور، والحساب المشترك يُخفي من استخدمه فعلاً.',
    },
  },
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'A good audit reads metadata, not secrets: length, age, MFA and ownership tell you which accounts are risky without anyone seeing a password. Modern guidance (NIST SP 800-63B) favors long passwords, screening new passwords against known-compromised lists at the moment they are set, MFA, and no forced periodic changes. Shared accounts break accountability: nobody knows who used them.',
      ar: 'التدقيق الجيد يقرأ البيانات الوصفية لا الأسرار: الطول والعمر والتحقق بخطوتين والملكية تكشف الحسابات الخطرة دون أن يرى أحد أي كلمة مرور. الإرشادات الحديثة (NIST SP 800-63B) تفضّل كلمات المرور الطويلة، وفحص الكلمة الجديدة لحظة اختيارها مقابل قوائم الكلمات المسرّبة، والتحقق بخطوتين، وعدم فرض التغيير الدوري. والحسابات المشتركة تُضيّع المسؤولية: لا أحد يعرف من استخدمها.',
    },
    realTools: ['Microsoft Entra ID password protection', 'Active Directory audit reports', 'Bitwarden / KeePassXC', 'cut / grep'],
    takeaway: {
      en: 'MFA on every account, an owner for every account, and long passwords. Audit the facts, never the secrets.',
      ar: 'تحقق بخطوتين لكل حساب، ومالك لكل حساب، وكلمات مرور طويلة. دقّق في الحقائق لا في الأسرار.',
    },
    source: 'NIST SP 800-63B §5.1.1 and §5.2; CIS Controls v8, Control 5 and 6',
  },
  echo: {
    intro: { en: 'No passwords in this file, and we do not need any. The facts around them are enough.', ar: 'لا توجد كلمات مرور في هذا الملف، ولا نحتاج إليها. الحقائق المحيطة بها تكفي.' },
    success: { en: 'j.ortiz again: short, old, no MFA. No wonder the spray landed there.', ar: 'الحساب `j.ortiz` من جديد: كلمة قصيرة وقديمة ودون تحقق بخطوتين. لا عجب أن تجربة كلمات المرور نجحت معه.' },
  },
  solution: 'cut -d, -f1,2,4,5 accounts.csv. No MFA: 3. Short: j.ortiz, d.brooks. Shared: ops-backup. Choice: mfa.',
  selfTest: [
    { run: 'cut -d, -f1,4 accounts.csv', includes: 'ops-backup,no' },
    { run: 'cat policy.txt', includes: 'minimum length: 12' },
  ],
};

export default level;
