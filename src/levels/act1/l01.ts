import type { LevelConfig } from '../../engine/schema';
import { ACT1 } from './story';

const level: LevelConfig = {
  id: 'L01',
  requires: { levels: [], evidence: [] },
  briefing: {
    en: 'Sysadmin Samir Haddad reported strange logins, then stopped answering. His workstation is locked and IT lost the recovery key. Get in without guessing blindly: read the scene.',
    ar: 'مدير الأنظمة سمير حدّاد أبلغ عن عمليات دخول غريبة إلى حسابه، ثم انقطع الاتصال به. جهازه مقفل، وقسم تقنية المعلومات أضاع مفتاح الاسترجاع. ادخل إلى الجهاز دون تخمين عشوائي: افحص المكان أولاً.',
  },
  mission: {
    goal: {
      en: "Unlock Samir's computer using only the clues you can see around the screen. No blind guessing.",
      ar: 'افتح جهاز سمير بالاعتماد على الأدلة الظاهرة حول الشاشة فقط، دون تخمين عشوائي.',
    },
    investigate: [
      {
        en: 'The four sticky notes on the monitor. Two of them hold something that looks like a password.',
        ar: 'الأوراق اللاصقة الأربع على الشاشة. ورقتان منها فيهما ما يشبه كلمة مرور.',
      },
      {
        en: 'The small line under the password box: the date of the last password change and the password rules.',
        ar: 'السطر الصغير تحت خانة كلمة المرور: تاريخ آخر تغيير لكلمة المرور وشروطها.',
      },
    ],
    success: {
      en: 'The desktop opens, you pick the real security mistake, and two evidence cards are pinned to your board.',
      ar: 'يفتح سطح المكتب، ثم تختار الخطأ الأمني الحقيقي، فتُثبَّت بطاقتا دليل على لوحة الأدلة.',
    },
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
        ar: 'آخر تغيير لكلمة المرور: 2026-03-02 · الشروط: 12 خانة أو أكثر، مع رقم واحد ورمز واحد على الأقل.',
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
        ar: 'كلمة المرور غير صحيحة. قارن كل كلمة محتملة بتاريخ التغيير وبالشروط. وانتبه: الأحرف الكبيرة والصغيرة مختلفة.',
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
        ar: 'لقد دخلت. ما الخطأ الأمني الحقيقي هنا؟',
      },
      validator: {
        kind: 'choice',
        correct: 'note',
        options: [
          { id: 'short', label: { en: 'The password is too short', ar: 'كلمة المرور قصيرة' } },
          { id: 'note', label: { en: 'The password was written on a note anyone could read', ar: 'كلمة المرور مكتوبة على ورقة يستطيع أي شخص قراءتها' } },
          { id: 'wifi', label: { en: 'The guest Wi-Fi password is weak', ar: 'كلمة مرور شبكة الضيوف ضعيفة' } },
          { id: 'symbol', label: { en: 'The password uses a symbol', ar: 'كلمة المرور فيها رمز' } },
        ],
      },
      wrong: {
        en: 'Think about how YOU got in. Anyone walking past could do the same.',
        ar: 'فكّر: كيف دخلت أنت؟ أي شخص يمرّ بجانب المكتب يستطيع أن يفعل الشيء نفسه.',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Investigators read the room before the machine. What is stuck to the monitor?',
      ar: 'المحقق يفحص المكان قبل الجهاز. ما الذي أُلصق على الشاشة؟',
    },
    clue: {
      en: 'More than one note looks like a password. The lock screen tells you WHEN it last changed and WHAT a valid one looks like.',
      ar: 'أكثر من ورقة تبدو ككلمة مرور. شاشة القفل تخبرك متى تغيّرت كلمة المرور آخر مرة، وما شروط الكلمة المقبولة.',
    },
    steps: {
      unlock: {
        en: 'Read the line under the password box: changed on 2026-03-02, 12 or more characters, with a number and a symbol. Only the pink note is dated Mar 02. Its first try was rejected, so the final one is the password. Type `Falcon#Rise26` exactly, with the capital letters.',
        ar: 'اقرأ السطر تحت خانة كلمة المرور: تغيّرت في 2026-03-02، وطولها 12 خانة أو أكثر، وفيها رقم ورمز. الورقة الوردية وحدها تحمل تاريخ 2 آذار. المحاولة الأولى فيها رُفضت، فالكلمة الأخيرة هي كلمة المرور. اكتب `Falcon#Rise26` كما هي تماماً، مع الأحرف الكبيرة.',
      },
      'root-cause': {
        en: 'Choose "The password was written on a note anyone could read". The password itself is strong. The problem is where it was kept.',
        ar: 'اختر «كلمة المرور مكتوبة على ورقة يستطيع أي شخص قراءتها». كلمة المرور نفسها قوية، والمشكلة في مكان حفظها.',
      },
    },
    concept: {
      en: 'A strong password protects nothing if it is written where people can see it. Rules that force frequent changes push people to write passwords down. A password manager and two-step login solve the real problem.',
      ar: 'كلمة المرور القوية لا تحمي شيئاً إذا كُتبت في مكان يراه الناس. والقواعد التي تفرض تغييرها كثيراً تدفع الناس إلى كتابتها على الورق. الحل الحقيقي هو برنامج لإدارة كلمات المرور مع التحقق بخطوتين.',
    },
  },
  rewards: { points: 100, achievement: 'first-case' },
  debrief: {
    concept: {
      en: 'Physical reconnaissance: investigators (and attackers) look at the environment first. A password on a sticky note defeats any technical control. Policies that force frequent changes and complex rules push people to write passwords down; NIST SP 800-63B recommends long passphrases checked against breach lists, no forced periodic changes without evidence of compromise, and MFA.',
      ar: 'الاستطلاع الميداني: المحقق (والمهاجم أيضاً) يبدأ بفحص المكان. كلمة مرور مكتوبة على ورقة لاصقة تُلغي أي حماية تقنية. السياسات التي تفرض تغيير كلمة المرور كثيراً وبقواعد معقّدة تدفع الناس إلى كتابتها. لذلك توصي إرشادات NIST SP 800-63B بعبارات مرور طويلة تُفحص مقابل قوائم الكلمات المسرّبة، وبعدم فرض التغيير الدوري إلا عند وجود دليل على اختراق، وباستخدام التحقق بخطوتين (MFA).',
    },
    realTools: ['Scene photography', 'KeePassXC', 'Bitwarden', 'MFA (TOTP / FIDO2)'],
    takeaway: {
      en: 'Document the scene before you touch anything, and treat every visible secret as already compromised.',
      ar: 'وثّق المكان قبل أن تلمس أي شيء، واعتبر أن كل سرّ مكشوف قد تم اختراقه.',
    },
    source: 'NIST SP 800-63B §5.1.1.2 (Memorized Secret Verifiers)',
  },
  echo: {
    intro: {
      en: "I'm ECHO, your analysis assistant. The machine is locked, but people leave traces outside computers too. Look around the screen.",
      ar: 'أنا ECHO، مساعدك في التحليل. الجهاز مقفل، لكن الناس يتركون آثاراً خارج الحاسوب أيضاً. انظر حول الشاشة.',
    },
    success: {
      en: 'Clean entry. Note it on the board: the attacker could have walked in the same way.',
      ar: 'دخول نظيف. سجّل هذا على لوحة الأدلة: المهاجم كان يستطيع الدخول بالطريقة نفسها.',
    },
  },
  solution: 'Notes n1/n3 hold passwords. Lock hint: changed 2026-03-02, policy 12+ chars with number+symbol. n3 "Falcon#Rise26" (13 chars, number, symbol, Mar 02). Choice: note.',
  selfTest: [],
};

export default level;
