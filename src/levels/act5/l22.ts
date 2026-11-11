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
    ar: 'المخبأ على الجهاز `helix-ws07` يبدو مرتّباً: شرح استخدام البرنامج `x11-helper` يذكر ملف سجل، لكن لا يوجد سجل، والصورة التي اعتمد عليها gh0st اختفت أيضاً. لقد حذفوا أشياء. لكن في لينكس بواجهة سطح المكتب، «حُذف» لا تعني دائماً أنه اختفى. ابدأ من مجلد سمير الرئيسي في نسخة القرص: افحص ماذا يفعل الأمر `rm` فعلاً في طرفيته، ثم اعرف أين ذهبت الملفات، ومن أين جاءت، ومتى حُذفت.',
  },
  mission: {
    goal: {
      en: 'Find the files the attacker "deleted" on Samir\'s computer, and learn where they came from and when they were deleted.',
      ar: 'اعثر على الملفات التي «حذفها» المهاجم من جهاز سمير، واعرف من أين جاءت ومتى حُذفت.',
    },
    investigate: [
      {
        en: "The hidden files in Samir's home folder: `.bashrc` and `.bash_aliases` show what `rm` really does.",
        ar: 'الملفات المخفية في مجلد سمير الرئيسي: الملفان `.bashrc` و`.bash_aliases` يبيّنان ماذا يفعل الأمر `rm` فعلاً.',
      },
      {
        en: 'The Trash folder `.local/share/Trash`: `files/` holds the deleted files and `info/` holds one `.trashinfo` note for each.',
        ar: 'مجلد سلة المحذوفات `.local/share/Trash`: المجلد `files/` فيه الملفات المحذوفة، والمجلد `info/` فيه ورقة `.trashinfo` لكل ملف.',
      },
      {
        en: "The file `README-image.txt` at the top of the image: it gives the computer's time difference from UTC.",
        ar: 'الملف `README-image.txt` في أعلى نسخة القرص: يذكر فرق توقيت الجهاز عن UTC.',
      },
    ],
    success: {
      en: 'You have named the command behind `rm`, the original path of `send.log`, the deletion time in UTC, and whether the mailbox left the company.',
      ar: 'تكون قد كتبت الأمر الذي يعمل بدل `rm`، والمسار الأصلي للملف `send.log`، ووقت الحذف بتوقيت UTC، وعرفت هل خرج صندوق البريد من الشركة.',
    },
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
      prompt: { en: "In Samir's shell, `rm` does not really delete. What command does it run instead?", ar: 'في طرفية سمير، الأمر `rm` لا يحذف فعلاً. ما الأمر الذي يعمل بدلاً منه؟' },
      placeholder: 'command',
      validator: { kind: 'answer', accept: ['trash-put', "alias rm='trash-put'", 'alias rm=trash-put'] },
      wrong: {
        en: 'Shortcuts (aliases) live in the shell start-up files: hidden files in the home folder. Run `ls -a`, then read what `.bashrc` loads.',
        ar: 'الاختصارات (alias) موجودة في ملفات بدء الطرفية، وهي ملفات مخفية في المجلد الرئيسي. شغّل `ls -a` ثم اقرأ ما يحمّله الملف `.bashrc`.',
      },
    },
    {
      id: 'origin',
      prompt: { en: 'The Trash keeps a note for every file it holds. Where on ws07 did `send.log` live before it was deleted? (full path)', ar: 'سلة المحذوفات تحفظ ورقة لكل ملف فيها. أين كان الملف `send.log` على الجهاز ws07 قبل حذفه؟ (المسار الكامل)' },
      placeholder: '/path/file',
      validator: { kind: 'answer', accept: [`${ACT5.stash}/${ACT5.sendLog}`, `${ACT5.image}${ACT5.stash}/${ACT5.sendLog}`] },
      wrong: {
        en: 'The Trash has two folders: `files/` holds the files, `info/` holds one `.trashinfo` note per file. Read the note: `Path=` is where it came from.',
        ar: 'في السلة مجلدان: `files/` فيه الملفات، و`info/` فيه ورقة `.trashinfo` لكل ملف. اقرأ الورقة: سطر `Path=` هو المكان الذي جاء منه الملف.',
      },
    },
    {
      id: 'when',
      prompt: { en: 'When was it deleted? Give the time in UTC (HH:MM).', ar: 'متى حُذف؟ اكتب الوقت بتوقيت UTC (بصيغة HH:MM).' },
      placeholder: 'HH:MM',
      validator: { kind: 'answer', accept: ['08:58', '08:58:31'] },
      derived: `DeletionDate=${LOCAL_DELETED} is ws07 local time (README: UTC${ACT5.localOffset}); minus 2 hours = 08:58 UTC.`,
      wrong: {
        en: "`DeletionDate` has no zone: the Trash writes the computer's local time. The image README tells you ws07's offset from UTC.",
        ar: 'القيمة `DeletionDate` ليس فيها منطقة زمنية: السلة تكتب التوقيت المحلي للجهاز. ملف `README-image.txt` في نسخة القرص يذكر فرق توقيت الجهاز ws07 عن UTC.',
      },
      grants: [
        {
          id: 'ev.l22.trash',
          title: { en: "gh0st's deletes landed in Samir's Trash", ar: 'ما حذفه gh0st وقع في سلة محذوفات سمير' },
          type: 'file',
          content: `${ACT5.sendLog} + ${ACT5.photo} from ${ACT5.stash}, deleted Mar 13 08:58 UTC (rm = trash-put)`,
          links: ['ev.l21.mailbox'],
        },
      ],
    },
    {
      id: 'sent',
      prompt: { en: "Read the recovered `send.log`. Did Mei Chen's mailbox leave Helix?", ar: 'اقرأ الملف `send.log` الذي استعدناه. هل خرج صندوق بريد مي تشين من Helix؟' },
      validator: {
        kind: 'choice',
        correct: 'all',
        options: [
          { id: 'none', label: { en: 'No: it was deleted before it was sent', ar: 'لا: حُذف قبل أن يُرسل' } },
          { id: 'part', label: { en: 'Only part of it: the send stopped at a timeout', ar: 'جزء منه فقط: توقف الإرسال عند انقطاع' } },
          { id: 'all', label: { en: 'Yes, all of it: every chunk was acknowledged', ar: 'نعم، كله: وصل تأكيد كل قطعة' } },
        ],
      },
      wrong: { en: 'A timeout in the middle is not the end of the story. Read the log to its last line.', ar: 'الانقطاع في الوسط ليس نهاية القصة. اقرأ السجل حتى السطر الأخير.' },
      grants: [
        {
          id: 'ev.l22.sent',
          title: { en: "Mei Chen's mailbox left Helix", ar: 'صندوق بريد مي تشين خرج من Helix' },
          type: 'artifact',
          content: `${ACT5.chunks}/${ACT5.chunks} chunks acked via ${ACT5.exfilVia}, Mar 13 08:44-08:55 UTC (from ${ACT5.wsIp})`,
          links: ['ev.l21.mailbox', 'ev.l18.exfil'],
        },
      ],
    },
    {
      id: 'rm',
      prompt: { en: 'The Trash saved this evidence. What happens when someone uses a real `rm` instead?', ar: 'سلة المحذوفات حفظت هذا الدليل. ماذا يحدث عند استخدام الأمر `rm` الحقيقي؟' },
      validator: {
        kind: 'choice',
        correct: 'blocks',
        options: [
          { id: 'gone', label: { en: 'The data is wiped from the disk the moment rm runs', ar: 'تُمحى البيانات من القرص لحظة تنفيذ الأمر' } },
          { id: 'blocks', label: { en: 'rm removes the name; the data stays on the disk until new data overwrites it, so image the disk early', ar: 'يُحذف الاسم فقط، وتبقى البيانات على القرص إلى أن تُكتب فوقها بيانات جديدة، ولذلك يجب نسخ القرص مبكراً' } },
          { id: 'empty', label: { en: 'Emptying the Trash securely overwrites the files', ar: 'تفريغ السلة يكتب فوق الملفات بطريقة آمنة' } },
        ],
      },
      wrong: { en: 'Think of a library: rm tears out the catalogue card. Is the book still on the shelf?', ar: 'تخيّل مكتبة: الأمر `rm` يمزّق بطاقة الفهرس. هل ما زال الكتاب على الرف؟' },
    },
  ],
  guide: {
    nudge: {
      en: 'Run `ls -a`, then `cat .bashrc`: its last line loads another hidden file.',
      ar: 'شغّل `ls -a` ثم `cat .bashrc`: السطر الأخير فيه يحمّل ملفاً مخفياً آخر.',
    },
    clue: {
      en: '`trash-put` follows the desktop Trash rules: `.local/share/Trash/files` holds the files, and `.local/share/Trash/info` holds a `.trashinfo` note with `Path=` and `DeletionDate=` (local time).',
      ar: 'الأمر `trash-put` يتبع نظام سلة المحذوفات في سطح المكتب: المجلد `.local/share/Trash/files` فيه الملفات، والمجلد `.local/share/Trash/info` فيه ورقة `.trashinfo` تحتوي على `Path=` و`DeletionDate=` (بالتوقيت المحلي).',
    },
    steps: {
      alias: {
        en: "Run `ls -a`, then `cat .bash_aliases`. It contains `alias rm='trash-put'`: here `rm` moves files to the Trash. Type `trash-put`.",
        ar: "شغّل `ls -a` ثم `cat .bash_aliases`. فيه السطر `alias rm='trash-put'`: أي أن `rm` هنا ينقل الملفات إلى سلة المحذوفات. اكتب `trash-put`.",
      },
      origin: {
        en: 'Run `cat .local/share/Trash/info/send.log.trashinfo`. The `Path=` line is where the file lived: `/var/tmp/.fontconfig-cache/send.log`.',
        ar: 'شغّل `cat .local/share/Trash/info/send.log.trashinfo`. سطر `Path=` هو المكان الذي كان فيه الملف: `/var/tmp/.fontconfig-cache/send.log`.',
      },
      when: {
        en: 'The same note says `DeletionDate=2026-03-13T10:58:31`, in local time. `README-image.txt` says local time is UTC+0200, so subtract 2 hours. Type `08:58`.',
        ar: 'الورقة نفسها فيها `DeletionDate=2026-03-13T10:58:31` بالتوقيت المحلي. والملف `README-image.txt` يذكر أن التوقيت المحلي هو `UTC+0200`، فاطرح ساعتين. اكتب `08:58`.',
      },
      sent: {
        en: 'Run `cat .local/share/Trash/files/send.log` and read to the last line: `done 2101/2101 acked (0 lost)`. The timeout in the middle was followed by a retry. Choose "Yes, all of it".',
        ar: 'شغّل `cat .local/share/Trash/files/send.log` واقرأ حتى السطر الأخير: `done 2101/2101 acked (0 lost)`. الانقطاع الذي في الوسط تبعته إعادة محاولة. اختر «نعم، كله».',
      },
      rm: {
        en: 'Choose "rm removes the name; the data stays on the disk until new data overwrites it, so image the disk early".',
        ar: 'اختر الجواب الذي يقول إن `rm` يحذف الاسم فقط، وإن البيانات تبقى على القرص إلى أن تُكتب فوقها بيانات جديدة.',
      },
    },
    concept: {
      en: 'Deleting is often only moving: the Trash keeps the file and a note about where it came from and when. Even a real delete removes only the name, and the data stays until something overwrites it. That is why investigators copy a disk early and check the Trash first.',
      ar: 'الحذف في أحيان كثيرة مجرد نقل: سلة المحذوفات تحفظ الملف ومعه ورقة تذكر من أين جاء ومتى. وحتى الحذف الحقيقي يزيل الاسم فقط، وتبقى البيانات إلى أن يُكتب فوقها. لذلك ينسخ المحققون القرص مبكراً ويفحصون سلة المحذوفات أولاً.',
    },
  },
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'Deleting is often just moving. Desktop Linux follows the freedesktop Trash: the file goes to ~/.local/share/Trash/files and a small .trashinfo note in info/ records where it came from (Path=, spaces written as %20) and when (DeletionDate=, local time with no zone, so you must know the machine\'s offset). Windows does the same in C:\\$Recycle.Bin, where each $I file holds the original path and the deletion time, and macOS uses ~/.Trash. Even a real rm only removes the name: the data stays on the disk until something overwrites it, which is why responders image a disk early and carving tools can still recover files. Here a sysadmin\'s safety alias turned gh0st\'s clean-up (MITRE T1070.004) into evidence: proof that Mei Chen\'s mailbox fully left the company.',
      ar: 'الحذف في أحيان كثيرة مجرد نقل. لينكس بواجهة سطح المكتب يتبع نظام سلة محذوفات موحّداً: الملف ينتقل إلى `~/.local/share/Trash/files`، وورقة صغيرة `.trashinfo` في المجلد `info/` تسجّل من أين جاء (`Path=`، والمسافات تُكتب `%20`) ومتى (`DeletionDate=`، بالتوقيت المحلي ودون منطقة زمنية، فيجب أن تعرف فرق توقيت الجهاز). ويندوز يفعل الشيء نفسه في `C:\\$Recycle.Bin`، وماك يستخدم `~/.Trash`. وحتى الأمر `rm` الحقيقي يحذف الاسم فقط: البيانات تبقى على القرص إلى أن يُكتب فوقها، ولذلك ينسخ فريق الاستجابة القرص مبكراً، وتستطيع أدوات الاستخراج استعادة ملفات. هنا حوّل اختصار أمان وضعه مدير النظام محاولة gh0st لمحو آثاره (MITRE T1070.004) إلى دليل: إثبات أن صندوق بريد مي تشين خرج كاملاً من الشركة.',
    },
    realTools: ['trash-cli (trash-list, trash-restore)', 'Autopsy / The Sleuth Kit', 'PhotoRec', 'extundelete', 'RBCmd ($Recycle.Bin $I parser)'],
    takeaway: {
      en: 'Before you call something gone, check the Trash, the Recycle Bin and the unallocated space. And write down the clock zone of every date you read.',
      ar: 'قبل أن تقول إن شيئاً اختفى، افحص سلة المحذوفات والمساحة غير المستخدمة في القرص. واكتب المنطقة الزمنية لكل تاريخ تقرؤه.',
    },
    source: 'freedesktop.org Trash Specification 1.0; MITRE ATT&CK T1070.004 (File Deletion); NIST SP 800-86 (Integrating Forensic Techniques into Incident Response)',
  },
  echo: {
    intro: { en: 'Deleted files leave footprints. Samir may have left us a safety net.', ar: 'الملفات المحذوفة تترك آثاراً. وربما ترك لنا سمير شبكة أمان.' },
    success: {
      en: 'The whole mailbox got out, and the photo they worked from is still in the bin. Next: what does that photo say about who took it?',
      ar: 'صندوق البريد خرج كله، والصورة التي اعتمدوا عليها ما زالت في السلة. التالي: ماذا تقول هذه الصورة عمّن التقطها؟',
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
