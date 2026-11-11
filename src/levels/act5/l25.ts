import { sha256 } from '../../engine/hash';
import type { LevelConfig } from '../../engine/schema';
import { elfStub, gzipStub, jpegExif, jpegPlain } from '../lib/binary';
import { ACT5, fontsConf, PHOTO, sendLogText, X11_HELPER_TEXT } from './story';

const VAULT = '/srv/vault/HELIX-0313';
const SHARE = '/srv/share/HELIX-0313';
const CUSTODY = '/home/a.nasser/evidence/custody';

/** The five items acquired from the ws07 image (same bytes as in L21-L24). */
const ITEMS: [id: string, name: string, origin: string, content: string][] = [
  ['E1', ACT5.sendLog, `${ACT5.trash}/files (was ${ACT5.stash})`, sendLogText()],
  ['E2', ACT5.photo, `${ACT5.trash}/files (was ${ACT5.stash})`, jpegExif(PHOTO, 400, 2311)],
  ['E3', 'fonts.cache-7', ACT5.stash, gzipStub(ACT5.mailbox, ACT5.mailboxStagedAt, 320, 2101)],
  ['E4', 'x11-icon.png', ACT5.stash, elfStub(X11_HELPER_TEXT)],
  ['E5', 'fonts.conf', ACT5.stash, fontsConf()],
];

const ALTERED = jpegPlain('SlideKit 3.1 - Save for web (1280x960, quality 70)', 260, 2512);

const custodyCsv = [
  'item,acquired_from_ws07,vault_file,acquired_utc,acquired_by,sha256',
  ...ITEMS.map(([id, name, origin, content]) => `${id},${origin},${id}-${name},2026-03-15 10:20,a.nasser,${sha256(content)}`),
  '',
].join('\n');

const transfers = [
  'CASE HELIX-0313 - chain of custody: every handoff, who, when, why, and the SHA-256 check.',
  '2026-03-15 10:20Z  E1-E5  ws07 image -> vault (a.nasser)          acquisition                 sha256 check: OK',
  '2026-03-15 10:45Z  E1-E5  vault -> team share (a.nasser)          working copies              sha256 check: OK',
  '2026-03-15 15:10Z  E2     team share -> l.ito (comms)             photo for board briefing    sha256 check: NOT DONE',
  '2026-03-15 16:40Z  E4     team share -> r.khalil (malware triage) copy for analysis           sha256 check: NOT DONE',
  '',
].join('\n');

const audit = [
  ...ITEMS.map(([, name], i) => `2026-03-15T10:45:${String(10 + i).padStart(2, '0')}Z a.nasser  WRITE ${SHARE}/${name}`),
  `2026-03-15T11:30:02Z p.novak   READ  ${SHARE}/${ACT5.sendLog}`,
  `2026-03-15T15:10:40Z l.ito     READ  ${SHARE}/${ACT5.photo}`,
  `2026-03-15T15:22:05Z l.ito     WRITE ${SHARE}/${ACT5.photo}  (SlideKit 3.1)`,
  `2026-03-15T16:40:02Z r.khalil  READ  ${SHARE}/x11-icon.png`,
  `2026-03-15T16:40:09Z r.khalil  WRITE ${SHARE}/x11-icon.png  (cp ${VAULT}/E4-x11-icon.png)`,
  `2026-03-16T08:15:44Z a.nasser  READ  ${SHARE}/fonts.conf`,
  '',
].join('\n');

const files: NonNullable<LevelConfig['world']['files']> = {
  [`${CUSTODY}/HELIX-0313-custody.csv`]: { content: custodyCsv, mtime: '2026-03-15T10:21:00Z' },
  [`${CUSTODY}/transfers.log`]: { content: transfers, mtime: '2026-03-15T16:41:00Z' },
  '/srv/share/.audit/share-audit.log': { content: audit, mode: '-rw-r-----', owner: 'root', mtime: '2026-03-16T08:15:44Z' },
};
for (const [id, name, , content] of ITEMS) {
  files[`${VAULT}/${id}-${name}`] = { content, mode: '-r--r--r--', owner: 'evidence', mtime: '2026-03-15T10:20:00Z' };
  files[`${SHARE}/${name}`] = { content, owner: 'a.nasser', mtime: '2026-03-15T10:45:00Z' };
}
files[`${SHARE}/${ACT5.photo}`] = { content: ALTERED, owner: 'l.ito', mtime: '2026-03-15T15:22:05Z' };
files[`${SHARE}/x11-icon.png`] = { content: ITEMS[3][3], mode: '-rwxr-xr-x', owner: 'r.khalil', mtime: '2026-03-15T16:40:09Z' };

