import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const level: LevelConfig = {
  id: 'L01',
  requires: { levels: [], evidence: [] },
  briefing: {
    en: 'Sysadmin Samir Haddad reported strange logins, then stopped answering. His workstation is locked and IT lost the recovery key. Get in without guessing blindly: read the scene.',
    ar: 'مدير الأنظمة سمير حدّاد بلّغ عن تسجيلات دخول غريبة، وبعدها انقطع. جهازه مقفل والـ IT ضيّعوا مفتاح الاسترجاع. ادخل بدون تخمين أعمى: اقرأ المكان.',
  },
  apps: ['case', 'notes', 'evidence'],
  autoOpen: ['case'],
  world: {
    user: ACT1.user,
    host: ACT1.host,
    home: ACT1.home,
    now: ACT1.now,
    lockscreen: {
      user: ACT1.user,
      objective: 'unlock',
      hint: {
        en: 'Password last changed: 2026-03-02 · Policy: 12+ characters, at least one number and one symbol.',
        ar: 'آخر تغيير لكلمة المرور: 2026-03-02 · السياسة: 12 خانة أو أكثر، رقم ورمز على الأقل.',
      },
    },
    notes: [
      { id: 'n1', title: 'Jan 15 — new pass', body: 'Sunrise!2025x\n(expires in 90 days?? ugh)', color: 'yellow' },
      { id: 'n2', title: 'Guest Wi-Fi', body: 'SSID: Helix-Guest\npass: welcome2026', color: 'cyan' },
      { id: 'n3', title: 'Mar 02 — reset again', body: 'tried falcon26 -> rejected\nfinal: Falcon#Rise26', color: 'pink' },
      { id: 'n4', title: 'Door PIN', body: 'server room: 4471', color: 'yellow' },
    ],
    files: {
      [`${ACT1.home}/Desktop/README.txt`]: 'Helix Dynamics workstation. Property of IT.\n',
    },
  },
  objectives: [
    {
      id: 'unlock',
      prompt: { en: "Unlock Samir's workstation.", ar: 'افتح جهاز سمير.' },
      validator: { kind: 'answer', accept: [ACT1.password], caseSensitive: true },
      wrong: {
        en: 'Wrong. Compare each candidate with the change date and the policy. Passwords are case-sensitive.',
        ar: 'غلط. قارن كل احتمال مع تاريخ التغيير والسياسة. كلمات المرور حساسة لحالة الأحرف.',
      },
      grants: [
        { id: 'ev.l01.password', title: { en: "Samir's workstation password", ar: 'كلمة مرور جهاز سمير' }, type: 'credential', content: ACT1.password },
        {
          id: 'ev.l01.user',
          title: { en: 'Account owner', ar: 'صاحب الحساب' },
          type: 'person',
          content: `${ACT1.user} (Samir Haddad, sysadmin)`,
          links: ['ev.l01.password'],
        },
      ],
    },
    {
      id: 'root-cause',
      prompt: {
        en: 'You got in. What is the real security failure here?',
        ar: 'دخلت. شو الخلل الأمني الحقيقي هون؟',
      },
      validator: {
        kind: 'choice',
        correct: 'note',
        options: [
          { id: 'short', label: { en: 'The password is too short', ar: 'كلمة المرور قصيرة' } },
          { id: 'note', label: { en: 'The password was written on a note anyone could read', ar: 'كلمة المرور مكتوبة على ورقة أي حدا بيقدر يقرأها' } },
          { id: 'wifi', label: { en: 'The guest Wi-Fi password is weak', ar: 'كلمة مرور واي فاي الضيوف ضعيفة' } },
          { id: 'symbol', label: { en: 'The password uses a symbol', ar: 'كلمة المرور فيها رمز' } },
        ],
      },
      wrong: {
        en: 'Think about how YOU got in. Anyone walking past could do the same.',
        ar: 'فكّر كيف إنت دخلت. أي حدا ماشي من جنب المكتب بيقدر يعمل نفس الشي.',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: 'Investigators read the room before the machine. What is stuck to the monitor?', ar: 'المحقق بيقرأ المكان قبل الجهاز. شو ملزوق على الشاشة؟' },
      cost: 10,
    },
    {
      tier: 'direction',
      text: {
        en: 'More than one note looks like a password. The lock screen tells you WHEN it last changed and WHAT a valid one looks like.',
        ar: 'في أكثر من ورقة شكلها كلمة مرور. شاشة القفل بتحكيلك إمتى تغيّرت آخر مرة وشو شكل الكلمة المقبولة.',
      },
      cost: 20,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Only one candidate is dated Mar 02 AND passes the policy (12+ chars, number, symbol). Type it exactly, capitals included.',
        ar: 'احتمال واحد بس تاريخه 2 آذار وبيحقق السياسة (12+ خانة، رقم، رمز). اكتبه بالزبط مع الأحرف الكبيرة.',
      },
      cost: 35,
    },
  ],
  rewards: { points: 100, achievement: 'first-case' },
  debrief: {
    concept: {
      en: 'Physical reconnaissance: investigators (and attackers) look at the environment first. A password on a sticky note defeats any technical control. Policies that force frequent changes and complex rules push people to write passwords down; NIST SP 800-63B recommends long passphrases checked against breach lists, no forced periodic changes without evidence of compromise, and MFA.',
      ar: 'الاستطلاع الفيزيائي: المحقق (والمهاجم) بيبدأ بالمكان. كلمة مرور على ورقة لاصقة بتلغي أي حماية تقنية. السياسات اللي بتفرض تغيير متكرر وقواعد معقّدة بتدفع الناس يكتبوا كلمات المرور؛ وإرشادات NIST SP 800-63B بتنصح بعبارات مرور طويلة بتنفحص مقابل قوائم التسريبات، وبدون تغيير دوري إجباري إلا إذا في دليل اختراق، ومع مصادقة متعددة العوامل.',
    },
    realTools: ['Scene photography', 'KeePassXC', 'Bitwarden', 'MFA (TOTP / FIDO2)'],
    takeaway: {
      en: 'Document the scene before you touch anything, and treat every visible secret as already compromised.',
      ar: 'وثّق المكان قبل ما تلمس أي شي، واعتبر أي سر مكشوف إنه مخترق أصلاً.',
    },
    source: 'NIST SP 800-63B §5.1.1.2 (Memorized Secret Verifiers)',
  },
  echo: {
    intro: {
      en: "I'm ECHO, your analysis assistant. The machine is locked, but people leave traces outside computers too. Look around the screen.",
      ar: 'أنا ECHO، مساعدك بالتحليل. الجهاز مقفل، بس الناس بتترك آثار برّا الكمبيوتر كمان. اتطلّع حوالين الشاشة.',
    },
    success: {
      en: 'Clean entry. Note it on the board: the attacker could have walked in the same way.',
      ar: 'دخول نظيف. سجّلها على اللوحة: المهاجم كان ممكن يدخل بنفس الطريقة.',
    },
  },
  solution: 'Notes n1/n3 hold passwords. Lock hint: changed 2026-03-02, policy 12+ chars with number+symbol. n3 "Falcon#Rise26" (13 chars, number, symbol, Mar 02). Choice: note.',
  selfTest: [],
};

export default level;
