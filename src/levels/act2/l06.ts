import type { LevelConfig } from '../../engine/schema';
import { ACT2, INBOX, PHISH } from './story';

const level: LevelConfig = {
  id: 'L06',
  requires: { levels: ['L05'], evidence: ['ev.l02.ip', 'ev.l01.user'] },
  briefing: {
    en: "gh0st logged in as Samir at 03:12 with his real password. Nobody guesses 'Falcon#Rise26'. Someone handed it over. Open Samir's mailbox and look at what arrived the night before. The name on an email is what the sender WANTS you to see; the headers show where it really came from.",
    ar: 'gh0st دخل باسم سمير الساعة 03:12 بكلمة مروره الحقيقية. ما حدا بيخمّن \'Falcon#Rise26\'. في حدا سلّمها. افتح بريد سمير وشوف شو وصله الليلة اللي قبلها. الاسم على الإيميل هو اللي المرسل بدّك تشوفه؛ الترويسات بتوريك من وين إجا فعلاً.',
  },
  apps: ['case', 'mail', 'evidence'],
  autoOpen: ['case', 'mail'],
  world: {
    user: ACT2.user,
    host: ACT2.host,
    home: ACT2.home,
    now: ACT2.now,
    emails: [PHISH, ...INBOX],
  },
  objectives: [
    {
      id: 'return-path',
      prompt: {
        en: 'Open the VPN email and click "Show original". The From line says helixdynamics.example, but which domain do bounces (Return-Path) really go to?',
        ar: 'افتح إيميل الـ VPN واكبس "عرض الأصل". سطر From بيقول helixdynamics.example، بس لأي نطاق بترجع الردود فعلياً (Return-Path)؟',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.lookalike, `mail.${ACT2.lookalike}`] },
      wrong: {
        en: 'Read the part after the @ in the Return-Path header, letter by letter.',
        ar: 'اقرأ الجزء اللي بعد @ بترويسة Return-Path، حرف حرف.',
      },
    },
    {
      id: 'origin-ip',
      prompt: {
        en: 'Received headers stack up, newest on top. Which IP address first handed this email to Helix (the lowest Received line)?',
        ar: 'ترويسات Received بتتكدّس فوق بعض، الأحدث فوق. شو عنوان الـ IP اللي سلّم الإيميل لـ Helix أول مرة (آخر سطر Received تحت)؟',
      },
      placeholder: '0.0.0.0',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: {
        en: 'The top Received line is Helix talking to itself (10.x is internal). Read the bottom one: "from ... [IP]".',
        ar: 'أول سطر Received فوق هو Helix بتحكي مع حالها (10.x داخلي). اقرأ السطر اللي تحت: "from ... [IP]".',
      },
      grants: [
        {
          id: 'ev.l06.origin',
          title: { en: 'Phishing email origin', ar: 'مصدر إيميل التصيّد' },
          type: 'email',
          content: `${ACT2.attackerIp} via mail.${ACT2.lookalike} (Mar 12 22:31)`,
          links: ['ev.l02.ip', 'ev.l01.user'],
        },
      ],
    },
    {
      id: 'why-spoof',
      prompt: {
        en: 'How could the email show an @helixdynamics.example sender if it came from the attacker?',
        ar: 'كيف قدر الإيميل يبيّن مرسل من @helixdynamics.example وهو جاي من المهاجم؟',
      },
      validator: {
        kind: 'choice',
        correct: 'text',
        options: [
          { id: 'hacked', label: { en: 'The attacker hacked the Helix mail server', ar: 'المهاجم اخترق سيرفر بريد Helix' } },
          { id: 'text', label: { en: 'The From header is just text the sender writes; on its own nothing verifies it', ar: 'ترويسة From مجرد نص بيكتبه المرسل؛ لحالها ما في إشي بيتحقق منها' } },
          { id: 'client', label: { en: "Samir's mail client was out of date", ar: 'برنامج البريد عند سمير قديم' } },
          { id: 'encrypted', label: { en: 'Email is encrypted, so the sender cannot be faked', ar: 'الإيميل مشفّر، فما بينفع حدا يزيّف المرسل' } },
        ],
      },
      wrong: {
        en: 'Compare where the email says it is from with where the Received lines prove it came from.',
        ar: 'قارن من وين الإيميل بيقول إنه جاي مع من وين ترويسات Received بتثبت إنه إجا.',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: 'Only one email arrived late on Mar 12 with a deadline in the subject. Open it, then "Show original".', ar: 'في إيميل واحد وصل متأخر يوم 12 آذار وفي موعد نهائي بالعنوان. افتحه وبعدين "عرض الأصل".' },
      cost: 15,
    },
    {
      tier: 'direction',
      text: {
        en: 'In the original, Return-Path and the bottom Received line are written by servers, not by the sender\'s "From" box. Compare their domains with helixdynamics.example.',
        ar: 'بالأصل، Return-Path وآخر سطر Received بيكتبهم السيرفرات، مش خانة "From" عند المرسل. قارن نطاقاتهم مع helixdynamics.example.',
      },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Return-Path ends in helixdynamlcs.example (an L, not an i). The bottom Received line shows the IP in brackets, and you already know it from Act 1.',
        ar: 'Return-Path بينتهي بـ helixdynamlcs.example (حرف L مش i). آخر سطر Received فيه الـ IP بين قوسين، وإنت بتعرفه من الفصل الأول.',
      },
      cost: 50,
    },
  ],
  intel: {
    id: 'intel.l06.reply-to',
    text: {
      en: 'Reply-To also points to the look-alike domain: answers to "IT" would have gone straight to the attacker.',
      ar: 'Reply-To كمان بيأشّر على النطاق الشبيه: أي رد على "IT" كان رح يروح للمهاجم مباشرة.',
    },
  },
  rewards: { points: 120 },
  debrief: {
    concept: {
      en: 'An email has two senders: the envelope sender (MAIL FROM, shown as Return-Path) used by servers, and the From header shown to people. Anyone can type any From. Received headers are added by each server that handles the message, newest on top, so the bottom external hop is the closest you get to the true origin. Headers above that hop can only be trusted if your own servers wrote them.',
      ar: 'الإيميل إله مرسلين: مرسل المغلّف (MAIL FROM، بيبيّن كـ Return-Path) اللي بتستخدمه السيرفرات، وترويسة From اللي بتبيّن للناس. أي حدا بيقدر يكتب أي From. ترويسات Received بيضيفها كل سيرفر بيمرّ عليه الإيميل، الأحدث فوق، فآخر محطة خارجية تحت هي أقرب إشي للمصدر الحقيقي. الترويسات اللي فوقها بتنوثق بس إذا سيرفراتك هي اللي كتبتها.',
    },
    realTools: ['Show original / View source', 'MXToolbox Header Analyzer', 'Google Admin Toolbox Messageheader', 'Thunderbird'],
    takeaway: {
      en: 'Never trust the display name. When an email asks you to act fast, read the headers before you read the request.',
      ar: 'لا تثق بالاسم الظاهر أبداً. لما إيميل يطلب منك تتصرف بسرعة، اقرأ الترويسات قبل ما تقرأ الطلب.',
    },
    source: 'RFC 5321 §4.4 (trace information) and RFC 5322 §3.6 (originator fields)',
  },
  echo: {
    intro: {
      en: 'Someone gave gh0st the password. My bet: an email that looked like it came from inside. Open it and let the headers talk.',
      ar: 'في حدا عطى gh0st كلمة السر. رهاني: إيميل شكله جاي من جوّا الشركة. افتحه وخلّي الترويسات تحكي.',
    },
    success: {
      en: 'Same IP as the 03:12 login. The phishing server and the intruder are one and the same.',
      ar: 'نفس الـ IP تبع دخول 03:12. سيرفر التصيّد والمتسلّل هم نفس الجهة.',
    },
  },
  solution: 'Open "ACTION REQUIRED" email -> Show original. Return-Path bounce-7731@mail.helixdynamlcs.example; bottom Received from mail.helixdynamlcs.example [203.0.113.77] (= ev.l02.ip). Choice: text.',
  selfTest: [],
};

export default level;
