import type { LevelConfig } from '../../engine/schema';
import { ACT3 } from './story';

const CASE = '/cases/helix-0313';
const REPORT = `${CASE}/samir-vault-health.csv`;
const AUDIT = `${CASE}/novabackup/portal-audit.log`;
const SESSION = 'sess-7f3a91';

const level: LevelConfig = {
  id: 'L15',
  requires: { levels: ['L14'], evidence: ['ev.l10.patient-zero', 'ev.l11.loot', 'ev.l14.noise'] },
  briefing: {
    en: "MINI-BOSS. gh0st had Samir's password. Where else did it work? Samir's password manager can export a health report that shows which entries share a password (as a group label, never the password itself). NovaBackup also sent their portal audit log. Find the reused password, then follow it into the vendor's portal.",
    ar: 'تحدّي الفصل. كانت كلمة مرور سمير مع gh0st. فأين نجحت أيضاً؟ برنامج إدارة كلمات المرور عند سمير يصدر تقريراً يبيّن العناصر التي تشترك في كلمة مرور واحدة (بحرف يدل على المجموعة، لا بكلمة المرور نفسها). وأرسلت شركة NovaBackup سجل التدقيق لبوابتها. اعثر على كلمة المرور المكرَّرة، ثم تتبّعها إلى داخل بوابة المورّد.',
  },
  mission: {
    goal: {
      en: "Find where else Samir used his VPN password, then follow the stolen password into the vendor's portal.",
      ar: 'اعرف أين استخدم سمير كلمة مرور VPN نفسها أيضاً، ثم تتبّع الكلمة المسروقة إلى داخل بوابة المورّد.',
    },
    investigate: [
      {
        en: 'The file `samir-vault-health.csv`: entries with the same letter in `reuse_group` share one password.',
        ar: 'الملف `samir-vault-health.csv`: العناصر التي لها الحرف نفسه في العمود `reuse_group` تشترك في كلمة مرور واحدة.',
      },
      {
        en: 'The file `novabackup/portal-audit.log`: logins, exports and downloads on the vendor portal.',
        ar: 'الملف `novabackup/portal-audit.log`: عمليات الدخول والتصدير والتنزيل في بوابة المورّد.',
      },
      {
        en: 'The session number `sess-7f3a91`. Follow it from the login to the download.',
        ar: 'رقم الجلسة `sess-7f3a91`: تتبّعه من الدخول إلى التنزيل.',
      },
    ],
    success: {
      en: 'You have named the site with the reused password, the time the attacker logged in to it, and the vendor account that downloaded the export.',
      ar: 'تكون قد كتبت الموقع الذي تكررت فيه كلمة المرور، ووقت دخول المهاجم إليه، وحساب المورّد الذي نزّل ملف التصدير.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: 'helix-soc01',
    home: '/home/a.nasser',
    cwd: CASE,
    now: ACT3.now,
    files: {
      [REPORT]: [
        'entry,site,username,strength,reuse_group',
        `Helix VPN,vpn.${ACT3.domain},s.haddad,strong,A`,
        `NovaBackup portal,${ACT3.portal},s.haddad,strong,A`,
        'Personal mail,mail.example,samir.h,strong,-',
        'Bank,bank.example,shaddad,strong,-',
        `Old wiki,wiki.${ACT3.domain},s.haddad,weak,B`,
        'Cycling forum,forum.example,samirh,weak,B',
      ].join('\n') + '\n',
      [AUDIT]: [
        '# time,user,source_ip,action,detail,session',
        `2026-03-11T07:01:10Z,s.haddad,10.20.4.17,login,password ok + no MFA,sess-11aa02`,
        `2026-03-11T07:03:40Z,s.haddad,10.20.4.17,view,reports/2026-02,sess-11aa02`,
        `2026-03-12T16:20:00Z,${ACT3.portalAdmin},${ACT3.vendorIp},login,password ok + MFA,sess-6c0b10`,
        `2026-03-13T03:20:44Z,s.haddad,${ACT3.attackerIp},login,password ok + no MFA,${SESSION}`,
        `2026-03-13T03:22:10Z,s.haddad,${ACT3.attackerIp},export,job=${ACT3.exportJob} (all Helix backups),${SESSION}`,
        `2026-03-13T03:41:55Z,${ACT3.portalAdmin},${ACT3.vendorIp},download,${ACT3.exportJob}.tar (182 GB),${SESSION}`,
        `2026-03-13T09:10:00Z,support,${ACT3.vendorIp},note,"customer reports incident",sess-90ff21`,
      ].join('\n') + '\n',
    },
  },
  objectives: [
    {
      id: 'reused',
      prompt: { en: "In `samir-vault-health.csv`, which other site shares the same password as Samir's Helix VPN?", ar: 'في الملف `samir-vault-health.csv`، أي موقع آخر يستخدم كلمة المرور نفسها التي لحساب Helix VPN عند سمير؟' },
      placeholder: 'site',
      validator: { kind: 'answer', accept: [ACT3.portal] },
      wrong: { en: 'Entries with the same reuse_group letter share one password.', ar: 'العناصر التي لها الحرف نفسه في العمود `reuse_group` تشترك في كلمة مرور واحدة.' },
    },
    {
      id: 'count',
      prompt: { en: 'How many of Samir\'s entries share their password with at least one other entry?', ar: 'كم عنصراً عند سمير يشترك في كلمة مروره مع عنصر آخر على الأقل؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['4', 'four'] },
      derived: 'group A has 2 entries, group B has 2 entries',
      wrong: { en: 'Count every row whose last column is not "-".', ar: 'عُدّ كل سطر ليست قيمة عموده الأخير `-`.' },
    },
    {
      id: 'login',
      prompt: { en: "In `novabackup/portal-audit.log`, when did the attacker's IP log in to the portal as `s.haddad`? (UTC, HH:MM)", ar: 'في الملف `novabackup/portal-audit.log`، في أي ساعة دخل عنوان المهاجم إلى البوابة باسم `s.haddad`؟ (بتوقيت UTC وبصيغة HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:20', '03:20:44'] },
      wrong: { en: `grep ${ACT3.attackerIp} in the portal audit log.`, ar: 'ابحث عن `203.0.113.77` في سجل تدقيق البوابة بالأمر `grep`.' },
      grants: [
        {
          id: 'ev.l15.reuse',
          title: { en: 'Password reuse: vendor portal', ar: 'كلمة مرور مكرَّرة في بوابة المورّد' },
          type: 'credential',
          content: `s.haddad reused his VPN password on ${ACT3.portal}; attacker logged in 03:20 and exported ${ACT3.exportJob}`,
          links: ['ev.l11.loot', 'ev.l10.patient-zero'],
        },
      ],
    },
    {
      id: 'downloader',
      prompt: { en: 'The export was downloaded 20 minutes later in the SAME session. By which portal account?', ar: 'نُزّل ملف التصدير بعد 20 دقيقة في الجلسة نفسها. بأي حساب في البوابة؟' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: [ACT3.portalAdmin] },
      wrong: { en: `Follow the session id ${SESSION} through the log.`, ar: 'تتبّع رقم الجلسة `sess-7f3a91` في السجل.' },
      grants: [
        {
          id: 'ev.l15.vendor',
          title: { en: 'Vendor account in the attack session', ar: 'حساب المورّد في جلسة الهجوم' },
          type: 'person',
          content: `${ACT3.portalAdmin} from ${ACT3.vendorIp} downloaded ${ACT3.exportJob}.tar in session ${SESSION}`,
          links: ['ev.l15.reuse', 'ev.l14.noise'],
        },
      ],
    },
    {
      id: 'lesson',
      prompt: { en: 'What would have stopped this chain?', ar: 'ما الذي كان سيوقف هذه السلسلة؟' },
      validator: {
        kind: 'choice',
        correct: 'unique',
        options: [
          { id: 'longer', label: { en: 'A longer version of the same password everywhere', ar: 'نسخة أطول من كلمة المرور نفسها في كل مكان' } },
          { id: 'unique', label: { en: 'A unique password per site (password manager) plus MFA on the vendor portal', ar: 'كلمة مرور مختلفة لكل موقع (ببرنامج لإدارة كلمات المرور) مع التحقق بخطوتين في بوابة المورّد' } },
          { id: 'write', label: { en: 'Writing passwords on paper instead', ar: 'كتابة كلمات المرور على الورق بدلاً من ذلك' } },
          { id: 'vpn', label: { en: 'Turning the VPN off at night', ar: 'إيقاف VPN في الليل' } },
        ],
      },
      wrong: { en: 'One stolen password opened two doors. What makes a stolen password useless elsewhere?', ar: 'كلمة مرور مسروقة واحدة فتحت بابين. ما الذي يجعل كلمة المرور المسروقة بلا فائدة في مكان آخر؟' },
    },
  ],
  guide: {
    nudge: {
      en: '`cat samir-vault-health.csv`, then look inside the `novabackup` folder.',
      ar: 'شغّل `cat samir-vault-health.csv` ثم انظر داخل المجلد `novabackup`.',
    },
    clue: {
      en: `Group A = the VPN password. Then \`grep ${SESSION} novabackup/portal-audit.log\`.`,
      ar: 'المجموعة A هي كلمة مرور VPN. ثم شغّل `grep sess-7f3a91 novabackup/portal-audit.log`.',
    },
    steps: {
      reused: {
        en: 'Run `cat samir-vault-health.csv`. The "Helix VPN" row has `A` in the last column. The only other row with `A` is the NovaBackup portal. Type `portal.novabackup.example`.',
        ar: 'شغّل `cat samir-vault-health.csv`. سطر Helix VPN فيه الحرف `A` في العمود الأخير. السطر الآخر الوحيد الذي فيه `A` هو بوابة NovaBackup. اكتب `portal.novabackup.example`.',
      },
      count: {
        en: 'Count the rows whose last column is not `-`: two rows in group A and two rows in group B. The answer is 4.',
        ar: 'عُدّ الأسطر التي ليست قيمة عمودها الأخير `-`: سطران في المجموعة A وسطران في المجموعة B. الجواب 4.',
      },
      login: {
        en: 'Run `grep 203.0.113.77 novabackup/portal-audit.log`. The login line starts with `2026-03-13T03:20:44Z`. Type `03:20`.',
        ar: 'شغّل `grep 203.0.113.77 novabackup/portal-audit.log`. سطر الدخول يبدأ بالوقت `2026-03-13T03:20:44Z`. اكتب `03:20`.',
      },
      downloader: {
        en: 'Run `grep sess-7f3a91 novabackup/portal-audit.log`. The same session ends with a `download` line by the account `kmercer-admin`.',
        ar: 'شغّل `grep sess-7f3a91 novabackup/portal-audit.log`. الجلسة نفسها تنتهي بسطر `download` نفّذه الحساب `kmercer-admin`.',
      },
      lesson: {
        en: 'Choose "A unique password per site (password manager) plus MFA on the vendor portal".',
        ar: 'اختر الجواب الذي يذكر كلمة مرور مختلفة لكل موقع مع التحقق بخطوتين في بوابة المورّد.',
      },
    },
    concept: {
      en: 'When one password is used on several sites, stealing it once opens them all. A password manager gives every site its own password and can report reuse without showing any secret. A session number in a log connects actions that belong together.',
      ar: 'عند استخدام كلمة مرور واحدة في عدة مواقع، تكفي سرقتها مرة واحدة لفتحها كلها. برنامج إدارة كلمات المرور يعطي كل موقع كلمة خاصة به، ويستطيع الإبلاغ عن التكرار دون كشف أي سر. ورقم الجلسة في السجل يربط الأفعال التابعة للعملية نفسها.',
    },
  },
  rewards: { points: 250, achievement: 'act3-clear' },
  debrief: {
    concept: {
      en: 'Password reuse turns one stolen password into many breaches: attackers simply try it on every other service the victim uses. Password managers prevent reuse and can report it without revealing any secret. Session IDs in audit logs tie actions together: here one session was opened with a stolen password from the attacker\'s IP and then used by a vendor admin account, which means the vendor side is now part of the investigation.',
      ar: 'تكرار كلمة المرور يحوّل سرقة واحدة إلى اختراقات كثيرة: المهاجم يجرّب الكلمة ببساطة في كل خدمة أخرى يستخدمها الضحية. برنامج إدارة كلمات المرور يمنع التكرار ويستطيع الإبلاغ عنه دون كشف أي سر. وأرقام الجلسات في سجلات التدقيق تربط الأفعال بعضها ببعض: هنا فُتحت جلسة واحدة بكلمة مرور مسروقة من عنوان المهاجم، ثم استخدمها حساب مدير عند المورّد، أي أن جهة المورّد أصبحت جزءاً من التحقيق.',
    },
    realTools: ['Bitwarden / KeePassXC reports', 'Have I Been Pwned (notifications)', 'SIEM session correlation', 'Vendor access reviews'],
    takeaway: {
      en: 'One password per site, MFA everywhere, and review third-party access like your own.',
      ar: 'كلمة مرور خاصة بكل موقع، وتحقق بخطوتين في كل مكان، وراجع وصول الجهات الخارجية كما تراجع وصول موظفيك.',
    },
    source: 'MITRE ATT&CK T1078 (Valid Accounts) and T1199 (Trusted Relationship); NIST SP 800-63B',
  },
  echo: {
    intro: { en: 'One password, how many doors? Follow the reuse, then follow the session.', ar: 'كلمة مرور واحدة، فكم باباً تفتح؟ تتبّع التكرار أولاً، ثم تتبّع الجلسة.' },
    success: { en: 'The stolen password opened the vendor portal, and a NovaBackup admin finished the job. The vendor IP from Act 1 is back.', ar: 'كلمة المرور المسروقة فتحت بوابة المورّد، ثم أكمل المهمة حساب مدير من NovaBackup. وعنوان المورّد الذي رأيناه في الفصل الأول عاد إلى الظهور.' },
  },
  ghost: {
    taunt: { en: 'Backups are wonderful. Everything you ever had, in one tidy archive. Thank you, Helix.', ar: 'النسخ الاحتياطية رائعة: كل ما تملكونه في أرشيف واحد مرتّب. شكراً يا Helix.' },
  },
  solution: 'Vault report: group A = Helix VPN + portal.novabackup.example; 4 entries reused (A,A,B,B). Audit: 203.0.113.77 login 03:20:44, export helix-full-2026-03, download by kmercer-admin from 198.51.100.23 in sess-7f3a91. Choice: unique.',
  selfTest: [
    { run: `cat ${REPORT}`, includes: `${ACT3.portal},s.haddad,strong,A` },
    { run: `grep ${SESSION} ${AUDIT}`, includes: ACT3.portalAdmin },
    { run: `grep ${ACT3.attackerIp} ${AUDIT}`, includes: '03:20:44' },
  ],
};

export default level;
