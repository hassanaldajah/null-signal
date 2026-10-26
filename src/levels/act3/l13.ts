import type { LevelConfig } from '../../engine/schema';
import { ACT3 } from './story';

const CSV = '/opt/audit/accounts.csv';
const POLICY = '/opt/audit/policy.txt';

const level: LevelConfig = {
  id: 'L13',
  requires: { levels: ['L12'], evidence: ['ev.l12.weak-storage'] },
  briefing: {
    en: 'Before the reset wave, security wants an account audit. The export below holds facts ABOUT each account (length of the password, its age, MFA, whether it is shared), never the passwords themselves. Compare every row with the policy and flag what breaks it.',
    ar: 'قبل موجة تغيير كلمات المرور، فريق الأمن بدّه تدقيق للحسابات. الملف فيه معلومات عن كل حساب (طول كلمة المرور، عمرها، المصادقة الثنائية، إذا الحساب مشترك)، وما فيه كلمات المرور نفسها. قارن كل سطر مع السياسة وأشّر على المخالف.',
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
      prompt: { en: 'How many accounts have MFA turned off?', ar: 'كم حساب المصادقة الثنائية عنده مطفية؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['3', 'three'] },
      derived: 'grep ",no,[a-z]*$" style filter: j.ortiz, d.brooks, ops-backup',
      wrong: { en: 'Look at the 4th column. `grep` or `cut -d, -f1,4` helps.', ar: 'شوف العمود الرابع. `grep` أو `cut -d, -f1,4` بيساعد.' },
    },
    {
      id: 'short',
      prompt: { en: 'Which personal accounts are shorter than the 12-character minimum? (comma separated)', ar: 'أي حسابات شخصية أقصر من الحد الأدنى 12 خانة؟ (افصل بفاصلة)' },
      placeholder: 'user, user',
      validator: { kind: 'answer', accept: ['j.ortiz, d.brooks', 'd.brooks, j.ortiz', 'j.ortiz,d.brooks', 'd.brooks,j.ortiz'] },
      derived: 'rows with length < 12 and shared=no',
      wrong: { en: 'Column 2 is the length. Two people are under 12.', ar: 'العمود الثاني هو الطول. في شخصين أقل من 12.' },
    },
    {
      id: 'shared',
      prompt: { en: 'Which account breaks the "no shared accounts" rule?', ar: 'أي حساب بيخالف قاعدة "ممنوع الحسابات المشتركة"؟' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: ['ops-backup'] },
      wrong: { en: 'Last column says yes for one row.', ar: 'العمود الأخير قيمته yes بسطر واحد.' },
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
      prompt: { en: 'Which single change protects these accounts the most?', ar: 'أي تغيير واحد بيحمي هالحسابات أكثر إشي؟' },
      validator: {
        kind: 'choice',
        correct: 'mfa',
        options: [
          { id: 'monthly', label: { en: 'Force everyone to change passwords every month', ar: 'نجبر الكل يغيّروا كلمات المرور كل شهر' } },
          { id: 'mfa', label: { en: 'Turn on MFA everywhere and give the shared account an owner', ar: 'نشغّل المصادقة الثنائية بكل مكان ونعطي الحساب المشترك صاحب' } },
          { id: 'symbols', label: { en: 'Require three symbols in every password', ar: 'نطلب ثلاث رموز بكل كلمة مرور' } },
          { id: 'hide', label: { en: 'Hide the audit file', ar: 'نخبّي ملف التدقيق' } },
        ],
      },
      wrong: { en: 'NIST discourages forced periodic changes and odd composition rules. What stops a stolen password from being enough?', ar: 'NIST ما بينصح بالتغيير الإجباري الدوري ولا بقواعد التركيب الغريبة. شو اللي بيخلّي كلمة المرور المسروقة مش كافية؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: '`cat policy.txt`, then `cat accounts.csv`.', ar: '`cat policy.txt`، وبعدين `cat accounts.csv`.' }, cost: 15 },
    { tier: 'direction', text: { en: '`cut -d, -f1,2,4,5 accounts.csv` shows just the columns you need.', ar: '`cut -d, -f1,2,4,5 accounts.csv` بيعرض الأعمدة اللي بتلزمك بس.' }, cost: 30 },
    { tier: 'near-solution', text: { en: 'mfa=no: three rows. length under 12: j.ortiz and d.brooks. shared=yes: ops-backup.', ar: 'mfa=no: ثلاث أسطر. طول أقل من 12: j.ortiz و d.brooks. shared=yes: ops-backup.' }, cost: 45 },
  ],
  rewards: { points: 130 },
  debrief: {
    concept: {
      en: 'A good audit reads metadata, not secrets: length, age, MFA and ownership tell you which accounts are risky without anyone seeing a password. Modern guidance (NIST SP 800-63B) favors long passwords, screening new passwords against known-compromised lists at the moment they are set, MFA, and no forced periodic changes. Shared accounts break accountability: nobody knows who used them.',
      ar: 'التدقيق المنيح بيقرأ البيانات الوصفية، مش الأسرار: الطول والعمر والمصادقة الثنائية والملكية بيحكولك أي حسابات خطرة بدون ما حدا يشوف كلمة مرور. الإرشادات الحديثة (NIST SP 800-63B) بتفضّل كلمات المرور الطويلة، وفحص كلمة المرور الجديدة لحظة اختيارها، والمصادقة الثنائية، وبدون تغيير دوري إجباري. والحسابات المشتركة بتضيّع المسؤولية: ما حدا بيعرف مين استخدمها.',
    },
    realTools: ['Microsoft Entra ID password protection', 'Active Directory audit reports', 'Bitwarden / KeePassXC', 'cut / grep'],
    takeaway: {
      en: 'MFA on every account, an owner for every account, and long passwords. Audit the facts, never the secrets.',
      ar: 'مصادقة ثنائية لكل حساب، وصاحب لكل حساب، وكلمات مرور طويلة. دقّق بالحقائق، مش بالأسرار.',
    },
    source: 'NIST SP 800-63B §5.1.1 and §5.2; CIS Controls v8, Control 5 and 6',
  },
  echo: {
    intro: { en: 'No passwords in this file, and we do not need any. The facts around them are enough.', ar: 'ما في كلمات مرور بهالملف، وما بنحتاجها. الحقائق اللي حواليها بتكفي.' },
    success: { en: 'j.ortiz again: short, old, no MFA. No wonder the spray landed there.', ar: 'j.ortiz مرة ثانية: قصيرة وقديمة وبدون مصادقة ثنائية. مش غريب إنه التخمين نجح عنده.' },
  },
  solution: 'cut -d, -f1,2,4,5 accounts.csv. No MFA: 3. Short: j.ortiz, d.brooks. Shared: ops-backup. Choice: mfa.',
  selfTest: [
    { run: 'cut -d, -f1,4 accounts.csv', includes: 'ops-backup,no' },
    { run: 'cat policy.txt', includes: 'minimum length: 12' },
  ],
};

export default level;
