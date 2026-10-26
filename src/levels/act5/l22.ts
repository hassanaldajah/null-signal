import type { LevelConfig } from '../../engine/schema';
import { jpegExif, pngStub } from '../lib/binary';
import { ACT5, PHOTO, sendLogText } from './story';

const HOME = `${ACT5.image}/home/s.haddad`;
const TRASH = `${ACT5.image}${ACT5.trash}`;
const SHOT = 'Screenshot from 2026-03-09 10-14-52.png';
/** The Trash writes DeletionDate in the machine's local time (+0200 here), with no zone. */
const LOCAL_DELETED = '2026-03-13T10:58:31';

const trashinfo = (path: string, deleted: string) => `[Trash Info]\nPath=${path}\nDeletionDate=${deleted}\n`;

const level: LevelConfig = {
  id: 'L22',
  requires: { levels: ['L21'], evidence: ['ev.l21.mailbox', 'ev.l18.exfil'] },
  briefing: {
    en: `The stash on ws07 looks tidy: x11-helper's usage mentions a log, yet there is no log, and the photo gh0st worked from is gone too. They deleted things. But on a Linux desktop, "deleted" does not always mean gone. Start in Samir's home in the image: check what rm really did in his shell, then find out where the files went, where they came from and when they were deleted.`,
    ar: `المخبأ على ws07 شكله مرتّب: طريقة استخدام x11-helper بتذكر ملف سجل، بس ما في سجل، والصورة اللي اشتغل منها gh0st كمان مش موجودة. حذفوا أشياء. بس على سطح مكتب لينكس، "انحذف" مش دايماً معناها راح. ابدأ من مجلد سمير بالنسخة: افحص شو عمل rm فعلاً بالطرفية تبعته، وبعدين اعرف وين راحت الملفات، ومن وين إجت، وإيمتى انحذفت.`,
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT5.soc,
    home: '/home/a.nasser',
    cwd: HOME,
    now: ACT5.now,
    dirs: [`${HOME}/Documents`, `${HOME}/Downloads`, `${HOME}/Pictures`, `${ACT5.image}${ACT5.stash}`],
    files: {
      [`${ACT5.image}/README-image.txt`]: {
        content: `helix-ws07 disk image, acquired 2026-03-14 18:20 UTC by a.nasser. Mounted read-only.\nPaths below this folder are the paths on ws07: ./home/s.haddad here = /home/s.haddad on ws07.\nws07 clock: local time = UTC${ACT5.localOffset} (see ./etc/timezone). Desktop tools write local time.\n`,
        mtime: '2026-03-14T18:40:00Z',
      },
      [`${ACT5.image}/etc/timezone`]: { content: 'Europe/Nicosia\n', owner: 'root', mtime: '2025-09-02T08:00:00Z' },
      [`${HOME}/.bashrc`]: { content: '# ~/.bashrc\nalias ll="ls -la"\nexport EDITOR=vim\n[ -f ~/.bash_aliases ] && . ~/.bash_aliases\n', owner: 's.haddad', mtime: '2025-06-10T09:00:00Z' },
      [`${HOME}/.bash_aliases`]: {
        content: "# Samir's safety net (June 2025): rm moves files to the Trash instead of deleting them.\n# trash-list shows them, trash-restore puts them back. A real delete needs \\rm or /bin/rm.\nalias rm='trash-put'\nalias df='df -h'\n",
        owner: 's.haddad',
        mtime: '2025-06-10T09:02:00Z',
      },
      [`${HOME}/.bash_history`]: { content: '', mode: '-rw-------', owner: 's.haddad', mtime: '2026-03-13T08:59:02Z' },
      [`${HOME}/Documents/printer-floor2.txt`]: { content: 'Floor 2 printer: HP driver reinstalled 12 Mar, test page OK.\n', owner: 's.haddad', mtime: '2026-03-12T16:24:00Z' },
      [`${TRASH}/files/floor2-printer.ppd`]: { content: '*PPD-Adobe: "4.3"\n*ModelName: "Floor 2 LaserJet"\n', owner: 's.haddad', mtime: '2026-03-12T16:02:00Z' },
      [`${TRASH}/info/floor2-printer.ppd.trashinfo`]: { content: trashinfo('/home/s.haddad/Downloads/floor2-printer.ppd', '2026-03-12T18:20:11'), owner: 's.haddad', mtime: '2026-03-12T16:20:11Z' },
      [`${TRASH}/files/${SHOT}`]: { content: pngStub(1920, 1080, 120, 2201), owner: 's.haddad', mtime: '2026-03-09T08:14:52Z' },
      [`${TRASH}/info/${SHOT}.trashinfo`]: {
        content: trashinfo(`/home/s.haddad/Pictures/${SHOT.replace(/ /g, '%20')}`, '2026-03-10T11:03:27'),
        owner: 's.haddad',
        mtime: '2026-03-10T09:03:27Z',
      },
      [`${TRASH}/files/${ACT5.sendLog}`]: { content: sendLogText(), owner: 's.haddad', mtime: ACT5.sendDone },
      [`${TRASH}/info/${ACT5.sendLog}.trashinfo`]: { content: trashinfo(`${ACT5.stash}/${ACT5.sendLog}`, LOCAL_DELETED), owner: 's.haddad', mtime: ACT5.trashedAt },
      [`${TRASH}/files/${ACT5.photo}`]: { content: jpegExif(PHOTO, 400, 2311), owner: 's.haddad', mtime: '2026-03-13T03:59:40Z' },
      [`${TRASH}/info/${ACT5.photo}.trashinfo`]: { content: trashinfo(`${ACT5.stash}/${ACT5.photo}`, LOCAL_DELETED), owner: 's.haddad', mtime: ACT5.trashedAt },
      [`${TRASH}/directorysizes`]: { content: '', owner: 's.haddad', mtime: ACT5.trashedAt },
    },
  },
  objectives: [
    {
      id: 'alias',
      prompt: { en: "In Samir's shell, rm does not really delete. What command does it run instead?", ar: 'بطرفية سمير، rm ما بيحذف فعلاً. شو الأمر اللي بيشغّله بداله؟' },
      placeholder: 'command',
      validator: { kind: 'answer', accept: ['trash-put', "alias rm='trash-put'", 'alias rm=trash-put'] },
      wrong: {
        en: 'Shortcuts (aliases) live in the shell start-up files: hidden files in the home folder. ls -a, then read what .bashrc loads.',
        ar: 'الاختصارات (alias) موجودة بملفات بداية الطرفية: ملفات مخفية بمجلد المستخدم. ‏ls -a، وبعدين اقرأ شو بيحمّل .bashrc.',
      },
    },
    {
      id: 'origin',
      prompt: { en: `The Trash keeps a note for every file it holds. Where on ws07 did ${ACT5.sendLog} live before it was deleted? (full path)`, ar: `السلة بتحتفظ بورقة لكل ملف فيها. وين كان ${ACT5.sendLog} على ws07 قبل ما ينحذف؟ (المسار الكامل)` },
      placeholder: '/path/file',
      validator: { kind: 'answer', accept: [`${ACT5.stash}/${ACT5.sendLog}`, `${ACT5.image}${ACT5.stash}/${ACT5.sendLog}`] },
      wrong: {
        en: 'The Trash has two folders: files/ holds the files, info/ holds one .trashinfo note per file. Read the note: Path= is where it came from.',
        ar: 'السلة فيها مجلدين: files/ فيه الملفات، و info/ فيه ورقة .trashinfo لكل ملف. اقرأ الورقة: Path= هو المكان اللي إجا منه.',
      },
    },
    {
      id: 'when',
      prompt: { en: 'When was it deleted? Give the time in UTC (HH:MM).', ar: 'إيمتى انحذف؟ اكتب الوقت بـ UTC ‏(HH:MM).' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['08:58', '08:58:31'] },
      derived: `DeletionDate=${LOCAL_DELETED} is ws07 local time (README: UTC${ACT5.localOffset}); minus 2 hours = 08:58 UTC.`,
      wrong: {
        en: 'DeletionDate has no zone: the Trash writes the computer\'s local time. The image README tells you ws07\'s offset from UTC.',
        ar: 'DeletionDate ما فيه منطقة زمنية: السلة بتكتب الوقت المحلي للجهاز. ملف README بالنسخة بيحكيلك قديش ws07 بعيد عن UTC.',
      },
      grants: [
        {
          id: 'ev.l22.trash',
          title: { en: "gh0st's deletes landed in Samir's Trash", ar: 'اللي حذفه gh0st وقع بسلة سمير' },
          type: 'file',
          content: `${ACT5.sendLog} + ${ACT5.photo} from ${ACT5.stash}, deleted Mar 13 08:58 UTC (rm = trash-put)`,
          links: ['ev.l21.mailbox'],
        },
      ],
    },
    {
      id: 'sent',
      prompt: { en: `Read the recovered ${ACT5.sendLog}. Did Mei Chen's mailbox leave Helix?`, ar: `اقرأ ${ACT5.sendLog} اللي رجّعناه. صندوق بريد مي تشين طلع من Helix؟` },
      validator: {
        kind: 'choice',
        correct: 'all',
        options: [
          { id: 'none', label: { en: 'No: it was deleted before it was sent', ar: 'لأ: انحذف قبل ما ينبعت' } },
          { id: 'part', label: { en: 'Only part of it: the send stopped at a timeout', ar: 'جزء منه بس: الإرسال وقف عند انقطاع' } },
          { id: 'all', label: { en: 'Yes, all of it: every chunk was acknowledged', ar: 'آه، كله: كل قطعة وصل تأكيدها' } },
        ],
      },
      wrong: { en: 'A timeout in the middle is not the end of the story. Read the log to its last line.', ar: 'الانقطاع بالنص مش آخر القصة. اقرأ السجل لآخر سطر.' },
      grants: [
        {
          id: 'ev.l22.sent',
          title: { en: "Mei Chen's mailbox left Helix", ar: 'صندوق بريد مي تشين طلع من Helix' },
          type: 'artifact',
          content: `${ACT5.chunks}/${ACT5.chunks} chunks acked via ${ACT5.exfilVia}, Mar 13 08:44-08:55 UTC (from ${ACT5.wsIp})`,
          links: ['ev.l21.mailbox', 'ev.l18.exfil'],
        },
      ],
    },
    {
      id: 'rm',
      prompt: { en: 'The Trash saved this evidence. What happens when someone uses a real rm instead?', ar: 'السلة حفظت هالدليل. شو بيصير لما حدا يستخدم rm حقيقي؟' },
      validator: {
        kind: 'choice',
        correct: 'blocks',
        options: [
          { id: 'gone', label: { en: 'The data is wiped from the disk the moment rm runs', ar: 'البيانات بتنمسح من القرص لحظة ما يشتغل rm' } },
          { id: 'blocks', label: { en: 'rm removes the name; the data stays on the disk until new data overwrites it, so image the disk early', ar: 'rm بيشيل الاسم؛ البيانات بتضل على القرص لحد ما بيانات جديدة تكتب فوقها، فلازم تاخذ نسخة من القرص بدري' } },
          { id: 'empty', label: { en: 'Emptying the Trash securely overwrites the files', ar: 'تفريغ السلة بيكتب فوق الملفات بشكل آمن' } },
        ],
      },
      wrong: { en: 'Think of a library: rm tears out the catalogue card. Is the book still on the shelf?', ar: 'تخيّل مكتبة: rm بيقطع بطاقة الفهرس. الكتاب لسا على الرف؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: `ls -a ${HOME}, then cat .bashrc: its last line loads another hidden file.`, ar: `‏ls -a ${HOME}، وبعدين cat .bashrc: آخر سطر فيه بيحمّل ملف مخفي ثاني.` }, cost: 15 },
    {
      tier: 'direction',
      text: {
        en: 'trash-put follows the freedesktop Trash: ~/.local/share/Trash/files holds the files and ~/.local/share/Trash/info holds NAME.trashinfo with Path= and DeletionDate= (local time).',
        ar: 'trash-put بيمشي على نظام سلة freedesktop: ‏~/.local/share/Trash/files فيه الملفات، و ~/.local/share/Trash/info فيه NAME.trashinfo مع Path= و DeletionDate= (بالوقت المحلي).',
      },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: `From Samir's home in the image: cat .local/share/Trash/info/${ACT5.sendLog}.trashinfo: Path=${ACT5.stash}/${ACT5.sendLog}, DeletionDate 10:58:31 local = 08:58 UTC. The log's last line says ${ACT5.chunks}/${ACT5.chunks} acked.`,
        ar: `بالنسخة: cat ‏.local/share/Trash/info/${ACT5.sendLog}.trashinfo: ‏Path=${ACT5.stash}/${ACT5.sendLog}، و DeletionDate الساعة 10:58:31 محلي = 08:58 UTC. وآخر سطر بالسجل بيقول ${ACT5.chunks}/${ACT5.chunks} وصل تأكيدها.`,
      },
      cost: 45,
    },
  ],
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'Deleting is often just moving. Desktop Linux follows the freedesktop Trash: the file goes to ~/.local/share/Trash/files and a small .trashinfo note in info/ records where it came from (Path=, spaces written as %20) and when (DeletionDate=, local time with no zone, so you must know the machine\'s offset). Windows does the same in C:\\$Recycle.Bin, where each $I file holds the original path and the deletion time, and macOS uses ~/.Trash. Even a real rm only removes the name: the data stays on the disk until something overwrites it, which is why responders image a disk early and carving tools can still recover files. Here a sysadmin\'s safety alias turned gh0st\'s clean-up (MITRE T1070.004) into evidence: proof that Mei Chen\'s mailbox fully left the company.',
      ar: 'الحذف كثير مرات مجرد نقل. لينكس بسطح المكتب بيمشي على نظام سلة freedesktop: الملف بيروح على ~/.local/share/Trash/files، وورقة صغيرة .trashinfo بمجلد info/ بتسجّل من وين إجا (Path=، والمسافات بتنكتب %20) وإيمتى (DeletionDate=، بالوقت المحلي وبدون منطقة زمنية، فلازم تعرف فرق توقيت الجهاز). ويندوز بيعمل نفس الإشي بـ C:\\$Recycle.Bin، وكل ملف $I فيه المسار الأصلي ووقت الحذف، وماك بيستخدم ~/.Trash. وحتى rm الحقيقي بيشيل الاسم بس: البيانات بتضل على القرص لحد ما إشي يكتب فوقها، عشان هيك فريق الاستجابة بياخذ نسخة من القرص بدري، وأدوات الاستخراج (carving) بتقدر ترجّع ملفات. هون اختصار أمان عمله مدير نظام قلب تنظيف gh0st لآثاره (MITRE T1070.004) لدليل: إثبات إن صندوق بريد مي تشين طلع كامل من الشركة.',
    },
    realTools: ['trash-cli (trash-list, trash-restore)', 'Autopsy / The Sleuth Kit', 'PhotoRec', 'extundelete', 'RBCmd ($Recycle.Bin $I parser)'],
    takeaway: {
      en: 'Before you call something gone, check the Trash, the Recycle Bin and the unallocated space. And write down the clock zone of every date you read.',
      ar: 'قبل ما تقول إشي راح، افحص السلة وسلة المحذوفات والمساحة الفاضية بالقرص. واكتب المنطقة الزمنية لكل تاريخ بتقرأه.',
    },
    source: 'freedesktop.org Trash Specification 1.0; MITRE ATT&CK T1070.004 (File Deletion); NIST SP 800-86 (Integrating Forensic Techniques into Incident Response)',
  },
  echo: {
    intro: { en: 'Deleted files leave footprints. Samir may have left us a safety net.', ar: 'الملفات المحذوفة بتترك آثار. يمكن سمير ترك لنا شبكة أمان.' },
    success: {
      en: 'The whole mailbox got out, and the photo they worked from is still in the bin. Next: what does that photo say about who took it?',
      ar: 'الصندوق كله طلع، والصورة اللي اشتغلوا منها لسا بالسلة. الجاي: شو بتحكي هالصورة عن اللي صوّرها؟',
    },
  },
  solution: `ls -a ~s.haddad -> .bash_aliases: alias rm='trash-put'. Trash/info/send.log.trashinfo: Path=${ACT5.stash}/send.log, DeletionDate=${LOCAL_DELETED} (local +0200) = 08:58 UTC. Trash/files/send.log: 2101/2101 acked -> all. Choice: blocks.`,
  selfTest: [
    { run: 'ls -a', includes: '.bash_aliases' },
    { run: 'cat .bash_aliases', includes: "alias rm='trash-put'" },
    { run: 'cd .local/share/Trash/info', includes: '' },
    { run: `cat ${ACT5.sendLog}.trashinfo`, includes: `Path=${ACT5.stash}/${ACT5.sendLog}` },
    { run: `cat ${ACT5.sendLog}.trashinfo`, includes: `DeletionDate=${LOCAL_DELETED}` },
    { run: `cat ../files/${ACT5.sendLog}`, includes: '2101/2101 acked' },
    { run: `cat ${ACT5.image}/README-image.txt`, includes: `UTC${ACT5.localOffset}` },
    { run: 'ls ../files', includes: SHOT },
    { run: `file ../files/${ACT5.photo}`, includes: 'JPEG image data' },
  ],
};

export default level;
