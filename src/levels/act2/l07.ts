import type { Email, LevelConfig } from '../../engine/schema';
import { ACT2, INBOX, PHISH, SAMIR, trace } from './story';

const D = ACT2.domain;
const PAYSLIP = `https://${D}.${ACT2.trickDomain}/payroll/login`;
const WIKI = `https://wiki.${D}/it/vpn-guide`;

const extra: Email[] = [
  {
    id: 'payslip',
    from: `"Helix Payroll" <payroll@${ACT2.trickDomain}>`,
    to: SAMIR,
    subject: 'Your March payslip is ready',
    date: '2026-03-13T06:10:00Z',
    headers: trace(`out.${ACT2.trickDomain}`, '203.0.113.81', '2026-03-13T06:10:00Z', '8120'),
    body: `Hello,\n\nYour payslip for March 2026 is available.\n\n[View your payslip on ${D}](${PAYSLIP})\n\nHelix Payroll`,
  },
  {
    id: 'shared-doc',
    from: `"Mei Chen (via Docs)" <share@docs.${ACT2.lookalike}>`,
    to: SAMIR,
    subject: 'Mei shared "Q1 budget - FINAL.xlsx" with you',
    date: '2026-03-13T07:45:00Z',
    headers: trace(`docs.${ACT2.lookalike}`, ACT2.attackerIp, '2026-03-13T07:45:00Z', '8344'),
    body: `Mei Chen shared a file with you.\n\n[Open "Q1 budget - FINAL.xlsx"](https://docs.${ACT2.lookalike}/share/88a1)\n\nYou are receiving this because you are on the Helix finance list.`,
  },
  {
    id: 'git-review',
    from: `Helix Git <git@${D}>`,
    to: SAMIR,
    subject: 'Review requested: infra/vpn !42',
    date: '2026-03-12T11:20:00Z',
    headers: trace(`git.${D}`, '10.20.0.40', '2026-03-12T11:20:00Z', '6017'),
    body: `Mei Chen requested your review on "Rotate VPN certificates".\n\n[infra/vpn !42](https://git.${D}/infra/vpn/-/merge_requests/42)`,
  },
];

