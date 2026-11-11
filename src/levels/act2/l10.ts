import type { LevelConfig } from '../../engine/schema';
import { seeded } from '../lib/logs';
import { ACT2 } from './story';

const D = ACT2.domain;
const MSGID = `<20260312223104.7731@mail.${ACT2.lookalike}>`;
const GATEWAY = '/var/log/mail/gateway.log';
const PROXY = '/var/log/proxy/access.log';
const RECIPIENTS = ['s.haddad', 'm.chen', 'j.ortiz', 'r.khalil', 'l.ito', 'd.brooks'];
const STAFF = [...RECIPIENTS, 'a.nasser', 'p.novak', 't.osei', 'h.saleh'];
const IP: Record<string, string> = Object.fromEntries(STAFF.map((user, i) => [user, `10.20.4.${17 + i * 3}`]));

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const START = Date.parse('2026-03-12T08:00:00Z');
const END = Date.parse('2026-03-13T10:00:00Z');

function gatewayLog(): string {
  const rand = seeded(1012);
  const senders = [`it@${D}`, `hr@${D}`, `git@${D}`, `reports@${ACT2.vendorDomain}`, 'noreply@news.example', 'billing@cloudhost.example'];
  const lines: [number, string][] = [];
  for (let i = 0; i < 70; i++) {
    const at = START + Math.floor(rand() * (END - START));
    const from = senders[Math.floor(rand() * senders.length)];
    const to = STAFF[Math.floor(rand() * STAFF.length)];
    const id = Math.floor(rand() * 0xfffff).toString(16).toUpperCase();
    lines.push([at, `${iso(at)} mx1 DELIVER id=${id} msgid=<${id.toLowerCase()}@${from.split('@')[1]}> from=<${from}> to=<${to}@${D}> spf=pass dmarc=pass action=deliver`]);
  }
  RECIPIENTS.forEach((user, i) => {
    const at = Date.parse(ACT2.phishSentAt) + 1000 + i * 2000;
    lines.push([at, `${iso(at)} mx1 DELIVER id=9C77E${i} msgid=${MSGID} from=<bounce-7731@mail.${ACT2.lookalike}> to=<${user}@${D}> spf=fail dmarc=fail(p=none) action=deliver`]);
  });
  return `${lines.sort((a, b) => a[0] - b[0]).map(([, line]) => line).join('\n')}\n`;
}

function proxyLog(): string {
  const rand = seeded(2026);
  const sites = [
    `https://wiki.${D}/it/vpn-guide`, `https://git.${D}/infra/vpn`, `https://sso.${D}/login`, `https://mail.${D}/inbox`,
    `https://portal.${ACT2.vendorDomain}/reports`, 'https://news.example/world', 'https://maps.example/route',
    'https://video.example/watch', 'https://weather.example/today', 'https://cdn.example/lib/app.js',
  ];
  const lines: [number, string][] = [];
  for (let i = 0; i < 420; i++) {
    const at = START + Math.floor(rand() * (END - START));
    const user = STAFF[Math.floor(rand() * STAFF.length)];
    const url = sites[Math.floor(rand() * sites.length)];
    // Real sign-ins POST to the legitimate SSO: a filter on POST alone is not enough.
    const method = url.endsWith('/login') && rand() < 0.5 ? 'POST' : 'GET';
    lines.push([at, `${iso(at)} ${IP[user]} ${user} ${method} ${url} 200 ${200 + Math.floor(rand() * 9000)}`]);
  }
  const phish = (at: string, user: string, method: string, path: string, status: number, bytes: number) => {
    lines.push([Date.parse(at), `${at} ${IP[user]} ${user} ${method} https://${ACT2.lookalike}${path} ${status} ${bytes}`]);
  };
  phish('2026-03-12T22:46:10Z', 's.haddad', 'GET', '/vpn/renew?u=s.haddad', 200, 5120);
  phish(`2026-03-12T${ACT2.firstVictimAt}:31Z`, 's.haddad', 'POST', '/collect.php', 302, 312);
  phish('2026-03-12T22:58:02Z', 'r.khalil', 'GET', '/vpn/renew?u=r.khalil', 200, 5120);
  phish('2026-03-13T07:55:40Z', 'l.ito', 'GET', '/vpn/renew?u=l.ito', 200, 5120);
  phish('2026-03-13T08:11:05Z', 'm.chen', 'GET', '/vpn/renew?u=m.chen', 200, 5120);
  phish('2026-03-13T08:12:20Z', 'm.chen', 'POST', '/collect.php', 302, 312);
  phish('2026-03-13T09:41:00Z', 'a.nasser', 'GET', '/vpn/renew', 403, 0);
  return `${lines.sort((a, b) => a[0] - b[0]).map(([, line]) => line).join('\n')}\n`;
}

