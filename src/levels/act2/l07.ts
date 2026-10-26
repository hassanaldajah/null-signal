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
    ar: 'نفس الجماعة كمّلوا تصيّد بعد ما سمير وقع. روابط التصيّد بتعتمد على حيلة وحدة: النص اللي بتقرأه مش هو وين الرابط بيروح، والنطاق اللي بتشوفه مش هو النطاق اللي بتوصله. مرّر الماوس (أو اكبس) على كل رابط ببريد سمير، واقرأ العنوان الحقيقي من اليمين لليسار.',
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
        en: 'The payslip link STARTS with helixdynamics.example. Which registered domain does it really belong to?',
        ar: 'رابط قسيمة الراتب بيبلّش بـ helixdynamics.example. لأي نطاق مسجّل بينتمي فعلياً؟',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.trickDomain] },
      wrong: {
        en: 'A domain is read from the right. Everything to the left of the last two labels is a subdomain the owner can name however they like.',
        ar: 'النطاق بينقرأ من اليمين. كل إشي على يسار آخر جزأين هو نطاق فرعي، وصاحب النطاق بيسمّيه شو ما بدّه.',
      },
    },
    {
      id: 'lookalike',
      prompt: {
        en: 'Another domain imitates helixdynamics.example by changing ONE letter. Type it exactly.',
        ar: 'في نطاق ثاني بيقلّد helixdynamics.example بتغيير حرف واحد. اكتبه بالزبط.',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.lookalike, `docs.${ACT2.lookalike}`] },
      wrong: {
        en: 'Compare letter by letter with h-e-l-i-x-d-y-n-a-m-i-c-s. Fonts make l and i look alike.',
        ar: 'قارن حرف حرف مع h-e-l-i-x-d-y-n-a-m-i-c-s. الخطوط بتخلّي l و i يشبهوا بعض.',
      },
      grants: [
        {
          id: 'ev.l07.domains',
          title: { en: 'Attacker look-alike domains', ar: 'نطاقات المهاجم الشبيهة' },
          type: 'domain',
          content: `${ACT2.lookalike}, ${ACT2.trickDomain}`,
          links: ['ev.l06.origin'],
        },
      ],
    },
    {
      id: 'safe',
      prompt: { en: 'Which of these links is actually safe to open?', ar: 'أي واحد من هالروابط آمن فعلاً تفتحه؟' },
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
        ar: 'لكل رابط، لاقي آخر جزأين قبل أول "/". واحد بس بينتهي بـ helixdynamics.example بالزبط.',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: 'Hover or tap a link: the amber bar at the bottom of the reader shows where it really goes.', ar: 'مرّر أو اكبس على الرابط: الشريط الأصفر تحت القارئ بيوريك وين بيروح فعلاً.' },
      cost: 15,
    },
    {
      tier: 'direction',
      text: {
        en: 'In https://a.b.c.example/path, the registered domain is c.example. "a" and "b" are just labels its owner chose.',
        ar: 'بـ https://a.b.c.example/path، النطاق المسجّل هو c.example. و "a" و "b" مجرد أسماء اختارها صاحبه.',
      },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Payslip: …helixdynamics.example.verify-session.example → verify-session.example. Shared doc: docs.helixdynamlcs.example (l instead of i).',
        ar: 'القسيمة: …helixdynamics.example.verify-session.example ← verify-session.example. الملف المشترك: docs.helixdynamlcs.example (l بدل i).',
      },
      cost: 50,
    },
  ],
  rewards: { points: 120 },
  debrief: {
    concept: {
      en: 'A link has two parts that can disagree: the text you see and the address it opens. Inside the address, only the registered domain (the label before the public suffix, plus that suffix) says who controls the site. Attackers buy look-alikes (typos, swapped letters like l/i or rn/m, Unicode homoglyphs shown as punycode xn--) or put a trusted name in a subdomain of their own domain.',
      ar: 'الرابط إله جزأين ممكن يختلفوا: النص اللي بتشوفه والعنوان اللي بيفتحه. وجوّا العنوان، بس النطاق المسجّل (الاسم اللي قبل اللاحقة العامة مع اللاحقة) بيحكي مين بيتحكّم بالموقع. المهاجمين بيشتروا نطاقات شبيهة (أخطاء إملائية، تبديل حروف زي l و i أو rn و m، أو حروف يونيكود شبيهة بتبيّن كـ punycode بـ xn--) أو بيحطّوا اسم موثوق كنطاق فرعي جوّا نطاقهم.',
    },
    realTools: ['Hover-to-preview', 'dnstwist', 'Public Suffix List', 'URLScan.io'],
    takeaway: {
      en: 'Read URLs right to left and stop at the registered domain. If you did not expect the email, type the address yourself instead of clicking.',
      ar: 'اقرأ الروابط من اليمين لليسار ووقّف عند النطاق المسجّل. إذا ما كنت متوقّع الإيميل، اكتب العنوان بإيدك بدل ما تكبس.',
    },
    source: 'MITRE ATT&CK T1566.002 (Spearphishing Link) and T1583.001 (Acquire Infrastructure: Domains)',
  },
  echo: {
    intro: {
      en: 'Links lie with a straight face. Make every link in this inbox show you its real address before you trust it.',
      ar: 'الروابط بتكذب وهي واثقة. خلّي كل رابط بهالبريد يوريك عنوانه الحقيقي قبل ما تثق فيه.',
    },
    success: {
      en: 'Two attacker domains on the board. Note the shared doc came from 203.0.113.77 too.',
      ar: 'صار عنا نطاقين للمهاجم على اللوحة. ولاحظ إنه الملف المشترك كمان إجا من 203.0.113.77.',
    },
  },
  solution: 'Payslip link -> verify-session.example. Shared doc link -> docs.helixdynamlcs.example. Safe: wiki.helixdynamics.example.',
  selfTest: [],
};

export default level;
