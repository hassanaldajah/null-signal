import type { LevelConfig } from '../../engine/schema';
import { ACT2 } from '../act2/story';
import gateway from '../act3/l14';
import { ACT3 } from '../act3/story';
import { dbAuthLog, unixTime } from './records';
import { ACT4 } from './story';

const CASE = '/cases/helix-0313';
const EVENTS = `${CASE}/events.txt`;
const ORDER = 'CEAGFDHB';

/** The real line from another level's log, so every copy of the night matches. */
function lineFrom(log: string, ...needles: string[]): string {
  const found = log.split('\n').find((line) => needles.every((needle) => line.includes(needle)));
  if (!found) throw new Error(`L20: no line with ${needles.join(' + ')}`);
  return found;
}

const gatewayFile = gateway.world.files?.['/var/log/auth.log'];
const gatewayLog = typeof gatewayFile === 'string' ? gatewayFile : (gatewayFile?.content ?? '');

/** One key line per step of the night, exactly as each source wrote it (shuffled), plus one stranger. */
const ENTRIES: [letter: string, source: string, raw: string[]][] = [
  ['A', 'VPN appliance, web console export (local time)', [`2026-03-13 05:12:41 +0200  login ok  user=${ACT2.user}  src=${ACT4.attackerIp}`]],
  ['B', `${ACT4.webHost} /var/log/nginx/access.log`, [`${ACT4.attackerIp} - - [13/Mar/2026:04:03:30 +0000] "GET ${ACT4.leakedPath} HTTP/1.1" 200 48211903 "-" "curl/8.5.0"`]],
  ['C', 'mx1 /var/log/mail/gateway.log', [`2026-03-12T22:31:05Z mx1 DELIVER id=9C77E0 msgid=<20260312223104.7731@mail.${ACT2.lookalike}> from=<bounce-7731@mail.${ACT2.lookalike}> to=<${ACT2.user}@${ACT2.domain}> spf=fail dmarc=fail(p=none) action=deliver`]],
  ['D', `${ACT4.dbHost} /home/${ACT4.secondAccount}/.bash_history`, [`#${unixTime(ACT4.pushedAt)}`, `${ACT4.stagingDir}/.sync --push ${ACT4.archive} --via ${ACT4.exfilVia}`]],
  ['E', 'web proxy /var/log/proxy/access.log', [`2026-03-12T${ACT2.firstVictimAt}:31Z 10.20.4.17 ${ACT2.user} POST ${ACT2.collect} 302 312`]],
  ['F', `${ACT4.dbHost} /var/log/auth.log`, [lineFrom(dbAuthLog(), `Accepted password for ${ACT4.secondAccount} from ${ACT4.attackerIp}`)]],
  ['G', `NovaBackup sign-in alert, mail to ${ACT2.user} (headers)`, ['Date: Thu, 12 Mar 2026 22:20:44 -0500', `Subject: New sign-in to your NovaBackup account from ${ACT4.attackerIp}`]],
  ['H', `${ACT4.dbHost} /var/log/syslog`, [`Mar 13 03:50:05 ${ACT4.dbHost} crontab[2291]: (${ACT4.secondAccount}) REPLACE (${ACT4.secondAccount})`]],
  ['I', `${ACT3.gateway} /var/log/auth.log`, [lineFrom(gatewayLog, ACT3.bruteIp, 'invalid user admin')]],
];

const eventsFile = () =>
  [
    'CASE HELIX-0313 - timeline worksheet',
    'Each line is copied exactly as its source wrote it. The sources do NOT agree on how to write time.',
    '',
    ...ENTRIES.flatMap(([letter, source, raw]) => [`[${letter}] ${source}`, ...raw.map((line) => `    ${line}`), '']),
  ].join('\n');

