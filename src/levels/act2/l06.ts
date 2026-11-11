import type { LevelConfig } from '../../engine/schema';
import { ACT2, INBOX, PHISH } from './story';

const level: LevelConfig = {
  id: 'L06',
  requires: { levels: ['L05'], evidence: ['ev.l02.ip', 'ev.l01.user'] },
  briefing: {
    en: "gh0st logged in as Samir at 03:12 with his real password. Nobody guesses 'Falcon#Rise26'. Someone handed it over. Open Samir's mailbox and look at what arrived the night before. The name on an email is what the sender WANTS you to see; the headers show where it really came from.",
    ar: 'دخل gh0st باسم سمير الساعة 03:12 بكلمة مروره الحقيقية. لا أحد يخمّن كلمة مثل `Falcon#Rise26`. هناك من سلّمها له. افتح بريد سمير وانظر ماذا وصله في الليلة السابقة. الاسم الظاهر على الرسالة هو ما يريد المرسِل أن تراه، أما الترويسات فتبيّن من أين جاءت فعلاً.',
  },
  mission: {
    goal: {
      en: 'Open the fake "IT" email in Samir\'s inbox and use its hidden headers to prove where it really came from.',
      ar: 'افتح رسالة «قسم التقنية» المزيّفة في بريد سمير، واستخدم ترويساتها المخفية لتثبت من أين جاءت فعلاً.',
    },
    investigate: [
      {
        en: 'The email "ACTION REQUIRED: your VPN certificate expires tonight" in the inbox.',
        ar: 'الرسالة التي عنوانها `ACTION REQUIRED: your VPN certificate expires tonight` في صندوق الوارد.',
      },
      {
        en: 'The "Show original" button. It shows the headers that mail servers wrote.',
        ar: 'زر «عرض الأصل»: يعرض الترويسات التي كتبتها خوادم البريد.',
      },
      {
        en: 'Two headers: `Return-Path`, and the lowest `Received` line with an IP in square brackets.',
        ar: 'ترويستان: `Return-Path`، وآخر سطر `Received` في الأسفل وفيه عنوان IP بين قوسين مربعين.',
      },
    ],
    success: {
      en: 'You have given the real sending domain and the sending IP, and explained why the "From" name could be faked.',
      ar: 'تكون قد كتبت النطاق الحقيقي للمرسِل وعنوان IP الذي أرسل الرسالة، وشرحت كيف أمكن تزوير اسم المرسِل.',
    },
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
        en: 'Open the VPN email and click "Show original". The `From` line says `helixdynamics.example`, but which domain is really written in `Return-Path`?',
        ar: 'افتح رسالة VPN واضغط «عرض الأصل». سطر `From` يقول `helixdynamics.example`، لكن ما النطاق المكتوب فعلاً في `Return-Path`؟',
      },
      placeholder: 'domain',
      validator: { kind: 'answer', accept: [ACT2.lookalike, `mail.${ACT2.lookalike}`] },
      wrong: {
        en: 'Read the part after the @ in the Return-Path header, letter by letter.',
        ar: 'اقرأ الجزء الذي يأتي بعد `@` في الترويسة `Return-Path`، حرفاً حرفاً.',
      },
    },
    {
      id: 'origin-ip',
      prompt: {
        en: '`Received` headers stack up, newest on top. Which IP address first handed this email to Helix? (the lowest `Received` line)',
        ar: 'ترويسات `Received` تتراكم والأحدث في الأعلى. ما عنوان IP الذي سلّم هذه الرسالة إلى Helix أول مرة؟ (آخر سطر `Received` في الأسفل)',
      },
      placeholder: '0.0.0.0',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: {
        en: 'The top Received line is Helix talking to itself (10.x is internal). Read the bottom one: "from ... [IP]".',
        ar: 'أعلى سطر `Received` هو خادم Helix يخاطب نفسه (العناوين التي تبدأ بالرقم 10 داخلية). اقرأ السطر السفلي: `from ... [IP]`.',
      },
      grants: [
        {
          id: 'ev.l06.origin',
          title: { en: 'Phishing email origin', ar: 'مصدر رسالة التصيّد' },
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
        ar: 'كيف ظهرت الرسالة كأنها من `@helixdynamics.example` وهي قادمة من المهاجم؟',
      },
      validator: {
        kind: 'choice',
        correct: 'text',
        options: [
          { id: 'hacked', label: { en: 'The attacker hacked the Helix mail server', ar: 'المهاجم اخترق خادم بريد Helix' } },
          { id: 'text', label: { en: 'The From header is just text the sender writes; on its own nothing verifies it', ar: 'الترويسة From مجرد نص يكتبه المرسِل، ولا شيء يتحقق منها وحدها' } },
          { id: 'client', label: { en: "Samir's mail client was out of date", ar: 'برنامج البريد عند سمير قديم' } },
          { id: 'encrypted', label: { en: 'Email is encrypted, so the sender cannot be faked', ar: 'البريد مشفّر، فلا يمكن تزوير المرسِل' } },
        ],
      },
      wrong: {
        en: 'Compare where the email says it is from with where the Received lines prove it came from.',
        ar: 'قارن بين المكان الذي تدّعي الرسالة أنها جاءت منه، والمكان الذي تثبته ترويسات `Received`.',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Only one email arrived late on Mar 12 with a deadline in the subject. Open it, then "Show original".',
      ar: 'رسالة واحدة فقط وصلت في وقت متأخر من يوم 12 آذار وفي عنوانها موعد نهائي. افتحها ثم اضغط «عرض الأصل».',
    },
    clue: {
      en: 'In the original, `Return-Path` and the bottom `Received` line are written by servers, not by the sender\'s "From" box. Compare their domains with `helixdynamics.example`.',
      ar: 'في الرسالة الأصلية، الترويسة `Return-Path` وآخر سطر `Received` في الأسفل تكتبهما الخوادم، لا خانة `From` عند المرسِل. قارن النطاق فيهما بالنطاق `helixdynamics.example`.',
    },
    steps: {
      'return-path': {
        en: 'Open the VPN email and press "Show original". The first line is `Return-Path: <bounce-7731@mail.helixdynamlcs.example>`. Read the domain letter by letter: it has an "l" where the "i" should be. Type `helixdynamlcs.example`.',
        ar: 'افتح رسالة VPN واضغط «عرض الأصل». السطر الأول هو `Return-Path: <bounce-7731@mail.helixdynamlcs.example>`. اقرأ النطاق حرفاً حرفاً: فيه الحرف `l` في مكان الحرف `i`. اكتب `helixdynamlcs.example`.',
      },
      'origin-ip': {
        en: "There are two `Received` lines. The top one is Helix's own server (`10.20.0.25`). The lower one says `from mail.helixdynamlcs.example [203.0.113.77]`: this is the outside server that handed the email to Helix. Type `203.0.113.77`.",
        ar: 'يوجد سطران من نوع `Received`. السطر العلوي هو خادم Helix نفسه (`10.20.0.25`). السطر السفلي فيه `from mail.helixdynamlcs.example [203.0.113.77]`: هذا هو الخادم الخارجي الذي سلّم الرسالة إلى Helix. اكتب `203.0.113.77`.',
      },
      'why-spoof': {
        en: 'Choose "The From header is just text the sender writes; on its own nothing verifies it".',
        ar: 'اختر «الترويسة From مجرد نص يكتبه المرسِل، ولا شيء يتحقق منها وحدها».',
      },
    },
    concept: {
      en: 'The name and address you see in "From" are just text typed by the sender. The `Return-Path` and `Received` headers are added by mail servers, so they are much harder to fake. When an email asks you to hurry, read the headers before you act.',
      ar: 'الاسم والعنوان الظاهران في خانة المرسِل مجرد نص يكتبه المرسِل نفسه. أما الترويستان `Return-Path` و`Received` فتضيفهما خوادم البريد، ولذلك تزويرهما أصعب بكثير. عندما تطلب منك رسالة أن تستعجل، اقرأ الترويسات قبل أن تتصرف.',
    },
  },
  intel: {
    id: 'intel.l06.reply-to',
    text: {
      en: 'Reply-To also points to the look-alike domain: answers to "IT" would have gone straight to the attacker.',
      ar: 'الترويسة `Reply-To` تشير أيضاً إلى النطاق المزيّف: أي رد على «قسم التقنية» كان سيذهب مباشرة إلى المهاجم.',
    },
  },
  rewards: { points: 120 },
  debrief: {
    concept: {
      en: 'An email has two senders: the envelope sender (MAIL FROM, shown as Return-Path) used by servers, and the From header shown to people. Anyone can type any From. Received headers are added by each server that handles the message, newest on top, so the bottom external hop is the closest you get to the true origin. Headers above that hop can only be trusted if your own servers wrote them.',
      ar: 'لكل رسالة بريد مرسِلان: مرسِل المغلّف (`MAIL FROM`، ويظهر في `Return-Path`) وتستخدمه الخوادم، والترويسة `From` التي يراها الناس. أي شخص يستطيع كتابة أي شيء في `From`. ترويسات `Received` يضيفها كل خادم تمرّ به الرسالة، والأحدث في الأعلى، فآخر محطة خارجية في الأسفل هي أقرب شيء إلى المصدر الحقيقي. والترويسات التي فوقها لا يوثق بها إلا إذا كتبتها خوادمك أنت.',
    },
    realTools: ['Show original / View source', 'MXToolbox Header Analyzer', 'Google Admin Toolbox Messageheader', 'Thunderbird'],
    takeaway: {
      en: 'Never trust the display name. When an email asks you to act fast, read the headers before you read the request.',
      ar: 'لا تثق بالاسم الظاهر أبداً. عندما تطلب منك رسالة أن تتصرف بسرعة، اقرأ الترويسات قبل أن تقرأ الطلب.',
    },
    source: 'RFC 5321 §4.4 (trace information) and RFC 5322 §3.6 (originator fields)',
  },
  echo: {
    intro: {
      en: 'Someone gave gh0st the password. My bet: an email that looked like it came from inside. Open it and let the headers talk.',
      ar: 'هناك من أعطى gh0st كلمة المرور. أتوقع أنها رسالة تبدو كأنها من داخل الشركة. افتحها ودع الترويسات تتكلم.',
    },
    success: {
      en: 'Same IP as the 03:12 login. The phishing server and the intruder are one and the same.',
      ar: 'العنوان نفسه الذي جاء منه دخول الساعة 03:12. خادم التصيّد والمتسلل جهة واحدة.',
    },
  },
  solution: 'Open "ACTION REQUIRED" email -> Show original. Return-Path bounce-7731@mail.helixdynamlcs.example; bottom Received from mail.helixdynamlcs.example [203.0.113.77] (= ev.l02.ip). Choice: text.',
  selfTest: [],
};

export default level;
