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
    ar: 'زعيم الفصل. gh0st كان معه كلمة مرور سمير. وين كمان اشتغلت؟ مدير كلمات المرور عند سمير بيطلّع تقرير صحة بيبيّن أي عناصر بتشارك نفس كلمة المرور (كرقم مجموعة، مش كلمة المرور نفسها). و NovaBackup بعثوا سجل التدقيق لبوابتهم. لاقي كلمة المرور المكرّرة، وبعدين اتبعها لجوّا بوابة المورّد.',
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
      prompt: { en: "Which other site shares the same password as Samir's Helix VPN?", ar: 'أي موقع ثاني بيشارك نفس كلمة مرور الـ VPN تبع سمير؟' },
      placeholder: 'site',
      validator: { kind: 'answer', accept: [ACT3.portal] },
      wrong: { en: 'Entries with the same reuse_group letter share one password.', ar: 'العناصر اللي إلها نفس حرف reuse_group بتشارك كلمة مرور وحدة.' },
    },
    {
      id: 'count',
      prompt: { en: 'How many of Samir\'s entries share their password with at least one other entry?', ar: 'كم عنصر عند سمير بيشارك كلمة مروره مع عنصر ثاني على الأقل؟' },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['4', 'four'] },
      derived: 'group A has 2 entries, group B has 2 entries',
      wrong: { en: 'Count every row whose last column is not "-".', ar: 'عدّ كل سطر عموده الأخير مش "-".' },
    },
    {
      id: 'login',
      prompt: { en: "When (UTC, HH:MM) did the attacker's IP log in to the portal as s.haddad?", ar: 'الساعة كم (UTC، HH:MM) دخل IP المهاجم على البوابة باسم s.haddad؟' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:20', '03:20:44'] },
      wrong: { en: `grep ${ACT3.attackerIp} in the portal audit log.`, ar: `اعمل grep على ${ACT3.attackerIp} بسجل البوابة.` },
      grants: [
        {
          id: 'ev.l15.reuse',
          title: { en: 'Password reuse: vendor portal', ar: 'إعادة استخدام كلمة المرور: بوابة المورّد' },
          type: 'credential',
          content: `s.haddad reused his VPN password on ${ACT3.portal}; attacker logged in 03:20 and exported ${ACT3.exportJob}`,
          links: ['ev.l11.loot', 'ev.l10.patient-zero'],
        },
      ],
    },
    {
      id: 'downloader',
      prompt: { en: 'The export was downloaded 20 minutes later in the SAME session. By which portal account?', ar: 'التصدير انتنزل بعد 20 دقيقة بنفس الجلسة. من أي حساب على البوابة؟' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: [ACT3.portalAdmin] },
      wrong: { en: `Follow the session id ${SESSION} through the log.`, ar: `اتبع رقم الجلسة ${SESSION} بالسجل.` },
      grants: [
        {
          id: 'ev.l15.vendor',
          title: { en: 'Vendor account in the attack session', ar: 'حساب المورّد بجلسة الهجوم' },
          type: 'person',
          content: `${ACT3.portalAdmin} from ${ACT3.vendorIp} downloaded ${ACT3.exportJob}.tar in session ${SESSION}`,
          links: ['ev.l15.reuse', 'ev.l14.noise'],
        },
      ],
    },
    {
      id: 'lesson',
      prompt: { en: 'What would have stopped this chain?', ar: 'شو كان رح يوقف هالسلسلة؟' },
      validator: {
        kind: 'choice',
        correct: 'unique',
        options: [
          { id: 'longer', label: { en: 'A longer version of the same password everywhere', ar: 'نسخة أطول من نفس كلمة المرور بكل مكان' } },
          { id: 'unique', label: { en: 'A unique password per site (password manager) plus MFA on the vendor portal', ar: 'كلمة مرور مختلفة لكل موقع (مدير كلمات مرور) ومعها مصادقة ثنائية على بوابة المورّد' } },
          { id: 'write', label: { en: 'Writing passwords on paper instead', ar: 'نكتب كلمات المرور على ورق بدالها' } },
          { id: 'vpn', label: { en: 'Turning the VPN off at night', ar: 'نطفي الـ VPN بالليل' } },
        ],
      },
      wrong: { en: 'One stolen password opened two doors. What makes a stolen password useless elsewhere?', ar: 'كلمة مرور مسروقة وحدة فتحت بابين. شو اللي بيخلّي كلمة المرور المسروقة ما بتنفع بمكان ثاني؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: '`cat samir-vault-health.csv`, then look inside novabackup/.', ar: '`cat samir-vault-health.csv`، وبعدين شوف جوّا novabackup/.' }, cost: 30 },
    { tier: 'direction', text: { en: `Group A = the VPN password. Then \`grep ${SESSION} novabackup/portal-audit.log\`.`, ar: `المجموعة A هي كلمة مرور الـ VPN. وبعدين \`grep ${SESSION} novabackup/portal-audit.log\`.` }, cost: 50 },
    { tier: 'near-solution', text: { en: `Reused on ${ACT3.portal}; 4 reused entries; login 03:20; the download line names ${ACT3.portalAdmin}.`, ar: `انعاد استخدامها على ${ACT3.portal}؛ 4 عناصر مكرّرة؛ الدخول 03:20؛ وسطر التنزيل فيه ${ACT3.portalAdmin}.` }, cost: 70 },
  ],
  rewards: { points: 250, achievement: 'act3-clear' },
  debrief: {
    concept: {
      en: 'Password reuse turns one stolen password into many breaches: attackers simply try it on every other service the victim uses. Password managers prevent reuse and can report it without revealing any secret. Session IDs in audit logs tie actions together: here one session was opened with a stolen password from the attacker\'s IP and then used by a vendor admin account, which means the vendor side is now part of the investigation.',
      ar: 'إعادة استخدام كلمة المرور بتحوّل كلمة مسروقة وحدة لاختراقات كثيرة: المهاجم بيجرّبها ببساطة على كل خدمة ثانية بيستخدمها الضحية. مدير كلمات المرور بيمنع التكرار وبيقدر يبلّغ عنه بدون ما يكشف أي سر. وأرقام الجلسات بسجلات التدقيق بتربط الأفعال ببعض: هون جلسة وحدة انفتحت بكلمة مرور مسروقة من IP المهاجم، وبعدين استخدمها حساب مدير عند المورّد، يعني المورّد صار جزء من التحقيق.',
    },
    realTools: ['Bitwarden / KeePassXC reports', 'Have I Been Pwned (notifications)', 'SIEM session correlation', 'Vendor access reviews'],
    takeaway: {
      en: 'One password per site, MFA everywhere, and review third-party access like your own.',
      ar: 'كلمة مرور وحدة لكل موقع، مصادقة ثنائية بكل مكان، وراجع وصول الجهات الخارجية زي ما بتراجع وصولك.',
    },
    source: 'MITRE ATT&CK T1078 (Valid Accounts) and T1199 (Trusted Relationship); NIST SP 800-63B',
  },
  echo: {
    intro: { en: 'One password, how many doors? Follow the reuse, then follow the session.', ar: 'كلمة مرور وحدة، كم باب بتفتح؟ اتبع التكرار، وبعدين اتبع الجلسة.' },
    success: { en: 'The stolen password opened the vendor portal, and a NovaBackup admin finished the job. The vendor IP from Act 1 is back.', ar: 'كلمة المرور المسروقة فتحت بوابة المورّد، ومدير من NovaBackup كمّل الشغلة. و IP المورّد من الفصل الأول رجع.' },
  },
  ghost: {
    taunt: { en: 'Backups are wonderful. Everything you ever had, in one tidy archive. Thank you, Helix.', ar: 'النسخ الاحتياطية رائعة. كل إشي عندكم، بأرشيف واحد مرتّب. شكراً يا Helix.' },
  },
  solution: 'Vault report: group A = Helix VPN + portal.novabackup.example; 4 entries reused (A,A,B,B). Audit: 203.0.113.77 login 03:20:44, export helix-full-2026-03, download by kmercer-admin from 198.51.100.23 in sess-7f3a91. Choice: unique.',
  selfTest: [
    { run: `cat ${REPORT}`, includes: `${ACT3.portal},s.haddad,strong,A` },
    { run: `grep ${SESSION} ${AUDIT}`, includes: ACT3.portalAdmin },
    { run: `grep ${ACT3.attackerIp} ${AUDIT}`, includes: '03:20:44' },
  ],
};

export default level;