const level: LevelConfig = {
  id: 'L10',
  requires: { levels: ['L09'], evidence: ['ev.l06.origin', 'ev.l07.domains', 'ev.l08.kit', 'ev.l01.user'] },
  briefing: {
    en: 'MINI-BOSS. Samir was not the only one who got the email. Use the mail gateway log to see who received it, and the web proxy log to see who clicked and who actually submitted a password. Thousands of lines, a few that matter: filter, do not scroll. The first person to hand over credentials is patient zero, and anyone after them needs a password reset today.',
    ar: 'تحدّي الفصل. سمير ليس الوحيد الذي وصلته الرسالة. استخدم سجل بوابة البريد لتعرف من استلمها، وسجل البروكسي لتعرف من فتح الرابط ومن أرسل كلمة مروره فعلاً. آلاف الأسطر والمهم منها قليل: صفِّ النتائج ولا تقرأ السجل كله. أول من سلّم بياناته هو «المريض صفر»، وكل من سلّمها بعده يجب أن يغيّر كلمة مروره اليوم.',
  },
  mission: {
    goal: {
      en: 'Use two logs to find out who received the phishing email, who opened it, and who actually sent a password.',
      ar: 'استخدم سجلَّين لتعرف من استلم رسالة التصيّد، ومن فتحها، ومن أرسل كلمة مروره فعلاً.',
    },
    investigate: [
      {
        en: '`/var/log/mail/gateway.log`: one `DELIVER` line for every person who received the email. Search it for `7731`.',
        ar: 'السجل `/var/log/mail/gateway.log`: فيه سطر `DELIVER` لكل شخص استلم الرسالة. ابحث فيه عن `7731`.',
      },
      {
        en: '`/var/log/proxy/access.log`: every web request. `GET` means a page was opened. `POST` means a form was sent.',
        ar: 'السجل `/var/log/proxy/access.log`: فيه كل طلبات الويب. كلمة `GET` تعني فتح صفحة، وكلمة `POST` تعني إرسال نموذج.',
      },
      {
        en: 'Only the lines that go to the fake domain `helixdynamlcs.example`.',
        ar: 'الأسطر التي تذهب إلى النطاق المزيّف `helixdynamlcs.example` فقط.',
      },
    ],
    success: {
      en: 'You have the number of recipients, the first person who sent a password and when, the second victim, and the right response.',
      ar: 'تكون قد عرفت عدد المستلمين، وأول من أرسل كلمة مروره ومتى، والضحية الثانية، واخترت الاستجابة الصحيحة.',
    },
  },
  apps: ['case', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: 'helix-soc01',
    home: '/home/a.nasser',
    cwd: '/var/log',
    now: ACT2.now,
    files: {
      [GATEWAY]: gatewayLog(),
      [PROXY]: proxyLog(),
      '/home/a.nasser/notes.txt': `Phishing msgid: ${MSGID}\nBlocked ${ACT2.lookalike} at the proxy on Mar 13 09:30.\n`,
    },
  },
  objectives: [
    {
      id: 'recipients',
      prompt: {
        en: 'How many employees received the phishing email? Its `Message-ID` contains `7731` (see `/var/log/mail/gateway.log`).',
        ar: 'كم موظفاً استلم رسالة التصيّد؟ رقم الرسالة `Message-ID` يحتوي على `7731` (انظر `/var/log/mail/gateway.log`).',
      },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['6', 'six'] },
      derived: 'grep 7731 gateway.log | wc -l = 6 delivery lines',
      wrong: { en: 'grep the gateway log for 7731, then count the lines with `wc -l`.', ar: 'ابحث عن `7731` في سجل البوابة بالأمر `grep`، ثم عُدّ الأسطر بالأمر `wc -l`.' },
    },
    {
      id: 'patient-zero',
      prompt: {
        en: 'Who sent a username and password to `helixdynamlcs.example` FIRST? Look in `/var/log/proxy/access.log`: opening the link is a `GET`, sending the form is a `POST`.',
        ar: 'من أول شخص أرسل بيانات دخوله إلى `helixdynamlcs.example`؟ ابحث في `/var/log/proxy/access.log`: فتح الرابط يظهر بكلمة `GET`، وإرسال النموذج بكلمة `POST`.',
      },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT2.user] },
      wrong: {
        en: 'Several people clicked. Only POST lines to the look-alike domain mean a password was sent. The log is in time order.',
        ar: 'أكثر من شخص فتح الرابط. أسطر `POST` إلى النطاق المزيّف وحدها تعني أن كلمة مرور أُرسلت. والسجل مرتّب حسب الوقت.',
      },
    },
    {
      id: 'when',
      prompt: { en: 'At what time (UTC, HH:MM) did patient zero submit?', ar: 'في أي ساعة أرسل «المريض صفر» بياناته؟ (بتوقيت UTC وبصيغة HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: [ACT2.firstVictimAt, `${ACT2.firstVictimAt}:31`] },
      wrong: { en: 'Read the timestamp at the start of that POST line.', ar: 'اقرأ الوقت المكتوب في بداية سطر `POST` نفسه.' },
      grants: [
        {
          id: 'ev.l10.patient-zero',
          title: { en: 'Patient zero', ar: 'المريض صفر (أول ضحية)' },
          type: 'person',
          content: `s.haddad posted credentials to ${ACT2.lookalike} on Mar 12 ${ACT2.firstVictimAt} UTC (4h25m before the VPN login)`,
          links: ['ev.l08.kit', 'ev.l06.origin', 'ev.l01.user'],
        },
      ],
    },
    {
      id: 'second',
      prompt: { en: 'One more employee submitted credentials later. Who?', ar: 'موظف آخر أرسل بياناته لاحقاً. من هو؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT2.secondVictim] },
      wrong: { en: 'There are exactly two POST lines to the look-alike domain.', ar: 'يوجد سطران فقط من نوع `POST` إلى النطاق المزيّف.' },
      grants: [
        {
          id: 'ev.l10.second-victim',
          title: { en: 'Second phishing victim', ar: 'ضحية التصيّد الثانية' },
          type: 'person',
          content: `${ACT2.secondVictim} posted credentials on Mar 13 08:12 UTC`,
          links: ['ev.l10.patient-zero', 'ev.l07.domains'],
        },
      ],
    },
    {
      id: 'contain',
      prompt: { en: 'What is the right containment step now?', ar: 'ما خطوة الاحتواء الصحيحة الآن؟' },
      validator: {
        kind: 'choice',
        correct: 'reset',
        options: [
          { id: 'email', label: { en: 'Email all staff a warning and wait', ar: 'نرسل تحذيراً إلى كل الموظفين وننتظر' } },
          { id: 'reset', label: { en: 'Reset both passwords, revoke their sessions, enforce MFA, and keep the domain blocked', ar: 'نغيّر كلمتي المرور، ونلغي جلسات الحسابين، ونفرض التحقق بخطوتين، ونُبقي النطاق محظوراً' } },
          { id: 'fire', label: { en: 'Disable the accounts of everyone who clicked', ar: 'نعطّل حسابات كل من فتح الرابط' } },
          { id: 'delete', label: { en: 'Delete the phishing email from every mailbox, nothing else', ar: 'نحذف رسالة التصيّد من كل الصناديق ولا نفعل غير ذلك' } },
        ],
      },
      wrong: {
        en: 'Stolen passwords stay valid until they are changed, and sessions stay open until revoked.',
        ar: 'كلمة المرور المسروقة تبقى صالحة إلى أن تتغيّر، والجلسة تبقى مفتوحة إلى أن تُلغى.',
      },
    },
  ],
  guide: {
    nudge: {
      en: 'Filter, then count: `grep PATTERN file | wc -l`. Then filter the proxy log by domain AND method.',
      ar: 'صفِّ ثم عُدّ: `grep PATTERN file | wc -l`. ثم صفِّ سجل البروكسي حسب النطاق والطريقة معاً.',
    },
    clue: {
      en: `\`grep 7731 ${GATEWAY} | wc -l\`, then \`grep ${ACT2.lookalike} ${PROXY} | grep POST\`.`,
      ar: 'شغّل `grep 7731 /var/log/mail/gateway.log | wc -l` ثم `grep helixdynamlcs.example /var/log/proxy/access.log | grep POST`.',
    },
    steps: {
      recipients: {
        en: 'Run `grep 7731 /var/log/mail/gateway.log | wc -l`. Each matching line is one delivery. The answer is 6.',
        ar: 'شغّل `grep 7731 /var/log/mail/gateway.log | wc -l`. كل سطر مطابق هو عملية تسليم واحدة. الجواب 6.',
      },
      'patient-zero': {
        en: 'Run `grep helixdynamlcs.example /var/log/proxy/access.log | grep POST`. Two lines appear, and the log is in time order. The first line belongs to `s.haddad`.',
        ar: 'شغّل `grep helixdynamlcs.example /var/log/proxy/access.log | grep POST`. يظهر سطران، والسجل مرتّب حسب الوقت. السطر الأول يخص الحساب `s.haddad`.',
      },
      when: {
        en: 'Read the time at the start of that first line: `2026-03-12T22:47:31Z`. Type `22:47`.',
        ar: 'اقرأ الوقت في بداية ذلك السطر الأول: `2026-03-12T22:47:31Z`. اكتب `22:47`.',
      },
      second: {
        en: 'The second `POST` line, on Mar 13 at 08:12, belongs to `m.chen`.',
        ar: 'سطر `POST` الثاني، في 13 آذار الساعة 08:12، يخص الحساب `m.chen`.',
      },
      contain: {
        en: 'Choose "Reset both passwords, revoke their sessions, enforce MFA, and keep the domain blocked". A stolen password works until it is changed.',
        ar: 'اختر الجواب الذي يغيّر كلمتي المرور، ويلغي الجلسات، ويفرض التحقق بخطوتين، ويُبقي النطاق محظوراً. كلمة المرور المسروقة تبقى صالحة إلى أن تتغيّر.',
      },
    },
    concept: {
      en: 'To measure a phishing attack, answer three questions from the logs: who received it, who opened it, and who gave something away. Opening the page is a `GET`. Sending the form is a `POST`, and that is the real loss.',
      ar: 'لقياس حجم هجوم تصيّد، أجب عن ثلاثة أسئلة من السجلات: من استلم الرسالة، ومن فتحها، ومن سلّم شيئاً. فتح الصفحة يظهر بكلمة `GET`. أما إرسال النموذج فيظهر بكلمة `POST`، وهذه هي الخسارة الحقيقية.',
    },
  },
  rewards: { points: 250, achievement: 'act2-clear' },
  debrief: {
    concept: {
      en: 'Scoping a phishing incident means answering three questions from logs: who received it (mail gateway), who interacted (proxy: GET = opened the page), and who gave something away (POST = submitted the form). The earliest compromise, patient zero, anchors the timeline: here the password was stolen at 22:47 and used at 03:12. Everyone who submitted needs a password reset, session revocation and MFA, even if nothing bad has happened to them yet.',
      ar: 'تحديد حجم حادثة تصيّد يعني الإجابة عن ثلاثة أسئلة من السجلات: من استلم الرسالة (بوابة البريد)، ومن تفاعل معها (البروكسي: `GET` تعني أنه فتح الصفحة)، ومن سلّم شيئاً (`POST` تعني أنه أرسل النموذج). أول اختراق، أي «المريض صفر»، هو الذي يثبّت الخط الزمني: هنا سُرقت كلمة المرور الساعة 22:47 واستُخدمت الساعة 03:12. كل من أرسل بياناته يحتاج إلى تغيير كلمة المرور، وإلغاء الجلسات، والتحقق بخطوتين، حتى لو لم يحدث له شيء بعد.',
    },
    realTools: ['grep / wc', 'Splunk / Elastic', 'Microsoft Defender for Office 365 (Threat Explorer)', 'Proxy logs (Squid, Zscaler)'],
    takeaway: {
      en: 'Clicks show interest; POSTs show loss. Scope by evidence, then contain every confirmed victim fast.',
      ar: 'فتح الرابط يدل على الفضول، أما `POST` فيدل على الخسارة. حدّد حجم الحادثة بالأدلة، ثم احتوِ كل ضحية مؤكدة بسرعة.',
    },
    source: 'NIST SP 800-61r3 (Incident Response); MITRE ATT&CK T1566 (Phishing)',
  },
  echo: {
    intro: {
      en: 'Six inboxes, one bait. Find who bit first, and whether anyone bit after.',
      ar: 'ستة صناديق بريد وطُعم واحد. اعرف من ابتلعه أولاً، وهل ابتلعه أحد بعده.',
    },
    success: {
      en: 'Patient zero: Samir, 22:47. Mei Chen at 08:12. gh0st now holds two real passwords, and one belongs to finance.',
      ar: 'المريض صفر هو سمير، الساعة 22:47. ثم مي تشين الساعة 08:12. أصبح مع gh0st كلمتا مرور حقيقيتان، وإحداهما لقسم المالية.',
    },
  },
  ghost: {
    taunt: {
      en: 'Two keys, and you only just noticed. Tell me, investigator: did Samir use that password anywhere else?',
      ar: 'مفتاحان، وأنت لم تنتبه إلا الآن. قل لي أيها المحقق: هل استخدم سمير كلمة المرور هذه في مكان آخر؟',
    },
  },
  solution: 'grep 7731 /var/log/mail/gateway.log | wc -l -> 6. grep helixdynamlcs.example /var/log/proxy/access.log | grep POST -> s.haddad 22:47:31 (first), m.chen 08:12:20. Choice: reset.',
  selfTest: [
    { run: `grep 7731 ${GATEWAY} | wc -l`, includes: '6' },
    { run: `grep ${ACT2.lookalike} ${PROXY} | grep POST`, includes: `2026-03-12T${ACT2.firstVictimAt}:31Z 10.20.4.17 s.haddad POST` },
    { run: `grep ${ACT2.lookalike} ${PROXY} | grep POST`, includes: 'm.chen POST' },
  ],
};

export default level;
