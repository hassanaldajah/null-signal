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
    ar: `الفصل السادس. خمس فصول حكولنا شو عمل gh0st. هلّق بدنا نتأكد إنه ما يقدر يعمل إشي زيادة. أول خطوة بأي استجابة هي الاحتواء: تقطع الطريق عالمتسلل بدون ما تخرّب الأدلة. كلمات مرور الموظفين تغيّرت يوم 14 آذار، بس الشغل ما خلص. استخدم دليل الإجراءات وقائمة الأجهزة وقائمة الحسابات بـ ‎${DIR}: اعزل الجهاز اللي ملاحظته سمّته الجاي، وسكّر الباب اللي لسا مفتوح، واحظر اللي منعرفه.`,
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
      prompt: { en: 'The hidden note named gh0st\'s next machine. Which IP must the switch put into quarantine?', ar: 'الملاحظة المخفية سمّت الجهاز الجاي لـ gh0st. أي IP لازم السويتش يعزله؟' },
      placeholder: '10.20.x.x',
      validator: { kind: 'answer', accept: [ACT6.finIp] },
      wrong: { en: 'Check your evidence board for the machine named in fonts.conf, then find it in hosts.csv.', ar: 'شوف بلوح الأدلة اسم الجهاز اللي بملف fonts.conf، وبعدين دوّر عليه بـ hosts.csv.' },
    },
    {
      id: 'power',
      prompt: { en: 'How do you take it off the network?', ar: 'كيف بتطلّعه من الشبكة؟' },
      validator: {
        kind: 'choice',
        correct: 'isolate',
        options: [
          { id: 'off', label: { en: 'Pull the power cable right away', ar: 'افصل الكهربا عنه فوراً' } },
          { id: 'isolate', label: { en: 'Keep it running and move it to the quarantine network', ar: 'خلّيه شغّال وانقله لشبكة العزل' } },
          { id: 'wipe', label: { en: 'Reinstall Windows today so it is clean', ar: 'نزّل عليه ويندوز من جديد اليوم عشان يصير نظيف' } },
        ],
      },
      wrong: { en: 'Read step 1 of playbook.txt: what is lost when a machine is switched off?', ar: 'اقرأ الخطوة 1 بـ playbook.txt: شو بيضيع لما الجهاز ينطفى؟' },
    },
    {
      id: 'account',
      prompt: { en: 'One account he can still use is enabled. Which one must be disabled now, without breaking the nightly backups?', ar: 'في حساب لسا شغّال وبيقدر يستخدمه. أي واحد لازم يتوقف هلّق، بدون ما نخرّب النسخ الاحتياطي الليلي؟' },
      placeholder: 'account',
      validator: { kind: 'answer', accept: [ACT6.vendorAccount] },
      wrong: { en: 'grep enabled accounts.csv. Two vendor accounts are enabled: one only reads /backup at 02:00, the other is an admin shell with a shared password.', ar: '‏grep enabled accounts.csv. في حسابين للمورّد شغّالين: واحد بس بيقرأ ‎/backup الساعة 02:00، والثاني صلاحيات أدمن وكلمة مرور مشتركة.' },
    },
    {
      id: 'ip',
      prompt: { en: 'The firewall deny list is missing the most important address. Which IP must be added?', ar: 'قائمة الحظر بالجدار الناري ناقصها أهم عنوان. أي IP لازم ينضاف؟' },
      placeholder: 'x.x.x.x',
      validator: { kind: 'evidence', evidence: 'ev.l02.ip' },
      wrong: { en: 'Read fw-blocklist.conf character by character. One entry only looks like the address you found in Act 1.', ar: 'اقرأ fw-blocklist.conf حرف حرف. في عنوان بس شكله زي العنوان اللي لقيته بالفصل الأول.' },
    },
    {
      id: 'domains',
      prompt: { en: 'Which domains go on the resolver\'s block list?', ar: 'أي نطاقات لازم تنحط بقائمة الحظر عند الـ DNS؟' },
      validator: {
        kind: 'choice',
        correct: 'attacker',
        options: [
          { id: 'vendor', label: { en: `${ACT6.vendorDomain}: he works there`, ar: `${ACT6.vendorDomain}: هو بيشتغل هناك` } },
          { id: 'attacker', label: { en: `${ACT6.lookalike}, ${ACT6.trickDomain} and ${ACT6.exfilDomain} (with every name under it)`, ar: `${ACT6.lookalike} و ${ACT6.trickDomain} و ${ACT6.exfilDomain} (مع كل الأسماء اللي تحته)` } },
          { id: 'own', label: { en: `${ACT6.domain}, because the phishing used its name`, ar: `${ACT6.domain}، لأن التصيّد استخدم اسمه` } },
        ],
      },
      wrong: { en: 'Step 4: block the attacker, not a business partner and not yourself. Which domains did he register for the attack?', ar: 'الخطوة 4: احظر المهاجم، مش شريك شغل ومش حالك. أي نطاقات سجّلها هو للهجوم؟' },
      grants: [
        {
          id: 'ev.l26.contained',
          title: { en: 'Contained: FIN03 quarantined, nova-svc disabled, IOCs blocked', ar: 'الاحتواء: عزل FIN03 وإيقاف nova-svc وحظر المؤشرات' },
          type: 'note',
          content: `${ACT6.finHost} (${ACT6.finIp}) quarantined running; ${ACT6.vendorAccount} disabled (${ACT6.pullAccount} kept); deny ${ACT6.attackerIp}; resolver blocks ${ACT6.lookalike}, ${ACT6.trickDomain}, ${ACT6.exfilDomain}`,
          links: ['ev.l24.next', 'ev.l02.ip', 'ev.l07.domains', 'ev.l18.exfil'],
        },
      ],
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: 'cat playbook.txt first: it tells you the order of the work.', ar: 'اقرأ playbook.txt بالأول: بيحكيلك ترتيب الشغل.' }, cost: 25 },
    {
      tier: 'direction',
      text: { en: 'grep FIN03 hosts.csv for the IP. grep enabled accounts.csv for the open door. Compare fw-blocklist.conf with the IP on your board.', ar: '‏grep FIN03 hosts.csv عشان الـ IP. و grep enabled accounts.csv عشان الباب المفتوح. وقارن fw-blocklist.conf مع الـ IP اللي عاللوح.' },
      cost: 45,
    },
    {
      tier: 'near-solution',
      text: { en: `${ACT6.finHost} is at ${ACT6.finIp}: quarantine it running. The admin vendor account with the shared password is still enabled. The list blocks ${ACT6.scannerIp}, not the attacker's address.`, ar: `‏${ACT6.finHost} عنوانه ${ACT6.finIp}: اعزله وهو شغّال. حساب المورّد اللي إله صلاحيات أدمن وكلمة مرور مشتركة لسا شغّال. والقائمة حاظرة ${ACT6.scannerIp}، مش عنوان المهاجم.` },
      cost: 65,
    },
  ],
  rewards: { points: 180 },
  debrief: {
    concept: {
      en: 'Containment stops the damage while keeping the evidence. Isolate a machine at the network (a quarantine VLAN or the EDR "isolate" button) instead of switching it off, because memory, open connections and running programs disappear at power-off. Disable the accounts the intruder can still use, including service and vendor accounts, which are easy to forget because no person logs in with them every day. Keep what is clean and needed (the read-only backup pull) so the business keeps running. Block confirmed indicators where they work: IP addresses on the firewall, domains on the DNS resolver (a whole zone, so new names under it are caught too). And check every entry: one wrong digit blocks a harmless scanner and leaves the real attacker free.',
      ar: 'الاحتواء بيوقف الضرر وبيحافظ عالأدلة. اعزل الجهاز عن الشبكة (شبكة عزل أو زر "عزل" ببرنامج حماية الأجهزة) بدل ما تطفيه، لأن الذاكرة والاتصالات المفتوحة والبرامج الشغّالة بتروح لما ينطفى. وقّف الحسابات اللي المتسلل لسا بيقدر يستخدمها، ومنها حسابات الخدمات والموردين، لأنها سهل تنتسى لأنه ما في شخص بيدخل فيها كل يوم. وخلّي النظيف والمهم شغّال (سحب النسخ الاحتياطي للقراءة بس) عشان الشغل يكمّل. واحظر المؤشرات المؤكدة بالمكان اللي بتنفع فيه: العناوين عالجدار الناري، والنطاقات عند خادم الـ DNS (النطاق كامل، عشان أي اسم جديد تحته ينمسك). وافحص كل سطر: رقم واحد غلط بيحظر ماسح ضاير وبيترك المهاجم الحقيقي حر.',
    },
    realTools: ['EDR network isolation (Microsoft Defender for Endpoint, CrowdStrike Falcon)', 'NAC / quarantine VLAN', 'firewall deny lists', 'DNS Response Policy Zones (RPZ)', 'Active Directory / IAM account disable'],
    takeaway: {
      en: 'Isolate, do not unplug the power. Close every door, including vendor and service accounts. Block the attacker, not your partners.',
      ar: 'اعزل، ولا تفصل الكهربا. سكّر كل باب، حتى حسابات الموردين والخدمات. احظر المهاجم، مش شركاءك.',
    },
    source: 'NIST SP 800-61 Rev. 3 (Incident Response Recommendations, 2025); CISA Cybersecurity Incident & Vulnerability Response Playbooks (2021)',
  },
  echo: {
    intro: { en: 'Fast is good. Careful is better. One wrong digit and we block the wrong person.', ar: 'السرعة منيحة. والدقة أحسن. رقم واحد غلط ومنحظر الشخص الغلط.' },
    success: {
      en: 'FIN03 is in quarantine and still running, his vendor door is shut, his addresses are blocked. Now we make sure nothing of his is left behind.',
      ar: 'جهاز FIN03 معزول وشغّال، وباب المورّد اللي كان يفوت منه تسكّر، وعناوينه محظورة. هلّق بدنا نتأكد إنه ما ضل إشي إله ورا.',
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
