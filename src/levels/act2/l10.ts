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
    ar: 'زعيم الفصل. سمير مش الوحيد اللي وصله الإيميل. استخدم سجل بوابة البريد لتعرف مين استلمه، وسجل البروكسي لتعرف مين كبس ومين فعلاً سلّم كلمة السر. آلاف الأسطر، والمهم منها كم سطر: فلتر، لا تقعد تمرّر. أول شخص سلّم بياناته هو المريض صفر، وأي حدا بعده لازم يغيّر كلمة سرّه اليوم.',
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
        en: `How many employees received the phishing email? Its Message-ID contains "7731" (see ${GATEWAY}).`,
        ar: `كم موظف استلم إيميل التصيّد؟ رقم الرسالة فيه "7731" (شوف ${GATEWAY}).`,
      },
      placeholder: 'number',
      validator: { kind: 'answer', accept: ['6', 'six'] },
      derived: 'grep 7731 gateway.log | wc -l = 6 delivery lines',
      wrong: { en: 'grep the gateway log for 7731, then count the lines with `wc -l`.', ar: 'اعمل grep على 7731 بسجل البوابة، وبعدين عدّ الأسطر بـ `wc -l`.' },
    },
    {
      id: 'patient-zero',
      prompt: {
        en: `Who submitted credentials to ${ACT2.lookalike} FIRST? Clicking is a GET; submitting the form is a POST.`,
        ar: `مين أول واحد سلّم بياناته على ${ACT2.lookalike}؟ الكبس على الرابط GET؛ وإرسال النموذج POST.`,
      },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT2.user] },
      wrong: {
        en: 'Several people clicked. Only POST lines to the look-alike domain mean a password was sent. The log is in time order.',
        ar: 'في كذا حدا كبس. بس أسطر POST للنطاق الشبيه معناها إنه انبعثت كلمة سر. والسجل مرتّب حسب الوقت.',
      },
    },
    {
      id: 'when',
      prompt: { en: 'At what time (UTC, HH:MM) did patient zero submit?', ar: 'الساعة كم (UTC، HH:MM) سلّم المريض صفر بياناته؟' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: [ACT2.firstVictimAt, `${ACT2.firstVictimAt}:31`] },
      wrong: { en: 'Read the timestamp at the start of that POST line.', ar: 'اقرأ الوقت اللي ببداية سطر الـ POST هداك.' },
      grants: [
        {
          id: 'ev.l10.patient-zero',
          title: { en: 'Patient zero', ar: 'المريض صفر' },
          type: 'person',
          content: `s.haddad posted credentials to ${ACT2.lookalike} on Mar 12 ${ACT2.firstVictimAt} UTC (4h25m before the VPN login)`,
          links: ['ev.l08.kit', 'ev.l06.origin', 'ev.l01.user'],
        },
      ],
    },
    {
      id: 'second',
      prompt: { en: 'One more employee submitted credentials later. Who?', ar: 'في موظف ثاني سلّم بياناته بعدين. مين؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: [ACT2.secondVictim] },
      wrong: { en: 'There are exactly two POST lines to the look-alike domain.', ar: 'في سطرين POST بس للنطاق الشبيه.' },
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
      prompt: { en: 'What is the right containment step now?', ar: 'شو خطوة الاحتواء الصح هلأ؟' },
      validator: {
        kind: 'choice',
        correct: 'reset',
        options: [
          { id: 'email', label: { en: 'Email all staff a warning and wait', ar: 'نبعث تحذير لكل الموظفين ونستنّى' } },
          { id: 'reset', label: { en: 'Reset both passwords, revoke their sessions, enforce MFA, and keep the domain blocked', ar: 'نغيّر كلمتي السر، نلغي جلساتهم، نفرض المصادقة الثنائية، ونخلّي النطاق محظور' } },
          { id: 'fire', label: { en: 'Disable the accounts of everyone who clicked', ar: 'نعطّل حسابات كل اللي كبسوا' } },
          { id: 'delete', label: { en: 'Delete the phishing email from every mailbox, nothing else', ar: 'نحذف إيميل التصيّد من كل الصناديق، وبس' } },
        ],
      },
      wrong: {
        en: 'Stolen passwords stay valid until they are changed, and sessions stay open until revoked.',
        ar: 'كلمات السر المسروقة بتضل شغّالة لحد ما تتغيّر، والجلسات بتضل مفتوحة لحد ما تنلغى.',
      },
    },
  ],
  hints: [
    {
      tier: 'nudge',
      text: { en: 'Filter, then count: `grep PATTERN file | wc -l`. Then filter the proxy log by domain AND method.', ar: 'فلتر وبعدين عدّ: `grep PATTERN file | wc -l`. وبعدين فلتر سجل البروكسي حسب النطاق والطريقة مع بعض.' },
      cost: 30,
    },
    {
      tier: 'direction',
      text: { en: `\`grep 7731 ${GATEWAY} | wc -l\`, then \`grep ${ACT2.lookalike} ${PROXY} | grep POST\`.`, ar: `\`grep 7731 ${GATEWAY} | wc -l\`، وبعدين \`grep ${ACT2.lookalike} ${PROXY} | grep POST\`.` },
      cost: 50,
    },
    {
      tier: 'near-solution',
      text: { en: 'Six deliveries. Two POST lines: the earlier one (Mar 12, late evening) is patient zero; the other is the second victim.', ar: 'ست رسائل وصلت. وفي سطرين POST: الأقدم (12 آذار بالليل) هو المريض صفر، والثاني هو الضحية الثانية.' },
      cost: 70,
    },
  ],
  rewards: { points: 250, achievement: 'act2-clear' },
  debrief: {
    concept: {
      en: 'Scoping a phishing incident means answering three questions from logs: who received it (mail gateway), who interacted (proxy: GET = opened the page), and who gave something away (POST = submitted the form). The earliest compromise, patient zero, anchors the timeline: here the password was stolen at 22:47 and used at 03:12. Everyone who submitted needs a password reset, session revocation and MFA, even if nothing bad has happened to them yet.',
      ar: 'تحديد نطاق حادثة التصيّد معناه نجاوب على ثلاث أسئلة من السجلات: مين استلم (بوابة البريد)، مين تفاعل (البروكسي: GET يعني فتح الصفحة)، ومين سلّم إشي (POST يعني أرسل النموذج). أول اختراق، المريض صفر، هو اللي بيثبّت الخط الزمني: هون كلمة السر انسرقت الساعة 22:47 وانستخدمت الساعة 03:12. أي حدا سلّم بياناته لازم يغيّر كلمة سرّه، تنلغى جلساته، وتنفرض عليه المصادقة الثنائية، حتى لو لسا ما صار معه إشي.',
    },
    realTools: ['grep / wc', 'Splunk / Elastic', 'Microsoft Defender for Office 365 (Threat Explorer)', 'Proxy logs (Squid, Zscaler)'],
    takeaway: {
      en: 'Clicks show interest; POSTs show loss. Scope by evidence, then contain every confirmed victim fast.',
      ar: 'الكبسات بتبيّن الفضول؛ والـ POST بيبيّن الخسارة. حدّد النطاق بالأدلة، وبعدين احتوِ كل ضحية مؤكدة بسرعة.',
    },
    source: 'NIST SP 800-61r3 (Incident Response); MITRE ATT&CK T1566 (Phishing)',
  },
  echo: {
    intro: {
      en: 'Six inboxes, one bait. Find who bit first, and whether anyone bit after.',
      ar: 'ست صناديق وطُعم واحد. اعرف مين عضّ أول، وإذا في حدا عضّ بعده.',
    },
    success: {
      en: 'Patient zero: Samir, 22:47. Mei Chen at 08:12. gh0st now holds two real passwords, and one belongs to finance.',
      ar: 'المريض صفر: سمير، الساعة 22:47. ومي تشين الساعة 08:12. صار مع gh0st كلمتين سر حقيقيات، ووحدة منهم تبع قسم المالية.',
    },
  },
  ghost: {
    taunt: {
      en: 'Two keys, and you only just noticed. Tell me, investigator: did Samir use that password anywhere else?',
      ar: 'مفتاحين، وإنت لسا هلأ انتبهت. احكيلي يا محقق: سمير استخدم كلمة السر هاي بمكان ثاني؟',
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