const level: LevelConfig = {
  id: 'L07',
  requires: { levels: ['L06'], evidence: ['ev.l06.origin'] },
  briefing: {
    en: 'The same people kept fishing after Samir bit. Phishing links rely on one trick: the text you read is not where the link goes, and the domain you see is not the domain you get. Hover over (or tap) every link in Samir\'s inbox and read the real address from right to left.',
    ar: 'الجهة نفسها واصلت التصيّد بعد أن وقع سمير في الفخ. روابط التصيّد تعتمد على حيلة واحدة: النص الذي تقرؤه ليس المكان الذي يذهب إليه الرابط، والنطاق الذي تراه ليس النطاق الذي تصل إليه. مرّر المؤشر على كل رابط في بريد سمير (أو المسه)، واقرأ العنوان الحقيقي من اليمين إلى اليسار.',
  },
  mission: {
    goal: {
      en: "Check every link in Samir's inbox and find out which site each one really opens.",
      ar: 'افحص كل رابط في بريد سمير، واعرف الموقع الذي يفتحه كل رابط فعلاً.',
    },
    investigate: [
      {
        en: 'The amber bar at the bottom of an open email. Hover over a link (or tap it) and the bar shows its real address.',
        ar: 'الشريط الأصفر في أسفل الرسالة المفتوحة. مرّر المؤشر على الرابط (أو المسه) فيعرض الشريط عنوانه الحقيقي.',
      },
      {
        en: 'The payslip email and the "shared file" email. Both links pretend to be Helix.',
        ar: 'رسالة قسيمة الراتب ورسالة «الملف المشترك». الرابطان فيهما يدّعيان أنهما من Helix.',
      },
      {
        en: 'The end of each address, just before the first `/`. That part names the real owner of the site.',
        ar: 'نهاية كل عنوان، قبل أول رمز `/` مباشرة. هذا الجزء هو الذي يحدد صاحب الموقع الحقيقي.',
      },
    ],
    success: {
      en: 'You have named both attacker domains and picked the only link that is safe. The domains are pinned to your board.',
      ar: 'تكون قد كتبت نطاقَي المهاجم واخترت الرابط الوحيد الآمن. يُثبَّت النطاقان على لوحة الأدلة.',
    },
  },
  apps: ['case', 'mail', 'evidence'],
  autoOpen: ['case', 'mail'],
  world: {
    user: ACT2.user,
    host: ACT2.host,
    home: ACT2.home,
    now: ACT2.now,
    emails: [...extra, PHISH, ...INBOX],
  },
  objectives: [
    {
      id: 'registered',
      prompt: {
        en: 'The payslip link STARTS with `helixdynamics.example`. Which registered domain does it really belong to?',
        ar: 'رابط قسيمة الراتب يبدأ بالاسم `helixdynamics.example`. إلى أي نطاق مسجَّل ينتمي فعلاً؟',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.trickDomain] },
      wrong: {
        en: 'A domain is read from the right. Everything to the left of the last two labels is a subdomain the owner can name however they like.',
        ar: 'النطاق يُقرأ من اليمين. كل ما يقع على يسار آخر جزأين هو نطاق فرعي يسمّيه صاحب النطاق كما يشاء.',
      },
    },
    {
      id: 'lookalike',
      prompt: {
        en: 'Another domain imitates `helixdynamics.example` by changing ONE letter. Type it exactly.',
        ar: 'نطاق آخر يقلّد `helixdynamics.example` بتغيير حرف واحد. اكتبه كما هو تماماً.',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.lookalike, `docs.${ACT2.lookalike}`] },
      wrong: {
        en: 'Compare letter by letter with h-e-l-i-x-d-y-n-a-m-i-c-s. Fonts make l and i look alike.',
        ar: 'قارن حرفاً حرفاً بالاسم `helixdynamics`. بعض الخطوط تجعل الحرفين `l` و`i` متشابهين.',
      },
      grants: [
        {
          id: 'ev.l07.domains',
          title: { en: 'Attacker look-alike domains', ar: 'نطاقات المهاجم المقلِّدة' },
          type: 'domain',
          content: `${ACT2.lookalike}, ${ACT2.trickDomain}`,
          links: ['ev.l06.origin'],
        },
      ],
    },
    {
      id: 'safe',
      prompt: { en: 'Which of these links is actually safe to open?', ar: 'أي رابط من هذه الروابط آمن فعلاً؟' },
      validator: {
        kind: 'choice',
        correct: 'wiki',
        options: [
          { id: 'payslip', label: { en: PAYSLIP, ar: PAYSLIP } },
          { id: 'sso', label: { en: `https://sso.${ACT2.lookalike}/login`, ar: `https://sso.${ACT2.lookalike}/login` } },
          { id: 'wiki', label: { en: WIKI, ar: WIKI } },
          { id: 'dash', label: { en: `https://helixdynamics-example.${ACT2.trickDomain}/`, ar: `https://helixdynamics-example.${ACT2.trickDomain}/` } },
        ],
      },
      wrong: {
        en: 'For each link, find the last two labels before the first "/". Only one ends in exactly helixdynamics.example.',
        ar: 'في كل رابط، انظر إلى آخر جزأين قبل أول رمز `/`. رابط واحد فقط ينتهي بالنطاق `helixdynamics.example` تماماً.',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Hover or tap a link: the amber bar at the bottom of the reader shows where it really goes.',
      ar: 'مرّر المؤشر على الرابط أو المسه: الشريط الأصفر في أسفل نافذة القراءة يعرض وجهته الحقيقية.',
    },
    clue: {
      en: 'In `https://a.b.c.example/path`, the registered domain is `c.example`. The parts `a` and `b` are just labels its owner chose.',
      ar: 'في العنوان `https://a.b.c.example/path` النطاق المسجَّل هو `c.example`. أما `a` و`b` فمجرد أسماء اختارها صاحب النطاق.',
    },
    steps: {
      registered: {
        en: 'Open "Your March payslip is ready" and hover over the link. The bar shows `https://helixdynamics.example.verify-session.example/payroll/login`. Read from the right, before the first `/`: the last two parts are `verify-session.example`. That is the real site.',
        ar: 'افتح الرسالة `Your March payslip is ready` ومرّر المؤشر على الرابط. يعرض الشريط `https://helixdynamics.example.verify-session.example/payroll/login`. اقرأ من اليمين، قبل أول رمز `/`: آخر جزأين هما `verify-session.example`. هذا هو الموقع الحقيقي.',
      },
      lookalike: {
        en: 'Open the email "Mei shared ..." and hover over its link: `https://docs.helixdynamlcs.example/share/88a1`. Compare it with `helixdynamics`: the "i" before "cs" was replaced by an "l". Type `helixdynamlcs.example`.',
        ar: 'افتح الرسالة التي تبدأ بالعبارة `Mei shared` ومرّر المؤشر على رابطها: `https://docs.helixdynamlcs.example/share/88a1`. قارنه بالاسم `helixdynamics`: الحرف `i` الذي قبل `cs` استُبدل بالحرف `l`. اكتب `helixdynamlcs.example`.',
      },
      safe: {
        en: 'Look at where each address ends before the first `/`. Only `https://wiki.helixdynamics.example/it/vpn-guide` ends in exactly `helixdynamics.example`. Choose it.',
        ar: 'انظر أين ينتهي كل عنوان قبل أول رمز `/`. العنوان `https://wiki.helixdynamics.example/it/vpn-guide` وحده ينتهي بالنطاق `helixdynamics.example` تماماً. اختره.',
      },
    },
    concept: {
      en: 'The text of a link and the address it opens can be different. In an address, only the last part before the first slash tells you who owns the site. Attackers buy names that look right, or they hide a trusted name at the start of their own domain.',
      ar: 'نص الرابط قد يختلف عن العنوان الذي يفتحه. وفي العنوان، الجزء الأخير قبل أول شرطة مائلة هو وحده الذي يحدد صاحب الموقع. المهاجمون يشترون أسماء تبدو صحيحة، أو يخفون اسماً موثوقاً في بداية نطاقهم.',
    },
  },
  rewards: { points: 120 },
  debrief: {
    concept: {
      en: 'A link has two parts that can disagree: the text you see and the address it opens. Inside the address, only the registered domain (the label before the public suffix, plus that suffix) says who controls the site. Attackers buy look-alikes (typos, swapped letters like l/i or rn/m, Unicode homoglyphs shown as punycode xn--) or put a trusted name in a subdomain of their own domain.',
      ar: 'للرابط جزءان قد يختلفان: النص الذي تراه، والعنوان الذي يفتحه. وداخل العنوان، النطاق المسجَّل وحده (الاسم الذي قبل اللاحقة العامة مع اللاحقة) يبيّن من يتحكم بالموقع. المهاجمون يشترون نطاقات شبيهة: بأخطاء إملائية، أو بتبديل حروف مثل `l` و`i` أو `rn` و`m`، أو بحروف يونيكود متشابهة تظهر بصيغة `xn--`. أو يضعون اسماً موثوقاً كنطاق فرعي داخل نطاقهم.',
    },
    realTools: ['Hover-to-preview', 'dnstwist', 'Public Suffix List', 'URLScan.io'],
    takeaway: {
      en: 'Read URLs right to left and stop at the registered domain. If you did not expect the email, type the address yourself instead of clicking.',
      ar: 'اقرأ الروابط من اليمين إلى اليسار وتوقف عند النطاق المسجَّل. وإذا لم تكن تنتظر الرسالة، اكتب العنوان بيدك بدل أن تضغط الرابط.',
    },
    source: 'MITRE ATT&CK T1566.002 (Spearphishing Link) and T1583.001 (Acquire Infrastructure: Domains)',
  },
  echo: {
    intro: {
      en: 'Links lie with a straight face. Make every link in this inbox show you its real address before you trust it.',
      ar: 'الروابط تكذب بثقة. اجعل كل رابط في هذا البريد يعرض لك عنوانه الحقيقي قبل أن تثق به.',
    },
    success: {
      en: 'Two attacker domains on the board. Note the shared doc came from 203.0.113.77 too.',
      ar: 'أصبح لدينا نطاقان للمهاجم على لوحة الأدلة. ولاحظ أن رسالة الملف المشترك جاءت أيضاً من `203.0.113.77`.',
    },
  },
  solution: 'Payslip link -> verify-session.example. Shared doc link -> docs.helixdynamlcs.example. Safe: wiki.helixdynamics.example.',
  selfTest: [],
};

export default level;
