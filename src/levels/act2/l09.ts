import type { Email, LevelConfig } from '../../engine/schema';
import { ACT2, INBOX, PHISH, SAMIR, trace } from './story';

const D = ACT2.domain;
const ZONE = `${ACT2.home}/Documents/work/dns/${D}.zone`;

const forwarded: Email = {
  id: 'partners-fwd',
  from: `Helix HR <hr@${D}>`,
  to: SAMIR,
  subject: '[partners] Spring holiday schedule',
  date: '2026-03-12T13:30:00Z',
  headers: [
    ...trace('lists.partners.example', '192.0.2.60', '2026-03-12T13:30:00Z', '6630'),
    ['Authentication-Results', `mail.${D}; spf=softfail (${D} does not designate 192.0.2.60 as permitted sender) smtp.mailfrom=${D}; dkim=pass header.d=${D} header.s=sel1; dmarc=pass header.from=${D}`],
    ['List-Id', '<partners.lists.partners.example>'],
  ],
  body: 'The office is closed on March 20. Shared with partners through the partners mailing list.\n\nHelix HR',
};

const level: LevelConfig = {
  id: 'L09',
  requires: { levels: ['L08'], evidence: ['ev.l06.origin'] },
  briefing: {
    en: 'Helix has email authentication set up, so why did a forged @helixdynamics.example message land in Samir\'s inbox? Every receiving server writes its verdict in the Authentication-Results header: SPF (was the sending server allowed?), DKIM (is the signature valid?) and DMARC (does it align with From, and what should happen if not?). Read the verdicts, then read the policy Helix publishes in DNS.',
    ar: 'Helix عندها توثيق للبريد، فليش إيميل مزوّر من @helixdynamics.example وصل لصندوق سمير؟ كل سيرفر مستقبل بيكتب حكمه بترويسة Authentication-Results: SPF (هل السيرفر المرسل مسموح؟)، DKIM (هل التوقيع صحيح؟)، و DMARC (هل بيتطابق مع From، وشو لازم يصير إذا لا؟). اقرأ الأحكام، وبعدين اقرأ السياسة اللي Helix نشرتها بالـ DNS.',
  },
  apps: ['case', 'mail', 'terminal', 'evidence'],
  autoOpen: ['case', 'mail'],
  world: {
    user: ACT2.user,
    host: ACT2.host,
    home: ACT2.home,
    now: ACT2.now,
    emails: [PHISH, forwarded, ...INBOX],
    files: {
      [ZONE]: `$ORIGIN ${D}.
@                3600 IN MX   10 mx1.${D}.
@                3600 IN TXT  "v=spf1 ip4:192.0.2.25 include:_spf.mailhost.example -all"
mx1              3600 IN A    192.0.2.25
sel1._domainkey  3600 IN TXT  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu3f...IDAQAB"
_dmarc           3600 IN TXT  "v=DMARC1; p=none; rua=mailto:dmarc-reports@${D}"
`,
      [`${ACT2.home}/Documents/work/dns/TODO.txt`]: 'move DMARC from p=none to quarantine after we review the reports (Q1?)\n',
    },
  },
  objectives: [
    {
      id: 'spf',
      prompt: {
        en: 'Show the original of the fake IT email. What SPF result did it get?',
        ar: 'اعرض الأصل لإيميل الـ IT المزيّف. شو نتيجة SPF تبعته؟',
      },
      placeholder: 'pass / fail / …',
      validator: { kind: 'answer', accept: ['fail', 'spf=fail'] },
      wrong: { en: 'Find "spf=" in the Authentication-Results header.', ar: 'دوّر على "spf=" بترويسة Authentication-Results.' },
    },
    {
      id: 'policy',
      prompt: {
        en: 'It failed DMARC too, yet it was delivered. Which DMARC policy (p=) does helixdynamics.example publish? The zone file is in ~/Documents/work/dns.',
        ar: 'وفشل بـ DMARC كمان، ومع هيك وصل. شو سياسة DMARC (p=) اللي بينشرها helixdynamics.example؟ ملف المنطقة موجود بـ ~/Documents/work/dns.',
      },
      placeholder: 'p=…',
      validator: { kind: 'answer', accept: ['none', 'p=none'] },
      wrong: { en: 'The DMARC record lives at _dmarc.<domain>. Read its p= tag.', ar: 'سجل DMARC موجود عند _dmarc.<domain>. اقرأ قيمة p= فيه.' },
      grants: [
        {
          id: 'ev.l09.dmarc',
          title: { en: 'Why the spoof got through', ar: 'ليش التزوير مرق' },
          type: 'note',
          content: `${D} DMARC p=none: spoofed mail (spf=fail, dkim=none) was still delivered`,
          links: ['ev.l06.origin'],
        },
      ],
    },
    {
      id: 'forward',
      prompt: {
        en: 'The [partners] email soft-failed SPF but still passed DMARC. Why?',
        ar: 'إيميل [partners] فشل جزئياً بـ SPF بس نجح بـ DMARC. ليش؟',
      },
      validator: {
        kind: 'choice',
        correct: 'dkim',
        options: [
          { id: 'softfail', label: { en: 'A softfail counts as a pass', ar: 'الفشل الجزئي بينحسب نجاح' } },
          { id: 'dkim', label: { en: 'A mailing list re-sent it (breaking SPF), but its DKIM signature for helixdynamics.example stayed valid', ar: 'قائمة بريدية أعادت إرساله (فانكسر SPF)، بس توقيع DKIM لـ helixdynamics.example ضل صحيح' } },
          { id: 'ignore', label: { en: 'DMARC ignores SPF completely', ar: 'DMARC بيتجاهل SPF تماماً' } },
          { id: 'trusted', label: { en: 'Mail from HR is always trusted', ar: 'إيميلات الموارد البشرية دايماً موثوقة' } },
        ],
      },
      wrong: {
        en: 'DMARC passes when SPF OR DKIM passes and aligns with the From domain. Which one passed here?',
        ar: 'DMARC بينجح إذا SPF أو DKIM نجح وتطابق مع نطاق From. مين فيهم نجح هون؟',
      },
    },
    {
      id: 'fix',
      prompt: { en: 'Which change would have kept the forged email out of inboxes?', ar: 'أي تغيير كان رح يمنع الإيميل المزوّر من الوصول للصناديق؟' },
      validator: {
        kind: 'choice',
        correct: 'reject',
        options: [
          { id: 'add-ip', label: { en: 'Add 203.0.113.77 to the SPF record', ar: 'نضيف 203.0.113.77 لسجل SPF' } },
          { id: 'reject', label: { en: 'Move DMARC to p=quarantine, then p=reject, after checking the reports', ar: 'ننقل DMARC لـ p=quarantine وبعدين p=reject، بعد مراجعة التقارير' } },
          { id: 'no-dkim', label: { en: 'Stop signing with DKIM', ar: 'نوقف التوقيع بـ DKIM' } },
          { id: 'no-spf', label: { en: 'Delete the SPF record', ar: 'نحذف سجل SPF' } },
        ],
      },
      wrong: {
        en: 'p=none means "only report, deliver anyway". What tells receivers to act?',
        ar: 'p=none معناها "بلّغ بس، وسلّم الإيميل عادي". شو اللي بيحكي للمستقبلين يتصرّفوا؟',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: '"Show original" on each message and compare the Authentication-Results lines.', ar: 'اعمل "عرض الأصل" لكل رسالة وقارن أسطر Authentication-Results.' },
      cost: 15,
    },
    {
      tier: 'direction',
      text: { en: 'In the terminal: `cat ~/Documents/work/dns/helixdynamics.example.zone` and find the _dmarc line.', ar: 'بالطرفية: `cat ~/Documents/work/dns/helixdynamics.example.zone` ولاقي سطر _dmarc.' },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: 'Fake IT email: spf=fail, dkim=none. DMARC record: p=none (report only). The partners email: SPF broke on forwarding, DKIM still passed.',
        ar: 'إيميل الـ IT المزيّف: spf=fail و dkim=none. سجل DMARC: ‏p=none (تقارير بس). إيميل الشركاء: SPF انكسر بالتحويل، و DKIM ضل ناجح.',
      },
      cost: 50,
    },
  ],
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'SPF lists which servers may send for a domain (it checks the envelope sender, and breaks on forwarding). DKIM signs the message with a key published in DNS (it survives forwarding if the content is untouched). DMARC ties them to the visible From domain: a message passes if SPF or DKIM passes AND aligns, and the policy p=none / quarantine / reject tells receivers what to do with failures. With p=none, a perfect forgery is only reported, never blocked.',
      ar: 'SPF بيحدّد أي سيرفرات مسموح ترسل باسم النطاق (بيفحص مرسل المغلّف، وبينكسر مع التحويل). DKIM بيوقّع الرسالة بمفتاح منشور بالـ DNS (بيصمد مع التحويل إذا المحتوى ما تغيّر). DMARC بيربطهم بنطاق From الظاهر: الرسالة بتنجح إذا SPF أو DKIM نجح وتطابق، والسياسة p=none أو quarantine أو reject بتحكي للمستقبل شو يعمل بالفاشلة. مع p=none، التزوير الكامل بيتبلّغ عنه بس، وما بينحظر أبداً.',
    },
    realTools: ['dig TXT _dmarc.domain', 'MXToolbox', 'dmarcian / parsedmarc (reports)', 'Authentication-Results header'],
    takeaway: {
      en: 'DMARC at p=none is a monitoring step, not protection. Read the reports, fix legitimate senders, then enforce.',
      ar: 'DMARC على p=none خطوة مراقبة، مش حماية. اقرأ التقارير، صلّح المرسلين الشرعيين، وبعدين طبّق السياسة.',
    },
    source: 'RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC); CISA BOD 18-01',
  },
  echo: {
    intro: {
      en: 'The servers saw through the fake. They wrote it down, then delivered it anyway. Find out who told them to.',
      ar: 'السيرفرات كشفت التزوير. كتبوه، وبعدين سلّموا الإيميل عادي. اعرف مين حكالهم يعملوا هيك.',
    },
    success: {
      en: 'A forged From, a failed check, and a policy that said "deliver anyway". The door was unlocked from the inside.',
      ar: 'From مزوّر، وفحص فاشل، وسياسة قالت "سلّمه عادي". الباب كان مفتوح من جوّا.',
    },
  },
  solution: 'Phish Authentication-Results: spf=fail, dkim=none, dmarc=fail (p=NONE). Zone _dmarc: p=none. Partners mail: forwarded, DKIM pass. Fix: quarantine/reject.',
  selfTest: [
    { run: `cat ${ZONE}`, includes: 'p=none' },
  ],
};

export default level;