const level: LevelConfig = {
  id: 'L20',
  requires: {
    levels: ['L19'],
    evidence: ['ev.l06.origin', 'ev.l10.patient-zero', 'ev.l02.time', 'ev.l15.reuse', 'ev.l16.archive', 'ev.l18.exfil', 'ev.l19.cron', 'ev.l17.leak', 'ev.l14.noise'],
  },
  briefing: {
    en: `BOSS. Nine sources, nine clocks. ${EVENTS} holds one key line from each step of the night, copied exactly as each system wrote it, plus one line that does not belong. Some write UTC, some local time, one counts seconds since 1970. Convert everything to UTC, throw out the stranger, and rebuild the night in order.`,
    ar: `زعيم الفصل. تسع مصادر وتسع ساعات. ملف ${EVENTS} فيه سطر مهم من كل خطوة بالليلة، منسوخ متل ما كتبه كل نظام بالزبط، ومعهم سطر واحد مش من القصة. في مصادر بتكتب UTC، وفي بتكتب الوقت المحلي، ووحد بيعدّ ثواني من سنة 1970. حوّل كل إشي لـ UTC، وطلّع الغريب، وابني الليلة بالترتيب.`,
  },
  apps: ['case', 'terminal', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: 'helix-soc01',
    home: '/home/a.nasser',
    cwd: CASE,
    now: ACT4.now,
    files: {
      [EVENTS]: { content: `${eventsFile()}\n`, owner: 'a.nasser', mtime: '2026-03-14T15:40:00Z' },
      [`${CASE}/README-time.txt`]: {
        content: [
          'Reading times in this case',
          '- Helix Linux servers run in UTC (timedatectl: "Time zone: Etc/UTC"). syslog lines carry no year and no zone.',
          '- ISO times ending in Z are already UTC. "+0000" is UTC too.',
          '- "#1773373510" in a bash history is Unix time: seconds since 1970-01-01 UTC. Convert it: date -d @1773373510',
          '- "+0200" and "-0500" are offsets from UTC. UTC = local time minus the offset:',
          '    10:30 +0200  ->  08:30 UTC',
          '    08:30 -0500  ->  13:30 UTC',
          '  Watch the date when the hours pass midnight.',
          '',
        ].join('\n'),
        owner: 'a.nasser',
        mtime: '2026-03-14T15:41:00Z',
      },
    },
  },
  objectives: [
    {
      id: 'vpn',
      prompt: { en: 'Event A was exported in local time (+0200). What time was it in UTC? (HH:MM)', ar: 'الحدث A انصدّر بالوقت المحلي (+0200). قديش كانت الساعة بـ UTC؟ (HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:12', '03:12:41'] },
      wrong: { en: 'UTC = local time minus the offset. +0200 means local time is 2 hours ahead of UTC.', ar: 'UTC = الوقت المحلي ناقص الفرق. +0200 معناها الوقت المحلي قدّام UTC بساعتين.' },
    },
    {
      id: 'portal',
      prompt: { en: 'Event G is written in -0500. When was it in UTC? (YYYY-MM-DD HH:MM)', ar: 'الحدث G مكتوب بـ -0500. إمتى كان بـ UTC؟ (YYYY-MM-DD HH:MM)' },
      placeholder: 'YYYY-MM-DD HH:MM',
      validator: { kind: 'answer', accept: ['2026-03-13 03:20', '2026-03-13 03:20:44', '2026-03-13T03:20:44Z'] },
      derived: '22:20:44 -0500 plus 5 hours = 03:20:44 UTC on the next day (Mar 13); matches the portal audit in L15.',
      wrong: { en: 'Minus a negative offset means adding: 22:20 + 5 hours. The hours pass midnight, so the date changes too.', ar: 'ناقص فرق سالب يعني زائد: 22:20 + 5 ساعات. الساعات بتعدّي نص الليل، فالتاريخ كمان بيتغيّر.' },
    },
    {
      id: 'stranger',
      prompt: { en: 'One event is not part of this intrusion. Which one?', ar: 'في حدث واحد مش جزء من هالاختراق. أي واحد؟' },
      validator: {
        kind: 'choice',
        correct: 'I',
        options: [
          { id: 'G', label: { en: "[G] It happened on another company's system", ar: '[G] صار على نظام شركة ثانية' } },
          { id: 'I', label: { en: `[I] A different IP (${ACT3.bruteIp}) that never got in: internet noise`, ar: `[I] IP مختلف (${ACT3.bruteIp}) وما قدر يدخل أبداً: ضجيج من الإنترنت` } },
          { id: 'B', label: { en: '[B] It happened on a different server', ar: '[B] صار على سيرفر مختلف' } },
        ],
      },
      wrong: {
        en: `What ties an event to this intrusion is the actor, not the machine. Which line never touches ${ACT4.attackerIp}, the phishing site or the stolen accounts?`,
        ar: `اللي بيربط الحدث بهالاختراق هو الفاعل، مش الجهاز. أي سطر ما إله علاقة بـ ${ACT4.attackerIp} ولا بموقع التصيّد ولا بالحسابات المسروقة؟`,
      },
    },
    {
      id: 'order',
      prompt: { en: 'Put the other eight in true UTC order, oldest first (8 letters, e.g. ABCDEFGH).', ar: 'رتّب الثمانية الباقيين حسب وقتهم الحقيقي بـ UTC، الأقدم أول (8 أحرف، مثلاً ABCDEFGH).' },
      placeholder: 'ABCDEFGH',
      validator: { kind: 'answer', accept: [ORDER, ORDER.split('').join(' '), ORDER.split('').join(','), ORDER.split('').join(', '), ORDER.split('').join('-')] },
      derived: 'UTC: C 22:31:05, E 22:47:31 (Mar 12); A 03:12:41, G 03:20:44, F 03:45:10, D 03:49:12, H 03:50:05, B 04:03:30 (Mar 13).',
      wrong: {
        en: 'Write every time in UTC with its date first, then sort. Sorting by the clock as printed moves two events to the wrong place.',
        ar: 'اكتب كل وقت بـ UTC مع تاريخه أول، وبعدين رتّب. الترتيب حسب الساعة متل ما هي مطبوعة بيحط حدثين بالمكان الغلط.',
      },
      grants: [
        {
          id: 'ev.l20.timeline',
          title: { en: 'The night of Mar 12-13, in UTC', ar: 'ليلة 12-13 آذار، بتوقيت UTC' },
          type: 'timestamp',
          content: '22:31 phish -> 22:47 creds -> 03:12 VPN -> 03:20 vendor portal -> 03:45 db01 -> 03:49 exfil -> 03:50 cron -> 04:03 web leak',
          links: ['ev.l06.origin', 'ev.l10.patient-zero', 'ev.l02.time', 'ev.l15.reuse', 'ev.l16.archive', 'ev.l18.exfil', 'ev.l19.cron', 'ev.l17.leak'],
        },
      ],
    },
    {
      id: 'speed',
      prompt: { en: 'How many minutes passed between the VPN login (A) and the data leaving (D)?', ar: 'كم دقيقة مرقت بين دخول الـ VPN (A) وطلوع البيانات (D)؟' },
      placeholder: 'minutes',
      validator: { kind: 'answer', accept: ['36', '37', '36 minutes', '37 minutes', '36 min', '37 min'] },
      derived: '03:12:41 to 03:49:12 = 36 min 31 s (36 or 37 accepted).',
      wrong: { en: 'Use the UTC times you found for A and D, then subtract.', ar: 'استخدم أوقات UTC اللي طلّعتها لـ A و D، واطرح.' },
    },
    {
      id: 'control',
      prompt: { en: 'Every step after 03:12 started with one stolen password. Which control would have made that password useless on its own?', ar: 'كل خطوة بعد 03:12 بلّشت بكلمة سر وحدة مسروقة. أي إجراء كان خلّى هالكلمة لحالها بلا فايدة؟' },
      validator: {
        kind: 'choice',
        correct: 'mfa',
        options: [
          { id: 'curl', label: { en: 'Block curl on every server', ar: 'منع curl على كل السيرفرات' } },
          { id: 'mfa', label: { en: 'Multi-factor authentication on the VPN and the vendor portal', ar: 'التحقق متعدد العوامل (MFA) على الـ VPN وبوابة المورّد' } },
          { id: 'cron', label: { en: 'Delete every crontab once a night', ar: 'حذف كل ملفات crontab مرة كل ليلة' } },
        ],
      },
      wrong: { en: 'Look back at the portal audit: "password ok + no MFA". What would have stopped a password from being enough?', ar: 'ارجع لسجل البوابة: "password ok + no MFA". شو كان بيمنع إنه كلمة السر لحالها تكفي؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'cat README-time.txt, then cat events.txt. Write each event as "date time UTC" before you sort anything.', ar: 'cat README-time.txt، وبعدين cat events.txt. اكتب كل حدث على شكل "تاريخ ووقت UTC" قبل ما ترتّب أي إشي.' }, cost: 30 },
    { tier: 'direction', text: { en: `D is Unix time: date -d @${unixTime(ACT4.pushedAt)}. A is 2 hours ahead of UTC; G is 5 hours behind and crosses midnight.`, ar: `D وقت يونكس: date -d @${unixTime(ACT4.pushedAt)}. و A قدّام UTC بساعتين؛ و G ورا UTC بخمس ساعات وبيعدّي نص الليل.` }, cost: 50 },
    { tier: 'near-solution', text: { en: 'UTC: A 03:12, G Mar 13 03:20, D 03:49. The stranger is the only line from 192.0.2.44. The night starts with the email on Mar 12.', ar: 'بـ UTC: A الساعة 03:12، و G يوم 13 آذار الساعة 03:20، و D الساعة 03:49. الغريب هو السطر الوحيد من 192.0.2.44. والليلة بتبلّش بالإيميل يوم 12 آذار.' }, cost: 70 },
  ],
  rewards: { points: 250, achievement: 'act4-clear' },
  debrief: {
    concept: {
      en: 'A timeline turns scattered evidence into one story, and time is the hard part: every source writes it differently (ISO with Z, syslog with no year or zone, Unix epoch, local time with an offset, email Date headers). Normalize everything to UTC before sorting, record each source\'s clock and zone, and keep the raw value next to the converted one so others can check your work. Sorted correctly, the night shows its shape: about five hours from phishing email to data leaving, and only 36 minutes from VPN login to exfiltration.',
      ar: 'الخط الزمني بيحوّل الأدلة المبعثرة لقصة وحدة، والوقت هو الجزء الصعب: كل مصدر بيكتبه بطريقة (ISO مع Z، و syslog بلا سنة ولا منطقة، ووقت يونكس، ووقت محلي مع فرق، وترويسة Date بالإيميل). وحّد كل إشي على UTC قبل الترتيب، وسجّل ساعة ومنطقة كل مصدر، وخلّي القيمة الأصلية جنب المحوّلة عشان غيرك يقدر يراجع شغلك. لما تترتّب صح، الليلة بتبيّن شكلها: حوالي خمس ساعات من إيميل التصيّد لطلوع البيانات، و36 دقيقة بس من دخول الـ VPN للتسريب.',
    },
    realTools: ['Plaso / log2timeline', 'Timesketch', 'Elastic / Splunk timeline views', 'date -d @epoch'],
    takeaway: {
      en: 'Convert to UTC first, sort second. One wrong offset can reorder the whole story.',
      ar: 'حوّل لـ UTC أول، ورتّب بعدين. فرق توقيت واحد غلط بيقدر يقلب القصة كلها.',
    },
    source: 'NIST SP 800-86 (Integrating Forensic Techniques into Incident Response); NIST SP 800-61r3; RFC 3339 (Date and Time on the Internet: Timestamps)',
  },
  echo: {
    intro: { en: 'Every source keeps its own clock. Put them all on one.', ar: 'كل مصدر إله ساعته. حطّهم كلهم على ساعة وحدة.' },
    success: {
      en: 'Phish to data out in about five hours; VPN to exfil in 36 minutes. Act 4 closed. Next: the files themselves.',
      ar: 'من التصيّد لطلوع البيانات حوالي خمس ساعات؛ ومن الـ VPN للتسريب 36 دقيقة. سكّرنا الفصل الرابع. الجاي: الملفات نفسها.',
    },
  },
  ghost: {
    taunt: {
      en: 'A beautiful timeline. Every minute accounted for, and still no face. Keep counting, investigator.',
      ar: 'خط زمني حلو. كل دقيقة محسوبة، ولسا ما في وجه. كمّل عدّ يا محقق.',
    },
  },
  solution: `UTC: C 22:31 (Mar 12), E 22:47, A 05:12+0200=03:12, G 22:20-0500=03:20 Mar 13, F 03:45, D date -d @${unixTime(ACT4.pushedAt)}=03:49, H 03:50, B 04:03. Stranger: I (${ACT3.bruteIp}). Order ${ORDER}. A->D 36-37 min. Control: mfa.`,
  selfTest: [
    { run: 'cat README-time.txt', includes: 'date -d @' },
    { run: 'cat events.txt', includes: '-0500' },
    { run: `date -d @${unixTime(ACT4.pushedAt)}`, includes: '03:49:12' },
    { run: `grep -c ${ACT3.bruteIp} events.txt`, includes: '1' },
    { run: 'grep -c "^\\[" events.txt', includes: '9' },
  ],
};

export default level;
