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
    ar: 'لدى Helix نظام للتحقق من البريد، فلماذا وصلت رسالة مزوَّرة باسم `@helixdynamics.example` إلى بريد سمير؟ كل خادم مستقبِل يكتب حكمه في الترويسة `Authentication-Results`: فحص SPF (هل الخادم المرسِل مسموح له؟)، وفحص DKIM (هل التوقيع صحيح؟)، وفحص DMARC (هل يطابق ذلك نطاق `From`، وماذا يحدث إن لم يطابق؟). اقرأ الأحكام، ثم اقرأ السياسة التي نشرتها Helix في DNS.',
  },
  mission: {
    goal: {
      en: "Find out why a forged Helix email was still delivered, by reading the servers' verdicts and Helix's own mail policy.",
      ar: 'اعرف لماذا وصلت رسالة مزوَّرة باسم Helix إلى البريد، بقراءة أحكام الخوادم وسياسة البريد التي نشرتها Helix نفسها.',
    },
    investigate: [
      {
        en: '"Show original" on the fake IT email: the `Authentication-Results` header with `spf=`, `dkim=` and `dmarc=`.',
        ar: '«عرض الأصل» في رسالة قسم التقنية المزيّفة: الترويسة `Authentication-Results` وفيها `spf=` و`dkim=` و`dmarc=`.',
      },
      {
        en: 'The same header in the "[partners]" email, to compare.',
        ar: 'الترويسة نفسها في رسالة `[partners]`، للمقارنة.',
      },
      {
        en: 'The DNS zone file in `~/Documents/work/dns`: the `_dmarc` line and its `p=` value.',
        ar: 'ملف منطقة DNS في `~/Documents/work/dns`: سطر `_dmarc` وقيمة `p=` فيه.',
      },
    ],
    success: {
      en: 'You have given the SPF result and the DMARC policy, explained the forwarded email, and chosen the fix that blocks forgeries.',
      ar: 'تكون قد كتبت نتيجة SPF وسياسة DMARC، وشرحت حالة الرسالة المعاد توجيهها، واخترت الإصلاح الذي يمنع التزوير.',
    },
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
        ar: 'اعرض أصل رسالة قسم التقنية المزيّفة. ما نتيجة فحص SPF فيها؟',
      },
      placeholder: 'pass / fail / …',
      validator: { kind: 'answer', accept: ['fail', 'spf=fail'] },
      wrong: { en: 'Find "spf=" in the Authentication-Results header.', ar: 'ابحث عن `spf=` في الترويسة `Authentication-Results`.' },
    },
    {
      id: 'policy',
      prompt: {
        en: 'It failed DMARC too, yet it was delivered. Which DMARC policy (`p=`) does `helixdynamics.example` publish? The zone file is in `~/Documents/work/dns`.',
        ar: 'فشلت الرسالة في فحص DMARC أيضاً، ومع ذلك وصلت. ما سياسة DMARC (قيمة `p=`) التي ينشرها النطاق `helixdynamics.example`؟ ملف المنطقة موجود في `~/Documents/work/dns`.',
      },
      placeholder: 'p=…',
      validator: { kind: 'answer', accept: ['none', 'p=none'] },
      wrong: { en: 'The DMARC record lives at _dmarc.<domain>. Read its p= tag.', ar: 'سجل DMARC موجود عند الاسم `_dmarc`. اقرأ قيمة `p=` فيه.' },
      grants: [
        {
          id: 'ev.l09.dmarc',
          title: { en: 'Why the spoof got through', ar: 'لماذا مرّت الرسالة المزوَّرة' },
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
        ar: 'رسالة `[partners]` حصلت على `softfail` في فحص SPF لكنها نجحت في DMARC. لماذا؟',
      },
      validator: {
        kind: 'choice',
        correct: 'dkim',
        options: [
          { id: 'softfail', label: { en: 'A softfail counts as a pass', ar: 'لأن `softfail` يُحسب نجاحاً' } },
          { id: 'dkim', label: { en: 'A mailing list re-sent it (breaking SPF), but its DKIM signature for helixdynamics.example stayed valid', ar: 'قائمة بريدية أعادت إرسالها (فانكسر SPF)، لكن توقيع DKIM للنطاق `helixdynamics.example` بقي صحيحاً' } },
          { id: 'ignore', label: { en: 'DMARC ignores SPF completely', ar: 'لأن DMARC يتجاهل SPF تماماً' } },
          { id: 'trusted', label: { en: 'Mail from HR is always trusted', ar: 'لأن رسائل الموارد البشرية موثوقة دائماً' } },
        ],
      },
      wrong: {
        en: 'DMARC passes when SPF OR DKIM passes and aligns with the From domain. Which one passed here?',
        ar: 'ينجح DMARC إذا نجح SPF أو DKIM وطابق نطاق `From`. أيهما نجح هنا؟',
      },
    },
    {
      id: 'fix',
      prompt: { en: 'Which change would have kept the forged email out of inboxes?', ar: 'أي تغيير كان سيمنع وصول الرسالة المزوَّرة إلى صناديق البريد؟' },
      validator: {
        kind: 'choice',
        correct: 'reject',
        options: [
          { id: 'add-ip', label: { en: 'Add 203.0.113.77 to the SPF record', ar: 'إضافة `203.0.113.77` إلى سجل SPF' } },
          { id: 'reject', label: { en: 'Move DMARC to p=quarantine, then p=reject, after checking the reports', ar: 'نقل DMARC إلى `p=quarantine` ثم إلى `p=reject` بعد مراجعة التقارير' } },
          { id: 'no-dkim', label: { en: 'Stop signing with DKIM', ar: 'إيقاف التوقيع عبر DKIM' } },
          { id: 'no-spf', label: { en: 'Delete the SPF record', ar: 'حذف سجل SPF' } },
        ],
      },
      wrong: {
        en: 'p=none means "only report, deliver anyway". What tells receivers to act?',
        ar: 'القيمة `p=none` تعني: أرسل تقريراً فقط وسلّم الرسالة كالمعتاد. ما الذي يطلب من الخوادم المستقبِلة أن تتصرف؟',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Use "Show original" on each message and compare the `Authentication-Results` lines.',
      ar: 'اضغط «عرض الأصل» في كل رسالة وقارن أسطر `Authentication-Results`.',
    },
    clue: {
      en: 'In the terminal: `cat ~/Documents/work/dns/helixdynamics.example.zone`, then find the `_dmarc` line.',
      ar: 'في الطرفية: `cat ~/Documents/work/dns/helixdynamics.example.zone` ثم ابحث عن سطر `_dmarc`.',
    },
    steps: {
      spf: {
        en: 'Open the "ACTION REQUIRED" email, press "Show original" and find `Authentication-Results`. It says `spf=fail`. Type `fail`.',
        ar: 'افتح الرسالة التي تبدأ بالعبارة `ACTION REQUIRED` واضغط «عرض الأصل»، ثم ابحث عن `Authentication-Results`. فيها `spf=fail`. اكتب `fail`.',
      },
      policy: {
        en: 'In the terminal, run `cat ~/Documents/work/dns/helixdynamics.example.zone`. The `_dmarc` line says `p=none`: report only, deliver anyway. Type `none`.',
        ar: 'في الطرفية شغّل `cat ~/Documents/work/dns/helixdynamics.example.zone`. سطر `_dmarc` فيه `p=none`: أي أرسل تقريراً فقط وسلّم الرسالة. اكتب `none`.',
      },
      forward: {
        en: 'Open the "[partners]" email and press "Show original". SPF is `softfail` because a mailing list sent it again, but it says `dkim=pass` for `helixdynamics.example`. Choose the answer about the mailing list and the valid DKIM signature.',
        ar: 'افتح رسالة `[partners]` واضغط «عرض الأصل». نتيجة SPF هي `softfail` لأن قائمة بريدية أعادت إرسالها، لكن فيها `dkim=pass` للنطاق `helixdynamics.example`. اختر الجواب الذي يذكر القائمة البريدية وتوقيع DKIM الصحيح.',
      },
      fix: {
        en: 'Choose "Move DMARC to p=quarantine, then p=reject, after checking the reports". Only an enforced policy tells receivers to stop forged mail.',
        ar: 'اختر الجواب الذي ينقل DMARC إلى `p=quarantine` ثم إلى `p=reject` بعد مراجعة التقارير. السياسة المفعَّلة وحدها تطلب من الخوادم المستقبِلة أن توقف الرسائل المزوَّرة.',
      },
    },
    concept: {
      en: 'SPF says which servers may send for a domain, and DKIM signs the message. DMARC connects both to the visible "From" and tells receivers what to do when the checks fail. With `p=none`, a forged email is only reported, never blocked.',
      ar: 'فحص SPF يحدد الخوادم المسموح لها بالإرسال باسم النطاق، وفحص DKIM يوقّع الرسالة. أما DMARC فيربطهما باسم المرسِل الظاهر، ويخبر الخوادم المستقبِلة ماذا تفعل عند فشل الفحص. ومع `p=none` يُبلَّغ عن الرسالة المزوَّرة فقط، ولا تُحظر أبداً.',
    },
  },
  rewards: { points: 150 },
  debrief: {
    concept: {
      en: 'SPF lists which servers may send for a domain (it checks the envelope sender, and breaks on forwarding). DKIM signs the message with a key published in DNS (it survives forwarding if the content is untouched). DMARC ties them to the visible From domain: a message passes if SPF or DKIM passes AND aligns, and the policy p=none / quarantine / reject tells receivers what to do with failures. With p=none, a perfect forgery is only reported, never blocked.',
      ar: 'فحص SPF يحدد الخوادم المسموح لها بالإرسال باسم النطاق (يفحص مرسِل المغلّف، وينكسر عند إعادة التوجيه). وفحص DKIM يوقّع الرسالة بمفتاح منشور في DNS (ويبقى صحيحاً بعد إعادة التوجيه إذا لم يتغيّر المحتوى). أما DMARC فيربطهما بنطاق `From` الظاهر: تنجح الرسالة إذا نجح SPF أو DKIM وطابق النطاق، والسياسة `p=none` أو `quarantine` أو `reject` تخبر المستقبِل ماذا يفعل بالرسائل الفاشلة. ومع `p=none` يُبلَّغ عن التزوير الكامل فقط، ولا يُحظر أبداً.',
    },
    realTools: ['dig TXT _dmarc.domain', 'MXToolbox', 'dmarcian / parsedmarc (reports)', 'Authentication-Results header'],
    takeaway: {
      en: 'DMARC at p=none is a monitoring step, not protection. Read the reports, fix legitimate senders, then enforce.',
      ar: 'سياسة DMARC بقيمة `p=none` مرحلة مراقبة وليست حماية. اقرأ التقارير، وأصلح المرسِلين الشرعيين، ثم فعّل الحظر.',
    },
    source: 'RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC); CISA BOD 18-01',
  },
  echo: {
    intro: {
      en: 'The servers saw through the fake. They wrote it down, then delivered it anyway. Find out who told them to.',
      ar: 'الخوادم كشفت التزوير وسجّلته، ثم سلّمت الرسالة مع ذلك. اعرف من طلب منها أن تفعل هذا.',
    },
    success: {
      en: 'A forged From, a failed check, and a policy that said "deliver anyway". The door was unlocked from the inside.',
      ar: 'ترويسة `From` مزوَّرة، وفحص فاشل، وسياسة تقول: سلّم الرسالة مع ذلك. كان الباب مفتوحاً من الداخل.',
    },
  },
  solution: 'Phish Authentication-Results: spf=fail, dkim=none, dmarc=fail (p=NONE). Zone _dmarc: p=none. Partners mail: forwarded, DKIM pass. Fix: quarantine/reject.',
  selfTest: [
    { run: `cat ${ZONE}`, includes: 'p=none' },
  ],
};

export default level;
