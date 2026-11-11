import type { LevelConfig } from '../../engine/schema';
import { ACT6 } from './story';

const DIR = `${ACT6.ir}/contain`;

const playbook = [
  'HELIX SOC - CONTAINMENT PLAYBOOK (short form)',
  '',
  '1. Quarantine affected hosts at the switch (quarantine VLAN). Do NOT power off:',
  '   memory, open sessions and running state are evidence. Unplugging the network is enough.',
  '2. Accounts: disable every account the intruder can still use. Reset exposed passwords.',
  '   Service accounts that are clean and needed keep running (do not break backups).',
  '3. Vendor access: close any vendor door that is not needed right now.',
  '4. Block confirmed indicators: IPs on the firewall list, domains on the resolver list.',
  '   Block the attacker, not a business partner: revoke the access, keep the contract.',
  '5. Write every action down: time, who, what, why.',
  '',
].join('\n');

const hosts = [
  'host,ip,user,role,state',
  `${ACT6.host},${ACT6.wsIp},s.haddad,admin workstation,imaged 2026-03-14 18:20; online`,
  `${ACT6.finHost},${ACT6.finIp},m.chen,finance PC,online`,
  'laptop-mc,10.20.4.31,m.chen,laptop,online',
  `${ACT6.dbHost},10.20.2.11,-,database,online`,
  `${ACT6.webHost},10.20.2.20,-,intranet web,online`,
  `${ACT6.gateway},10.20.0.1,-,staff VPN gateway,online`,
  'helix-vgw,10.20.0.5,-,vendor VPN gateway,online',
  `${ACT6.soc},10.20.9.10,a.nasser,SOC console,online`,
  '',
].join('\n');

const accounts = [
  'account,type,owner,mfa,last_logon_utc,last_source,state,notes',
  `s.haddad,staff,Samir Haddad,no,2026-03-13T03:12:07Z,${ACT6.attackerIp},reset 2026-03-14,phished password`,
  `${ACT6.secondAccount},staff,Jamie Ortiz,no,2026-03-13T03:31:44Z,${ACT6.attackerIp},reset 2026-03-14,sprayed password`,
  'm.chen,staff,Mei Chen,no,2026-03-15T08:02:10Z,10.20.4.31,reset 2026-03-14,phished password',
  'd.brooks,staff,Dan Brooks,no,2026-03-15T09:12:44Z,10.20.4.22,enabled,-',
  `${ACT6.pullAccount},vendor (NovaBackup),backup service,n/a,2026-03-16T01:58:12Z,${ACT6.vendorIp},enabled,read-only nightly pull of /backup at 02:00`,
  `${ACT6.vendorAccount},vendor (NovaBackup),shared by vendor engineers,no,2026-03-13T08:42:10Z,${ACT6.vendorIp},enabled,interactive admin shell; one shared password`,
  '',
].join('\n');

const firewall = [
  '# helix-fw deny list (SOC managed). One address per line.',
  `deny ${ACT6.bruteIp}      # login noise, Mar 13 (SOC-112)`,
  `deny ${ACT6.scannerIp}     # internet scanner (SOC-097)`,
  '',
].join('\n');

const resolver = [
  '# helix-dns01 blocked domains (answers NXDOMAIN). Empty since 2026-02-01.',
  '',
].join('\n');

