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
    ar: 'تحدّي الفصل. تسعة مصادر وتسع ساعات. الملف `/cases/helix-0313/events.txt` فيه سطر مهم من كل خطوة في تلك الليلة، منسوخ كما كتبه كل نظام تماماً، ومعها سطر واحد لا ينتمي إلى القصة. بعض المصادر يكتب بتوقيت UTC، وبعضها بالتوقيت المحلي، وواحد يعدّ الثواني منذ عام 1970. حوّل كل الأوقات إلى UTC، واستبعد السطر الغريب، وأعد بناء أحداث الليلة بالترتيب.',
  },
  mission: {
    goal: {
      en: 'Put the key events of the night in true time order by converting every time to UTC.',
      ar: 'رتّب أهم أحداث تلك الليلة حسب وقتها الحقيقي، بتحويل كل الأوقات إلى توقيت UTC.',
    },
    investigate: [
      {
        en: 'The file `README-time.txt`: how each source writes time, and how to convert it.',
        ar: 'الملف `README-time.txt`: كيف يكتب كل مصدر الوقت، وكيف تحوّله.',
      },
      {
        en: 'The file `events.txt`: nine lines, labelled A to I, each copied from a different source.',
        ar: 'الملف `events.txt`: تسعة أسطر مرقّمة بالأحرف من A إلى I، وكل سطر منسوخ من مصدر مختلف.',
      },
      {
        en: 'Three kinds of time: local time with an offset such as `+0200`, Unix time such as `#1773373752`, and times that are already UTC.',
        ar: 'ثلاثة أنواع من الأوقات: توقيت محلي مع فرق مثل `+0200`، وتوقيت يونكس مثل `#1773373752`، وأوقات مكتوبة بتوقيت UTC أصلاً.',
      },
    ],
    success: {
      en: 'You have converted A and G to UTC, removed the event that does not belong, ordered the other eight, and measured how fast the attacker worked. The timeline is pinned to your board.',
      ar: 'تكون قد حوّلت الحدثين A و G إلى UTC، واستبعدت الحدث الغريب، ورتّبت الأحداث الثمانية الباقية، وحسبت سرعة عمل المهاجم. يُثبَّت الخط الزمني على لوحة الأدلة.',
    },
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
      prompt: { en: 'Event A was exported in local time (`+0200`). What time was it in UTC? (HH:MM)', ar: 'الحدث A مكتوب بالتوقيت المحلي (`+0200`). كم كانت الساعة بتوقيت UTC؟ (بصيغة HH:MM)' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['03:12', '03:12:41'] },
      wrong: { en: 'UTC = local time minus the offset. `+0200` means local time is 2 hours ahead of UTC.', ar: 'توقيت UTC يساوي التوقيت المحلي ناقص الفرق. القيمة `+0200` تعني أن التوقيت المحلي متقدّم عن UTC بساعتين.' },
    },
    {
      id: 'portal',
      prompt: { en: 'Event G is written with the offset `-0500`. When was it in UTC? (YYYY-MM-DD HH:MM)', ar: 'الحدث G مكتوب بالفرق `-0500`. متى حدث بتوقيت UTC؟ (بصيغة YYYY-MM-DD HH:MM)' },
      placeholder: 'YYYY-MM-DD HH:MM',
      validator: { kind: 'answer', accept: ['2026-03-13 03:20', '2026-03-13 03:20:44', '2026-03-13T03:20:44Z'] },
      derived: '22:20:44 -0500 plus 5 hours = 03:20:44 UTC on the next day (Mar 13); matches the portal audit in L15.',
      wrong: { en: 'Minus a negative offset means adding: 22:20 + 5 hours. The hours pass midnight, so the date changes too.', ar: 'طرح فرق سالب يعني الجمع: 22:20 زائد 5 ساعات. الساعات تتجاوز منتصف الليل، فيتغيّر التاريخ أيضاً.' },
    },
    {
      id: 'stranger',
      prompt: { en: 'One event is not part of this intrusion. Which one?', ar: 'حدث واحد ليس جزءاً من هذا الاختراق. ما هو؟' },
      validator: {
        kind: 'choice',
        correct: 'I',
        options: [
          { id: 'G', label: { en: "[G] It happened on another company's system", ar: 'الحدث G: وقع على نظام شركة أخرى' } },
          { id: 'I', label: { en: `[I] A different IP (${ACT3.bruteIp}) that never got in: internet noise`, ar: 'الحدث I: عنوان مختلف (192.0.2.44) لم يدخل أبداً، وهو ضجيج من الإنترنت' } },
          { id: 'B', label: { en: '[B] It happened on a different server', ar: 'الحدث B: وقع على خادم مختلف' } },
        ],
      },
      wrong: {
        en: `What ties an event to this intrusion is the actor, not the machine. Which line never touches ${ACT4.attackerIp}, the phishing site or the stolen accounts?`,
        ar: 'ما يربط الحدث بهذا الاختراق هو الفاعل لا الجهاز. أي سطر لا علاقة له بالعنوان `203.0.113.77` ولا بموقع التصيّد ولا بالحسابات المسروقة؟',
      },
    },
    {
      id: 'order',
      prompt: { en: 'Put the other eight in true UTC order, oldest first (8 letters, e.g. ABCDEFGH).', ar: 'رتّب الأحداث الثمانية الباقية حسب وقتها الحقيقي بتوقيت UTC، من الأقدم إلى الأحدث (8 أحرف، مثل ABCDEFGH).' },
      placeholder: 'ABCDEFGH',
      validator: { kind: 'answer', accept: [ORDER, ORDER.split('').join(' '), ORDER.split('').join(','), ORDER.split('').join(', '), ORDER.split('').join('-')] },
      derived: 'UTC: C 22:31:05, E 22:47:31 (Mar 12); A 03:12:41, G 03:20:44, F 03:45:10, D 03:49:12, H 03:50:05, B 04:03:30 (Mar 13).',
      wrong: {
        en: 'Write every time in UTC with its date first, then sort. Sorting by the clock as printed moves two events to the wrong place.',
        ar: 'اكتب أولاً كل وقت بتوقيت UTC مع تاريخه، ثم رتّب. الترتيب حسب الساعة كما هي مكتوبة يضع حدثين في غير مكانهما.',
      },
      grants: [
        {
          id: 'ev.l20.timeline',
          title: { en: 'The night of Mar 12-13, in UTC', ar: 'ليلة 12-13 آذار بتوقيت UTC' },
          type: 'timestamp',
          content: '22:31 phish -> 22:47 creds -> 03:12 VPN -> 03:20 vendor portal -> 03:45 db01 -> 03:49 exfil -> 03:50 cron -> 04:03 web leak',
          links: ['ev.l06.origin', 'ev.l10.patient-zero', 'ev.l02.time', 'ev.l15.reuse', 'ev.l16.archive', 'ev.l18.exfil', 'ev.l19.cron', 'ev.l17.leak'],
        },
      ],
    },
    {
      id: 'speed',
      prompt: { en: 'How many minutes passed between the VPN login (A) and the data leaving (D)?', ar: 'كم دقيقة مرّت بين الدخول عبر VPN (الحدث A) وخروج البيانات (الحدث D)؟' },
      placeholder: 'minutes',
      validator: { kind: 'answer', accept: ['36', '37', '36 minutes', '37 minutes', '36 min', '37 min'] },
      derived: '03:12:41 to 03:49:12 = 36 min 31 s (36 or 37 accepted).',
      wrong: { en: 'Use the UTC times you found for A and D, then subtract.', ar: 'استخدم وقتَي الحدثين A و D بتوقيت UTC كما حسبتهما، ثم اطرح.' },
    },
    {
      id: 'control',
      prompt: { en: 'Every step after 03:12 started with one stolen password. Which control would have made that password useless on its own?', ar: 'كل الخطوات بعد الساعة 03:12 بدأت بكلمة مرور مسروقة واحدة. أي إجراء كان سيجعل هذه الكلمة وحدها بلا فائدة؟' },
      validator: {
        kind: 'choice',
        correct: 'mfa',
        options: [
          { id: 'curl', label: { en: 'Block curl on every server', ar: 'منع curl على كل الخوادم' } },
          { id: 'mfa', label: { en: 'Multi-factor authentication on the VPN and the vendor portal', ar: 'التحقق بخطوتين (MFA) على VPN وعلى بوابة المورّد' } },
          { id: 'cron', label: { en: 'Delete every crontab once a night', ar: 'حذف كل ملفات المهام المجدولة مرة كل ليلة' } },
        ],
      },
      wrong: { en: 'Look back at the portal audit: "password ok + no MFA". What would have stopped a password from being enough?', ar: 'ارجع إلى سجل البوابة: `password ok + no MFA`. ما الذي كان سيمنع كلمة المرور وحدها من أن تكفي؟' },
    },
  ],
  guide: {
    nudge: {
      en: 'Run `cat README-time.txt`, then `cat events.txt`. Write each event as "date time UTC" before you sort anything.',
      ar: 'شغّل `cat README-time.txt` ثم `cat events.txt`. اكتب كل حدث بصيغة «التاريخ ثم الوقت بتوقيت UTC» قبل أن ترتّب أي شيء.',
    },
    clue: {
      en: 'Event D is Unix time: `date -d @1773373752`. Event A is 2 hours ahead of UTC. Event G is 5 hours behind UTC and crosses midnight.',
      ar: 'الحدث D بتوقيت يونكس: `date -d @1773373752`. الحدث A متقدّم عن UTC بساعتين. والحدث G متأخر عن UTC بخمس ساعات ويتجاوز منتصف الليل.',
    },
    steps: {
      vpn: {
        en: 'Event A says `05:12:41 +0200`. UTC is the local time minus the offset: 05:12 minus 2 hours is 03:12. Type `03:12`.',
        ar: 'الحدث A فيه `05:12:41 +0200`. توقيت UTC يساوي التوقيت المحلي ناقص الفرق: 05:12 ناقص ساعتين يساوي 03:12. اكتب `03:12`.',
      },
      portal: {
        en: 'Event G says `22:20:44 -0500` on Mar 12. Minus a negative offset means adding: 22:20 plus 5 hours is 03:20 on the next day. Type `2026-03-13 03:20`.',
        ar: 'الحدث G فيه `22:20:44 -0500` يوم 12 آذار. طرح فرق سالب يعني الجمع: 22:20 زائد 5 ساعات يساوي 03:20 في اليوم التالي. اكتب `2026-03-13 03:20`.',
      },
      stranger: {
        en: 'Eight events involve `203.0.113.77`, the fake domain or the stolen accounts. Event I is a different address, `192.0.2.44`, which never got in. Choose I.',
        ar: 'ثمانية أحداث تتعلق بالعنوان `203.0.113.77` أو بالنطاق المزيّف أو بالحسابات المسروقة. الحدث I عنوان مختلف هو `192.0.2.44` ولم يدخل أبداً. اختر الحدث I.',
      },
      order: {
        en: 'In UTC: C 22:31 and E 22:47 on Mar 12. Then on Mar 13: A 03:12, G 03:20, F 03:45, D 03:49 (from `date -d @1773373752`), H 03:50 and B 04:03. Type `CEAGFDHB`.',
        ar: 'بتوقيت UTC: الحدث C الساعة 22:31 والحدث E الساعة 22:47 يوم 12 آذار. ثم يوم 13 آذار: A الساعة 03:12، و G الساعة 03:20، و F الساعة 03:45، و D الساعة 03:49 (من الأمر `date -d @1773373752`)، و H الساعة 03:50، و B الساعة 04:03. اكتب `CEAGFDHB`.',
      },
      speed: {
        en: 'A is 03:12:41 and D is 03:49:12. The difference is about 36 minutes. Type `36`.',
        ar: 'وقت الحدث A هو 03:12:41 ووقت الحدث D هو 03:49:12. الفرق نحو 36 دقيقة. اكتب `36`.',
      },
      control: {
        en: 'Choose "Multi-factor authentication on the VPN and the vendor portal". Every later step started from one stolen password.',
        ar: 'اختر «التحقق بخطوتين (MFA) على VPN وعلى بوابة المورّد». كل الخطوات اللاحقة بدأت من كلمة مرور مسروقة واحدة.',
      },
    },
    concept: {
      en: 'Every system writes time in its own way: UTC, local time with an offset, or seconds since 1970. Convert everything to UTC before you sort, or the story comes out in the wrong order. Keep the original value next to the converted one so others can check your work.',
      ar: 'كل نظام يكتب الوقت بطريقته: توقيت UTC، أو توقيت محلي مع فرق، أو عدد الثواني منذ عام 1970. حوّل كل الأوقات إلى UTC قبل الترتيب، وإلا خرجت القصة بترتيب خاطئ. واحتفظ بالقيمة الأصلية بجانب القيمة المحوَّلة ليستطيع غيرك مراجعة عملك.',
    },
  },
  rewards: { points: 250, achievement: 'act4-clear' },
  debrief: {
    concept: {
      en: 'A timeline turns scattered evidence into one story, and time is the hard part: every source writes it differently (ISO with Z, syslog with no year or zone, Unix epoch, local time with an offset, email Date headers). Normalize everything to UTC before sorting, record each source\'s clock and zone, and keep the raw value next to the converted one so others can check your work. Sorted correctly, the night shows its shape: about five hours from phishing email to data leaving, and only 36 minutes from VPN login to exfiltration.',
      ar: 'الخط الزمني يحوّل الأدلة المتفرقة إلى قصة واحدة، والوقت هو الجزء الصعب: كل مصدر يكتبه بطريقته (صيغة ISO مع الحرف Z، و syslog دون سنة ولا منطقة زمنية، وتوقيت يونكس، وتوقيت محلي مع فرق، وترويسة `Date` في البريد). وحّد كل الأوقات على UTC قبل الترتيب، وسجّل ساعة كل مصدر ومنطقته الزمنية، واحتفظ بالقيمة الأصلية بجانب القيمة المحوَّلة ليستطيع غيرك مراجعة عملك. وعند الترتيب الصحيح يتضح شكل الليلة: نحو خمس ساعات من رسالة التصيّد إلى خروج البيانات، و36 دقيقة فقط من الدخول عبر VPN إلى التسريب.',
    },
    realTools: ['Plaso / log2timeline', 'Timesketch', 'Elastic / Splunk timeline views', 'date -d @epoch'],
    takeaway: {
      en: 'Convert to UTC first, sort second. One wrong offset can reorder the whole story.',
      ar: 'حوّل إلى UTC أولاً، ثم رتّب. فرق توقيت واحد خاطئ قد يقلب القصة كلها.',
    },
    source: 'NIST SP 800-86 (Integrating Forensic Techniques into Incident Response); NIST SP 800-61r3; RFC 3339 (Date and Time on the Internet: Timestamps)',
  },
  echo: {
    intro: { en: 'Every source keeps its own clock. Put them all on one.', ar: 'لكل مصدر ساعته الخاصة. ضعها كلها على ساعة واحدة.' },
    success: {
      en: 'Phish to data out in about five hours; VPN to exfil in 36 minutes. Act 4 closed. Next: the files themselves.',
      ar: 'من رسالة التصيّد إلى خروج البيانات نحو خمس ساعات، ومن الدخول عبر VPN إلى التسريب 36 دقيقة. انتهى الفصل الرابع. التالي: الملفات نفسها.',
    },
  },
  ghost: {
    taunt: {
      en: 'A beautiful timeline. Every minute accounted for, and still no face. Keep counting, investigator.',
      ar: 'خط زمني جميل. كل دقيقة محسوبة، وما زلتَ لا تعرف وجهي. واصل العدّ أيها المحقق.',
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
