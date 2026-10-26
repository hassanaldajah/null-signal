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
    ar: `زعيم الفصل. أدلة الفصل الخامس رايحة عالتقرير، ويوم من الأيام ممكن محكمة تقرأها. لما أخذنا العناصر الخمسة (E1-E5) سجّلنا بصمة SHA-256 لكل واحد بسجل الحيازة. ومن وقتها نسخ الفريق على ${SHARE} انتقلت من إيد لإيد. أثبت أي نسخ لسا مطابقة بت ببت، ولاقي شو تغيّر، ومين غيّره، وشو ضاع، وسمّي النسخة اللي لازم التقرير يعتمد عليها.`,
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
      prompt: { en: 'Which item on the team share no longer matches its acquisition hash? (item ID)', ar: 'أي عنصر على مجلد الفريق ما عاد يطابق الهاش اللي انسجّل وقت أخذه؟ (رقم العنصر)' },
      placeholder: 'E?',
      validator: { kind: 'answer', accept: ['E2', ACT5.photo, `E2-${ACT5.photo}`] },
      wrong: {
        en: `sha256sum ${SHARE}/* gives today's fingerprints. Compare each one with the sha256 column of the custody record, all 64 characters.`,
        ar: `‏sha256sum ${SHARE}/* بيعطيك البصمات اليوم. قارن كل وحدة مع عمود sha256 بسجل الحيازة، كل الـ 64 حرف.`,
      },
    },
    {
      id: 'date',
      prompt: { en: 'The share copy of x11-icon.png has a new date and a new owner. Did its content change?', ar: 'نسخة x11-icon.png على مجلد الفريق إلها تاريخ جديد وصاحب جديد. محتواها تغيّر؟' },
      validator: {
        kind: 'choice',
        correct: 'same',
        options: [
          { id: 'changed', label: { en: 'Yes: a new date means a new file', ar: 'آه: تاريخ جديد معناه ملف جديد' } },
          { id: 'same', label: { en: 'No: its hash still matches, only the copy\'s date and owner changed', ar: 'لأ: الهاش تبعها لسا مطابق، بس تاريخ النسخة وصاحبها تغيّروا' } },
          { id: 'unknown', label: { en: 'We cannot know without the original disk', ar: 'ما منقدر نعرف بدون القرص الأصلي' } },
        ],
      },
      wrong: { en: 'Dates describe the copy. The hash describes the content.', ar: 'التواريخ بتوصف النسخة. والهاش بيوصف المحتوى.' },
    },
    {
      id: 'who',
      prompt: { en: 'Who changed the altered copy?', ar: 'مين غيّر النسخة اللي تعدّلت؟' },
      placeholder: 'username',
      validator: { kind: 'answer', accept: ['l.ito'] },
      wrong: {
        en: 'The file server audits every READ and WRITE (/srv/share/.audit). Two people wrote to the share; only one write changed the bytes.',
        ar: 'سيرفر الملفات بيسجّل كل READ و WRITE ‏(/srv/share/.audit). شخصين كتبوا على المجلد؛ كتابة وحدة بس غيّرت البايتات.',
      },
    },
    {
      id: 'lost',
      prompt: { en: 'What did that change destroy?', ar: 'شو خرّب هالتغيير؟' },
      validator: {
        kind: 'choice',
        correct: 'exif',
        options: [
          { id: 'pixels', label: { en: 'Nothing that matters: the picture still looks the same', ar: 'ولا إشي مهم: الصورة لسا شكلها نفسه' } },
          { id: 'exif', label: { en: 'The EXIF metadata: the author, the date taken and the GPS position', ar: 'بيانات EXIF: اسم الصاحب، وتاريخ التصوير، وموقع GPS' } },
          { id: 'name', label: { en: 'Only the file name', ar: 'اسم الملف بس' } },
        ],
      },
      wrong: { en: `Run exiftool on both copies: ${SHARE}/${ACT5.photo} and the vault original.`, ar: `شغّل exiftool على النسختين: ${SHARE}/${ACT5.photo} والأصل بالخزنة.` },
      grants: [
        {
          id: 'ev.l25.custody',
          title: { en: 'Custody check: share photo altered, vault original intact', ar: 'فحص الحيازة: صورة المجلد متعدّلة والأصل بالخزنة سليم' },
          type: 'hash',
          content: `E2 share copy re-saved by l.ito (SlideKit, EXIF stripped); vault E2 sha256 ${sha256(ITEMS[1][3]).slice(0, 16)}... matches the custody record`,
          links: ['ev.l23.artist', 'ev.l22.trash'],
        },
      ],
    },
    {
      id: 'use',
      prompt: { en: 'Which file must the report use for the photo? (full path)', ar: 'أي ملف لازم يعتمد عليه التقرير للصورة؟ (المسار الكامل)' },
      placeholder: '/path/file',
      validator: { kind: 'answer', accept: [`${VAULT}/E2-${ACT5.photo}`] },
      wrong: { en: 'The right copy is the one whose SHA-256 still equals the value written down at acquisition.', ar: 'النسخة الصح هي اللي الـ SHA-256 تبعها لسا بيساوي القيمة اللي انكتبت وقت الأخذ.' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: `cat HELIX-0313-custody.csv, then sha256sum ${SHARE}/*`, ar: `‏cat HELIX-0313-custody.csv، وبعدين sha256sum ${SHARE}/*` }, cost: 20 },
    {
      tier: 'direction',
      text: {
        en: `grep a hash from sha256sum's output in the custody record: no match means changed. Then read /srv/share/.audit/share-audit.log and run sha256sum ${VAULT}/*.`,
        ar: `دوّر بـ grep على هاش من ناتج sha256sum بسجل الحيازة: إذا ما طابق يعني تغيّر. وبعدين اقرأ ‎/srv/share/.audit/share-audit.log وشغّل sha256sum ${VAULT}/*.`,
      },
      cost: 40,
    },
    {
      tier: 'near-solution',
      text: {
        en: `Only ${ACT5.photo} on the share has a new hash; l.ito saved it with SlideKit and exiftool shows the EXIF is gone. x11-icon.png was re-copied: same hash. The vault file E2-${ACT5.photo} still matches.`,
        ar: `بس ${ACT5.photo} على المجلد إله هاش جديد؛ ‏l.ito حفظه بـ SlideKit و exiftool بيورجيك إن EXIF راح. و x11-icon.png انسخ من جديد: نفس الهاش. وملف الخزنة E2-${ACT5.photo} لسا مطابق.`,
      },
      cost: 60,
    },
  ],
  rewards: { points: 300, achievement: 'act5-clear' },
  debrief: {
    concept: {
      en: 'Chain of custody is the written history of a piece of evidence: who collected it, who held it, when, why, and proof that it did not change. That proof is a cryptographic hash: SHA-256 of the same bytes is always the same value, and changing a single bit changes it completely. Record the hash at acquisition, check it at every handoff, and work only on copies of a write-protected original. Dates and owners describe a copy, not its content, so a re-copied file can look new and still be identical, while a file that "looks the same" (a re-saved photo) can be different. Prefer SHA-256 over MD5 and SHA-1, which have known collisions. Here a well-meaning "Save for web" silently stripped the EXIF that ties the photo to its author: the vault original saves the case.',
      ar: 'سلسلة الحيازة هي التاريخ المكتوب لأي دليل: مين جمعه، ومين مسكه، وإيمتى، وليش، وإثبات إنه ما تغيّر. هالإثبات هو هاش تشفيري: ‏SHA-256 لنفس البايتات دايماً نفس القيمة، وتغيير بت واحد بيغيّرها كلياً. سجّل الهاش وقت الأخذ، وافحصه عند كل تسليم، واشتغل بس على نسخ من أصل محمي من الكتابة. التواريخ والمالك بيوصفوا النسخة مش محتواها، فالملف المنسوخ من جديد ممكن يبيّن جديد وهو مطابق، والملف اللي "شكله نفسه" (صورة انحفظت من جديد) ممكن يكون مختلف. استخدم SHA-256 بدل MD5 و SHA-1 لأن فيهم تصادمات معروفة. هون "حفظ للويب" بنيّة طيبة مسح بصمت بيانات EXIF اللي بتربط الصورة بصاحبها: والأصل بالخزنة أنقذ القضية.',
    },
    realTools: ['sha256sum', 'hashdeep', 'FTK Imager (verify)', 'write blockers', 'evidence management systems (custody forms)'],
    takeaway: {
      en: 'Hash at acquisition, verify at every handoff, analyse copies, keep the original sealed.',
      ar: 'خذ الهاش وقت الأخذ، وتحقق منه عند كل تسليم، وحلّل النسخ، وخلّي الأصل مختوم.',
    },
    source: 'NIST SP 800-86 (Guide to Integrating Forensic Techniques into Incident Response); ISO/IEC 27037:2012 (digital evidence handling); NIST FIPS 180-4 (SHA-256)',
  },
  echo: {
    intro: { en: 'Evidence that changed is evidence a lawyer will tear apart. Check every fingerprint.', ar: 'الدليل اللي تغيّر هو دليل المحامي رح يمزّعه. افحص كل بصمة.' },
    success: {
      en: 'The vault kept the truth. Act 5 closed: a mailbox gone, a photo from NovaBackup, a plan for the finance PC. Act 6: we go to that PC and take the mask off.',
      ar: 'الخزنة حفظت الحقيقة. سكّرنا الفصل الخامس: صندوق بريد طلع، وصورة من NovaBackup، وخطة لجهاز المالية. الفصل السادس: رايحين على هداك الجهاز ورح نشيل القناع.',
    },
  },
  ghost: {
    taunt: {
      en: 'Hashes, vaults, custody forms. So careful. Now come and find me on a machine that speaks Windows.',
      ar: 'هاشات وخزنات واستمارات حيازة. شو حريص. هلّق تعال لاقيني على جهاز بيحكي ويندوز.',
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