const level: LevelConfig = {
  id: 'L25',
  requires: { levels: ['L24'], evidence: ['ev.l22.trash', 'ev.l23.artist', 'ev.l24.next'] },
  briefing: {
    en: `BOSS. Act 5's evidence is about to go into the report, and one day a court may read it. When we acquired the five items (E1-E5) we wrote down each one's SHA-256 fingerprint in the custody record. Since then the team's working copies on ${SHARE} have changed hands. Prove which copies are still bit-for-bit identical, find what changed, who changed it and what was lost, and name the copy the report must use.`,
    ar: 'تحدّي الفصل. أدلة الفصل الخامس ستدخل في التقرير، وقد تقرؤها محكمة يوماً ما. عندما جمعنا العناصر الخمسة (من E1 إلى E5) سجّلنا بصمة SHA-256 لكل عنصر في سجل الحيازة. ومنذ ذلك الوقت انتقلت نسخ العمل في المجلد `/srv/share/HELIX-0313` من يد إلى يد. أثبت أي النسخ ما زالت مطابقة تماماً، واعرف ما الذي تغيّر، ومن غيّره، وماذا ضاع، وحدّد النسخة التي يجب أن يعتمدها التقرير.',
  },
  mission: {
    goal: {
      en: 'Prove which evidence copies are still identical to the originals, and find what was changed, by whom, and what was lost.',
      ar: 'أثبت أي نسخ الأدلة ما زالت مطابقة للأصل، واعرف ما الذي تغيّر، ومن غيّره، وماذا ضاع.',
    },
    investigate: [
      {
        en: 'The custody record `HELIX-0313-custody.csv`: the SHA-256 value written down for each item (E1 to E5) when it was collected.',
        ar: 'سجل الحيازة `HELIX-0313-custody.csv`: قيمة SHA-256 التي سُجّلت لكل عنصر (من E1 إلى E5) عند جمعه.',
      },
      {
        en: "Today's values from `sha256sum /srv/share/HELIX-0313/*`, compared with the record.",
        ar: 'القيم الحالية من الأمر `sha256sum /srv/share/HELIX-0313/*`، بمقارنتها بالسجل.',
      },
      {
        en: 'The file server audit `/srv/share/.audit/share-audit.log`: who read and who wrote each file.',
        ar: 'سجل تدقيق خادم الملفات `/srv/share/.audit/share-audit.log`: من قرأ كل ملف ومن كتب فيه.',
      },
      {
        en: '`exiftool` on both copies of the photo: the team share copy and the vault original.',
        ar: 'الأمر `exiftool` على نسختي الصورة: نسخة مجلد الفريق والأصل المحفوظ في الخزنة.',
      },
    ],
    success: {
      en: 'You have named the changed item, the person who changed it, what the change destroyed, and the copy the report must use.',
      ar: 'تكون قد حدّدت العنصر الذي تغيّر، ومن غيّره، وما الذي أتلفه التغيير، والنسخة التي يجب أن يعتمدها التقرير.',
    },
  },
  apps: ['case', 'terminal', 'files', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT5.soc,
    home: '/home/a.nasser',
    cwd: CUSTODY,
    now: '2026-03-16T10:00:00Z',
    files,
  },
  objectives: [
    {
      id: 'mismatch',
      prompt: { en: 'Which item on the team share no longer matches its acquisition hash? (item ID)', ar: 'أي عنصر في مجلد الفريق لم يعد يطابق الهاش المسجَّل عند جمعه؟ (اكتب رقم العنصر)' },
      placeholder: 'E?',
      validator: { kind: 'answer', accept: ['E2', ACT5.photo, `E2-${ACT5.photo}`] },
      wrong: {
        en: `sha256sum ${SHARE}/* gives today's fingerprints. Compare each one with the sha256 column of the custody record, all 64 characters.`,
        ar: 'الأمر `sha256sum /srv/share/HELIX-0313/*` يعطيك البصمات الحالية. قارن كل بصمة بالعمود `sha256` في سجل الحيازة، بخاناتها الـ 64 كلها.',
      },
    },
    {
      id: 'date',
      prompt: { en: 'The share copy of `x11-icon.png` has a new date and a new owner. Did its content change?', ar: 'نسخة `x11-icon.png` في مجلد الفريق لها تاريخ جديد ومالك جديد. هل تغيّر محتواها؟' },
      validator: {
        kind: 'choice',
        correct: 'same',
        options: [
          { id: 'changed', label: { en: 'Yes: a new date means a new file', ar: 'نعم: التاريخ الجديد يعني ملفاً جديداً' } },
          { id: 'same', label: { en: 'No: its hash still matches, only the copy\'s date and owner changed', ar: 'لا: الهاش ما زال مطابقاً، وتاريخ النسخة ومالكها فقط هما اللذان تغيّرا' } },
          { id: 'unknown', label: { en: 'We cannot know without the original disk', ar: 'لا يمكن معرفة ذلك دون القرص الأصلي' } },
        ],
      },
      wrong: { en: 'Dates describe the copy. The hash describes the content.', ar: 'التواريخ تصف النسخة، أما الهاش فيصف المحتوى.' },
    },
    {
      id: 'who',
      prompt: { en: 'Who changed the altered copy?', ar: 'من غيّر النسخة التي تعدّلت؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: ['l.ito'] },
      wrong: {
        en: 'The file server audits every READ and WRITE (`/srv/share/.audit`). Two people wrote to the share, and only one write changed the bytes.',
        ar: 'خادم الملفات يسجّل كل عملية `READ` و`WRITE` في المجلد `/srv/share/.audit`. شخصان كتبا في المجلد، وعملية كتابة واحدة فقط غيّرت البايتات.',
      },
    },
    {
      id: 'lost',
      prompt: { en: 'What did that change destroy?', ar: 'ماذا أتلف هذا التغيير؟' },
      validator: {
        kind: 'choice',
        correct: 'exif',
        options: [
          { id: 'pixels', label: { en: 'Nothing that matters: the picture still looks the same', ar: 'لا شيء مهم: الصورة ما زالت تبدو كما هي' } },
          { id: 'exif', label: { en: 'The EXIF metadata: the author, the date taken and the GPS position', ar: 'بيانات EXIF: اسم المالك، وتاريخ التصوير، وموقع GPS' } },
          { id: 'name', label: { en: 'Only the file name', ar: 'اسم الملف فقط' } },
        ],
      },
      wrong: { en: `Run exiftool on both copies: ${SHARE}/${ACT5.photo} and the vault original.`, ar: 'شغّل `exiftool` على النسختين: `/srv/share/HELIX-0313/wb-0311.jpg` والأصل الموجود في الخزنة.' },
      grants: [
        {
          id: 'ev.l25.custody',
          title: { en: 'Custody check: share photo altered, vault original intact', ar: 'فحص الحيازة: صورة مجلد الفريق معدَّلة والأصل في الخزنة سليم' },
          type: 'hash',
          content: `E2 share copy re-saved by l.ito (SlideKit, EXIF stripped); vault E2 sha256 ${sha256(ITEMS[1][3]).slice(0, 16)}... matches the custody record`,
          links: ['ev.l23.artist', 'ev.l22.trash'],
        },
      ],
    },
    {
      id: 'use',
      prompt: { en: 'Which file must the report use for the photo? (full path)', ar: 'أي ملف يجب أن يعتمده التقرير للصورة؟ (المسار الكامل)' },
      placeholder: '/path/file',
      validator: { kind: 'answer', accept: [`${VAULT}/E2-${ACT5.photo}`] },
      wrong: { en: 'The right copy is the one whose SHA-256 still equals the value written down at acquisition.', ar: 'النسخة الصحيحة هي التي ما زالت قيمة SHA-256 لها تساوي القيمة المسجَّلة عند جمع الدليل.' },
    },
  ],
  guide: {
    nudge: {
      en: 'Run `cat HELIX-0313-custody.csv`, then `sha256sum /srv/share/HELIX-0313/*`.',
      ar: 'شغّل `cat HELIX-0313-custody.csv` ثم `sha256sum /srv/share/HELIX-0313/*`.',
    },
    clue: {
      en: 'Search the custody record for a hash from the `sha256sum` output with `grep`: no match means the file changed. Then read `/srv/share/.audit/share-audit.log` and run `sha256sum /srv/vault/HELIX-0313/*`.',
      ar: 'ابحث بالأمر `grep` في سجل الحيازة عن هاش من ناتج `sha256sum`: عدم المطابقة يعني أن الملف تغيّر. ثم اقرأ `/srv/share/.audit/share-audit.log` وشغّل `sha256sum /srv/vault/HELIX-0313/*`.',
    },
    steps: {
      mismatch: {
        en: 'Run `cat HELIX-0313-custody.csv` and `sha256sum /srv/share/HELIX-0313/*`. Compare the values. Only `wb-0311.jpg` has a hash that is not in the record. It is item E2. Type `E2`.',
        ar: 'شغّل `cat HELIX-0313-custody.csv` ثم `sha256sum /srv/share/HELIX-0313/*` وقارن القيم. الملف `wb-0311.jpg` وحده له هاش غير موجود في السجل، وهو العنصر E2. اكتب `E2`.',
      },
      date: {
        en: 'The hash of the share copy of `x11-icon.png` is still in the custody record. Only its date and owner changed, because it was copied again. Choose the answer that starts with "No".',
        ar: 'هاش نسخة `x11-icon.png` في مجلد الفريق ما زال موجوداً في سجل الحيازة. تاريخها ومالكها فقط تغيّرا لأنها نُسخت من جديد. اختر الجواب الذي يبدأ بكلمة «لا».',
      },
      who: {
        en: 'Run `cat /srv/share/.audit/share-audit.log`. The line `l.ito WRITE ... wb-0311.jpg (SlideKit 3.1)` shows who saved the photo again. Type `l.ito`.',
        ar: 'شغّل `cat /srv/share/.audit/share-audit.log`. السطر الذي فيه `l.ito` و`WRITE` واسم الصورة والبرنامج SlideKit يبيّن من حفظ الصورة من جديد. اكتب `l.ito`.',
      },
      lost: {
        en: 'Run `exiftool /srv/share/HELIX-0313/wb-0311.jpg`, then `exiftool /srv/vault/HELIX-0313/E2-wb-0311.jpg`. The share copy has no `Artist`, no date taken and no GPS. Choose the EXIF answer.',
        ar: 'شغّل `exiftool /srv/share/HELIX-0313/wb-0311.jpg` ثم `exiftool /srv/vault/HELIX-0313/E2-wb-0311.jpg`. نسخة مجلد الفريق ليس فيها `Artist` ولا تاريخ التصوير ولا موقع GPS. اختر الجواب الذي يذكر بيانات EXIF.',
      },
      use: {
        en: 'Run `sha256sum /srv/vault/HELIX-0313/E2-wb-0311.jpg`: the value equals the one in the custody record. Type `/srv/vault/HELIX-0313/E2-wb-0311.jpg`.',
        ar: 'شغّل `sha256sum /srv/vault/HELIX-0313/E2-wb-0311.jpg`: القيمة تساوي القيمة المسجّلة في سجل الحيازة. اكتب `/srv/vault/HELIX-0313/E2-wb-0311.jpg`.',
      },
    },
    concept: {
      en: 'Chain of custody is the written history of a piece of evidence: who held it, when, and proof that it did not change. The proof is a hash: the same bytes always give the same SHA-256 value, and one changed bit changes it completely. Record the hash when you collect evidence, check it at every handoff, and work only on copies.',
      ar: 'سلسلة الحيازة هي التاريخ المكتوب لكل دليل: من أمسكه، ومتى، وإثبات أنه لم يتغيّر. وهذا الإثبات هو الهاش: البايتات نفسها تعطي دائماً قيمة SHA-256 نفسها، وتغيير بت واحد يغيّرها كلياً. سجّل الهاش عند جمع الدليل، وتحقق منه عند كل تسليم، واعمل على النسخ فقط.',
    },
  },
  rewards: { points: 300, achievement: 'act5-clear' },
  debrief: {
    concept: {
      en: 'Chain of custody is the written history of a piece of evidence: who collected it, who held it, when, why, and proof that it did not change. That proof is a cryptographic hash: SHA-256 of the same bytes is always the same value, and changing a single bit changes it completely. Record the hash at acquisition, check it at every handoff, and work only on copies of a write-protected original. Dates and owners describe a copy, not its content, so a re-copied file can look new and still be identical, while a file that "looks the same" (a re-saved photo) can be different. Prefer SHA-256 over MD5 and SHA-1, which have known collisions. Here a well-meaning "Save for web" silently stripped the EXIF that ties the photo to its author: the vault original saves the case.',
      ar: 'سلسلة الحيازة هي التاريخ المكتوب لكل دليل: من جمعه، ومن أمسكه، ومتى، ولماذا، وإثبات أنه لم يتغيّر. هذا الإثبات هاش تشفيري: قيمة SHA-256 للبايتات نفسها ثابتة دائماً، وتغيير بت واحد يغيّرها كلياً. سجّل الهاش عند جمع الدليل، وتحقق منه عند كل تسليم، واعمل فقط على نسخ من أصل محمي من الكتابة. التواريخ والمالك يصفان النسخة لا محتواها، فالملف المنسوخ من جديد قد يبدو جديداً وهو مطابق، والملف الذي «يبدو كما هو» (صورة حُفظت من جديد) قد يكون مختلفاً. استخدم SHA-256 بدل MD5 و SHA-1 لأن فيهما تصادمات معروفة. هنا حذفت عملية «حفظ للويب» بحسن نيّة بيانات EXIF التي تربط الصورة بصاحبها، والأصل المحفوظ في الخزنة أنقذ القضية.',
    },
    realTools: ['sha256sum', 'hashdeep', 'FTK Imager (verify)', 'write blockers', 'evidence management systems (custody forms)'],
    takeaway: {
      en: 'Hash at acquisition, verify at every handoff, analyse copies, keep the original sealed.',
      ar: 'خذ الهاش عند جمع الدليل، وتحقق منه عند كل تسليم، وحلّل النسخ، واترك الأصل مختوماً.',
    },
    source: 'NIST SP 800-86 (Guide to Integrating Forensic Techniques into Incident Response); ISO/IEC 27037:2012 (digital evidence handling); NIST FIPS 180-4 (SHA-256)',
  },
  echo: {
    intro: { en: 'Evidence that changed is evidence a lawyer will tear apart. Check every fingerprint.', ar: 'الدليل الذي تغيّر سيمزّقه أي محامٍ. افحص كل بصمة.' },
    success: {
      en: 'The vault kept the truth. Act 5 closed: a mailbox gone, a photo from NovaBackup, a plan for the finance PC. Act 6: we go to that PC and take the mask off.',
      ar: 'الخزنة حفظت الحقيقة. انتهى الفصل الخامس: صندوق بريد خرج، وصورة من مكتب NovaBackup، وخطة لجهاز المالية. في الفصل السادس نذهب إلى ذلك الجهاز وننزع القناع.',
    },
  },
  ghost: {
    taunt: {
      en: 'Hashes, vaults, custody forms. So careful. Now come and find me on a machine that speaks Windows.',
      ar: 'هاشات وخزنات واستمارات حيازة. يا لك من حذر. تعال الآن وابحث عني في جهاز يعمل بنظام ويندوز.',
    },
  },
  solution: `sha256sum ${SHARE}/* vs custody.csv: only ${ACT5.photo} differs -> E2. x11-icon.png re-copied by r.khalil, same hash -> same. share-audit.log: l.ito WRITE (SlideKit) -> l.ito. exiftool share copy: no EXIF -> exif. Use ${VAULT}/E2-${ACT5.photo}.`,
  selfTest: [
    { run: 'cat HELIX-0313-custody.csv', includes: sha256(ITEMS[1][3]) },
    { run: `sha256sum ${SHARE}/${ACT5.photo}`, includes: sha256(ALTERED) },
    { run: `sha256sum ${VAULT}/E2-${ACT5.photo}`, includes: sha256(ITEMS[1][3]) },
    { run: `sha256sum ${SHARE}/x11-icon.png`, includes: sha256(ITEMS[3][3]) },
    { run: `grep ${sha256(ALTERED).slice(0, 12)} HELIX-0313-custody.csv`, includes: '' },
    { run: 'cat /srv/share/.audit/share-audit.log', includes: 'l.ito     WRITE' },
    { run: `exiftool ${SHARE}/${ACT5.photo}`, includes: 'SlideKit 3.1' },
    { run: `exiftool -Artist ${VAULT}/E2-${ACT5.photo}`, includes: PHOTO.artist },
  ],
};

export default level;