const level: LevelConfig = {
  id: 'L26',
  requires: { levels: ['L25'], evidence: ['ev.l24.next', 'ev.l02.ip', 'ev.l07.domains', 'ev.l18.exfil'] },
  briefing: {
    en: `Act 6. Five acts told us what gh0st did. Now we make sure he cannot do any more. The first step of every response is containment: cut the intruder off without destroying evidence. Staff passwords were reset on Mar 14, but the job is not finished. Use the playbook, the host list and the account list in ${DIR}: quarantine the machine his note named next, close the door that is still open and block what we know.`,
    ar: 'الفصل السادس. خمسة فصول بيّنت لنا ماذا فعل gh0st. الآن نتأكد أنه لن يستطيع فعل المزيد. أول خطوة في أي استجابة هي الاحتواء: قطع الطريق على المتسلل دون إتلاف الأدلة. كلمات مرور الموظفين تغيّرت في 14 آذار، لكن العمل لم ينتهِ. استخدم دليل الإجراءات وقائمة الأجهزة وقائمة الحسابات في المجلد `/home/a.nasser/ir/contain`: اعزل الجهاز الذي ذكرته ملاحظته، وأغلق الباب الذي ما زال مفتوحاً، واحظر ما نعرفه.',
  },
  mission: {
    goal: {
      en: 'Cut the intruder off without destroying evidence: isolate his next target, close the door he can still use, and block his addresses.',
      ar: 'اقطع الطريق على المتسلل دون إتلاف الأدلة: اعزل هدفه التالي، وأغلق الباب الذي ما زال يستطيع استخدامه، واحظر عناوينه.',
    },
    investigate: [
      {
        en: 'The file `playbook.txt`: the order of the work and what you must not do.',
        ar: 'الملف `playbook.txt`: ترتيب العمل وما لا يجوز فعله.',
      },
      {
        en: 'The files `hosts.csv` and `accounts.csv`: the address of each computer, and which accounts are still enabled.',
        ar: 'الملفان `hosts.csv` و`accounts.csv`: عنوان كل جهاز، والحسابات التي ما زالت مفعَّلة.',
      },
      {
        en: "The file `fw-blocklist.conf`: the blocked addresses. Compare each one, digit by digit, with the attacker's IP on your board.",
        ar: 'الملف `fw-blocklist.conf`: العناوين المحظورة. قارن كل عنوان، رقماً رقماً، بعنوان المهاجم الموجود على لوحة الأدلة.',
      },
    ],
    success: {
      en: "The finance computer is isolated but still running, the shared vendor account is disabled, and the attacker's IP and domains are blocked.",
      ar: 'جهاز المالية معزول وما زال يعمل، وحساب المورّد المشترك معطَّل، وعنوان المهاجم ونطاقاته محظورة.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT6.soc,
    home: '/home/a.nasser',
    cwd: DIR,
    now: ACT6.now,
    files: {
      [`${DIR}/playbook.txt`]: { content: playbook, mtime: '2026-01-20T10:00:00Z' },
      [`${DIR}/hosts.csv`]: { content: hosts, mtime: '2026-03-16T11:40:00Z' },
      [`${DIR}/accounts.csv`]: { content: accounts, mtime: '2026-03-16T11:42:00Z' },
      [`${DIR}/fw-blocklist.conf`]: { content: firewall, mtime: '2026-03-14T10:05:00Z' },
      [`${DIR}/dns-blocklist.conf`]: { content: resolver, mtime: '2026-02-01T09:00:00Z' },
    },
  },
  objectives: [
    {
      id: 'quarantine',
      prompt: { en: "The hidden note named gh0st's next machine. Which IP must the switch put into quarantine? (see `hosts.csv`)", ar: 'الملاحظة المخفية ذكرت الجهاز التالي في خطة gh0st. أي عنوان IP يجب أن يعزله المبدّل؟ (انظر `hosts.csv`)' },
      placeholder: '10.20.x.x',
      validator: { kind: 'answer', accept: [ACT6.finIp] },
      wrong: { en: 'Check your evidence board for the machine named in `fonts.conf`, then find it in `hosts.csv`.', ar: 'ابحث في لوحة الأدلة عن اسم الجهاز المذكور في الملف `fonts.conf`، ثم ابحث عنه في `hosts.csv`.' },
    },
    {
      id: 'power',
      prompt: { en: 'How do you take it off the network?', ar: 'كيف تفصله عن الشبكة؟' },
      validator: {
        kind: 'choice',
        correct: 'isolate',
        options: [
          { id: 'off', label: { en: 'Pull the power cable right away', ar: 'افصل عنه الكهرباء فوراً' } },
          { id: 'isolate', label: { en: 'Keep it running and move it to the quarantine network', ar: 'أبقِه يعمل وانقله إلى شبكة العزل' } },
          { id: 'wipe', label: { en: 'Reinstall Windows today so it is clean', ar: 'أعد تثبيت ويندوز عليه اليوم ليصبح نظيفاً' } },
        ],
      },
      wrong: { en: 'Read step 1 of `playbook.txt`: what is lost when a machine is switched off?', ar: 'اقرأ الخطوة 1 في `playbook.txt`: ماذا يضيع عند إطفاء الجهاز؟' },
    },
    {
      id: 'account',
      prompt: { en: 'One account he can still use is enabled. Which one must be disabled now, without breaking the nightly backups? (see `accounts.csv`)', ar: 'يوجد حساب مفعَّل ما زال يستطيع استخدامه. أي حساب يجب تعطيله الآن دون إيقاف النسخ الاحتياطي الليلي؟ (انظر `accounts.csv`)' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: [ACT6.vendorAccount] },
      wrong: { en: 'Run `grep enabled accounts.csv`. Two vendor accounts are enabled: one only reads `/backup` at 02:00, the other is an admin shell with a shared password.', ar: 'شغّل `grep enabled accounts.csv`. للمورّد حسابان مفعَّلان: أحدهما يقرأ `/backup` فقط الساعة 02:00، والآخر بصلاحيات مدير وكلمة مرور مشتركة.' },
    },
    {
      id: 'ip',
      prompt: { en: 'The firewall deny list is missing the most important address. Which IP must be added?', ar: 'قائمة الحظر في الجدار الناري ينقصها أهم عنوان. أي عنوان IP يجب إضافته؟' },
      placeholder: 'x.x.x.x',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: { en: 'Read `fw-blocklist.conf` character by character. One entry only looks like the address you found in Act 1.', ar: 'اقرأ الملف `fw-blocklist.conf` حرفاً حرفاً. أحد العناوين يشبه فقط العنوان الذي وجدته في الفصل الأول.' },
    },
    {
      id: 'domains',
      prompt: { en: 'Which domains go on the resolver\'s block list?', ar: 'أي النطاقات يجب وضعها في قائمة الحظر عند خادم DNS؟' },
      validator: {
        kind: 'choice',
        correct: 'attacker',
        options: [
          { id: 'vendor', label: { en: `${ACT6.vendorDomain}: he works there`, ar: 'النطاق `novabackup.example` لأنه يعمل هناك' } },
          { id: 'attacker', label: { en: `${ACT6.lookalike}, ${ACT6.trickDomain} and ${ACT6.exfilDomain} (with every name under it)`, ar: 'النطاقات `helixdynamlcs.example` و`verify-session.example` و`cdn-sync.example` مع كل الأسماء التابعة له' } },
          { id: 'own', label: { en: `${ACT6.domain}, because the phishing used its name`, ar: 'النطاق `helixdynamics.example` لأن التصيّد استخدم اسمه' } },
        ],
      },
      wrong: { en: 'Step 4: block the attacker, not a business partner and not yourself. Which domains did he register for the attack?', ar: 'الخطوة 4: احظر المهاجم، لا شريك العمل ولا نفسك. أي النطاقات سجّلها هو من أجل الهجوم؟' },
      grants: [
        {
          id: 'ev.l26.contained',
          title: { en: 'Contained: FIN03 quarantined, nova-svc disabled, IOCs blocked', ar: 'الاحتواء: عزل FIN03 وتعطيل nova-svc وحظر المؤشرات' },
          type: 'note',
          content: `${ACT6.finHost} (${ACT6.finIp}) quarantined running; ${ACT6.vendorAccount} disabled (${ACT6.pullAccount} kept); deny ${ACT6.attackerIp}; resolver blocks ${ACT6.lookalike}, ${ACT6.trickDomain}, ${ACT6.exfilDomain}`,
          links: ['ev.l24.next', 'ev.l02.ip', 'ev.l07.domains', 'ev.l18.exfil'],
        },
      ],
    },
  ],
  guide: {
    nudge: {
      en: 'Run `cat playbook.txt` first. It tells you the order of the work.',
      ar: 'شغّل `cat playbook.txt` أولاً: يخبرك بترتيب العمل.',
    },
    clue: {
      en: 'Run `grep FIN03 hosts.csv` for the IP, and `grep enabled accounts.csv` for the open door. Then compare `fw-blocklist.conf` with the IP on your board.',
      ar: 'شغّل `grep FIN03 hosts.csv` لمعرفة العنوان، و`grep enabled accounts.csv` لمعرفة الباب المفتوح. ثم قارن الملف `fw-blocklist.conf` بالعنوان الموجود على لوحة الأدلة.',
    },
    steps: {
      quarantine: {
        en: 'The hidden note named FIN03. Run `grep FIN03 hosts.csv`: the address of `HELIX-FIN03` is `10.20.6.21`.',
        ar: 'الملاحظة المخفية ذكرت الجهاز FIN03. شغّل `grep FIN03 hosts.csv`: عنوان الجهاز `HELIX-FIN03` هو `10.20.6.21`.',
      },
      power: {
        en: 'Step 1 of `playbook.txt` says: do not power off, because memory and running programs are evidence. Choose "Keep it running and move it to the quarantine network".',
        ar: 'الخطوة 1 في `playbook.txt` تقول: لا تطفئ الجهاز، لأن الذاكرة والبرامج العاملة أدلة. اختر «أبقِه يعمل وانقله إلى شبكة العزل».',
      },
      account: {
        en: 'Run `grep enabled accounts.csv`. `vendor-backup` only reads the backups at 02:00 and must keep working. `nova-svc` is an admin shell with one shared password. Type `nova-svc`.',
        ar: 'شغّل `grep enabled accounts.csv`. الحساب `vendor-backup` يقرأ النسخ الاحتياطية فقط الساعة 02:00 ويجب أن يبقى. أما `nova-svc` فحساب بصلاحيات مدير وكلمة مرور واحدة مشتركة. اكتب `nova-svc`.',
      },
      ip: {
        en: "Run `cat fw-blocklist.conf`. It blocks `203.0.113.7`, the scanner, which is one digit short of the attacker's address. Type `203.0.113.77`.",
        ar: 'شغّل `cat fw-blocklist.conf`. القائمة تحظر `203.0.113.7`، وهو الماسح، وينقصه رقم واحد عن عنوان المهاجم. اكتب `203.0.113.77`.',
      },
      domains: {
        en: 'Choose the three domains the attacker registered: `helixdynamlcs.example`, `verify-session.example` and `cdn-sync.example`. Do not block your vendor or your own domain.',
        ar: 'اختر النطاقات الثلاثة التي سجّلها المهاجم: `helixdynamlcs.example` و`verify-session.example` و`cdn-sync.example`. لا تحظر المورّد ولا نطاق شركتك.',
      },
    },
    concept: {
      en: 'Containment stops the damage while keeping the evidence. Isolate a computer from the network instead of switching it off, and disable every account the intruder can still use, including vendor and service accounts. Check every entry you block: one wrong digit blocks the wrong address.',
      ar: 'الاحتواء يوقف الضرر ويحفظ الأدلة. اعزل الجهاز عن الشبكة بدل إطفائه، وعطّل كل حساب ما زال المتسلل يستطيع استخدامه، ومنها حسابات المورّدين والخدمات. وراجع كل عنوان تحظره: رقم واحد خاطئ يحظر العنوان الخطأ.',
    },
  },
  rewards: { points: 180 },
  debrief: {
    concept: {
      en: 'Containment stops the damage while keeping the evidence. Isolate a machine at the network (a quarantine VLAN or the EDR "isolate" button) instead of switching it off, because memory, open connections and running programs disappear at power-off. Disable the accounts the intruder can still use, including service and vendor accounts, which are easy to forget because no person logs in with them every day. Keep what is clean and needed (the read-only backup pull) so the business keeps running. Block confirmed indicators where they work: IP addresses on the firewall, domains on the DNS resolver (a whole zone, so new names under it are caught too). And check every entry: one wrong digit blocks a harmless scanner and leaves the real attacker free.',
      ar: 'الاحتواء يوقف الضرر ويحافظ على الأدلة. اعزل الجهاز عن الشبكة (بشبكة عزل أو بزر العزل في برنامج حماية الأجهزة) بدل إطفائه، لأن الذاكرة والاتصالات المفتوحة والبرامج العاملة تختفي عند الإطفاء. عطّل الحسابات التي ما زال المتسلل يستطيع استخدامها، ومنها حسابات الخدمات والمورّدين، وهي سهلة النسيان لأن لا أحد يدخل بها كل يوم. وأبقِ ما هو سليم وضروري (سحب النسخ الاحتياطية للقراءة فقط) ليستمر العمل. واحظر المؤشرات المؤكدة في المكان المناسب: عناوين IP في الجدار الناري، والنطاقات عند خادم DNS (النطاق كاملاً، ليُحظر أي اسم جديد تحته). وراجع كل سطر: رقم واحد خاطئ يحظر ماسحاً غير مؤذٍ ويترك المهاجم الحقيقي حراً.',
    },
    realTools: ['EDR network isolation (Microsoft Defender for Endpoint, CrowdStrike Falcon)', 'NAC / quarantine VLAN', 'firewall deny lists', 'DNS Response Policy Zones (RPZ)', 'Active Directory / IAM account disable'],
    takeaway: {
      en: 'Isolate, do not unplug the power. Close every door, including vendor and service accounts. Block the attacker, not your partners.',
      ar: 'اعزل الجهاز ولا تفصل عنه الكهرباء. أغلق كل باب، ومنها حسابات المورّدين والخدمات. واحظر المهاجم لا شركاءك.',
    },
    source: 'NIST SP 800-61 Rev. 3 (Incident Response Recommendations, 2025); CISA Cybersecurity Incident & Vulnerability Response Playbooks (2021)',
  },
  echo: {
    intro: { en: 'Fast is good. Careful is better. One wrong digit and we block the wrong person.', ar: 'السرعة جيدة، والدقة أفضل. رقم واحد خاطئ ونحظر الشخص الخطأ.' },
    success: {
      en: 'FIN03 is in quarantine and still running, his vendor door is shut, his addresses are blocked. Now we make sure nothing of his is left behind.',
      ar: 'الجهاز FIN03 معزول وما زال يعمل، وباب المورّد أُغلق، وعناوين المهاجم محظورة. الآن نتأكد أنه لم يترك شيئاً وراءه.',
    },
  },
  solution: `ev.l24.next = ${ACT6.finHost}; grep FIN03 hosts.csv -> ${ACT6.finIp}. Choice: isolate (keep running). grep enabled accounts.csv -> ${ACT6.vendorAccount} (admin, shared password; ${ACT6.pullAccount} is the read-only pull). fw-blocklist.conf has ${ACT6.scannerIp}, missing ${ACT6.attackerIp}. Choice: attacker domains.`,
  selfTest: [
    { run: 'cat playbook.txt', includes: 'Do NOT power off' },
    { run: 'grep FIN03 hosts.csv', includes: ACT6.finIp },
    { run: 'grep enabled accounts.csv', includes: `${ACT6.vendorAccount},vendor` },
    { run: 'cat fw-blocklist.conf', includes: `deny ${ACT6.scannerIp} ` },
    { run: `grep -c ${ACT6.attackerIp} fw-blocklist.conf`, includes: '0' },
  ],
};

export default level;
