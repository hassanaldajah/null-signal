import type { LevelConfig } from '../../engine/schema';
import { jpegExif, pngStub } from '../lib/binary';
import { ACT5, NOVA_OFFICE, PHOTO } from './story';

const DIR = '/home/a.nasser/evidence/recovered';

const sites = [
  '# Sites in case HELIX-0313 (decimal degrees, WGS84). Source: facilities + vendor contracts.',
  'Helix Dynamics HQ, floors 1-3              34.7071 N, 33.0226 E',
  'Helix Dynamics workshop and test lab       34.6950 N, 33.0712 E',
  `NovaBackup office (contract V-2207)        ${NOVA_OFFICE.text}`,
  'Harbour co-working (Helix sales team)      34.6735 N, 33.0447 E',
  '',
].join('\n');

const level: LevelConfig = {
  id: 'L23',
  requires: { levels: ['L22'], evidence: ['ev.l22.trash', 'ev.l15.vendor'] },
  briefing: {
    en: `We restored ${ACT5.photo} from Samir's Trash. It is a photo of a whiteboard: gh0st copied it to ws07 to work from, then threw it away. Phones and cameras write hidden details into every photo they take, called EXIF metadata: the camera, the time, sometimes the owner's name and the GPS position. Read them, and compare the position with the case's list of sites.`,
    ar: 'استعدنا الصورة `wb-0311.jpg` من سلة محذوفات سمير. إنها صورة للوح أبيض: نسخها gh0st إلى الجهاز ws07 ليعمل منها ثم رماها. الهواتف والكاميرات تكتب في كل صورة تفاصيل مخفية تسمى بيانات EXIF: نوع الكاميرا، والوقت، وأحياناً اسم المالك وموقع GPS. اقرأها، وقارن الموقع بقائمة الأماكن في القضية.',
  },
  mission: {
    goal: {
      en: 'Read the hidden details inside the recovered photo: who owns the camera, when the photo was taken and where.',
      ar: 'اقرأ التفاصيل المخفية داخل الصورة المستعادة: من صاحب الكاميرا، ومتى التُقطت الصورة، وأين.',
    },
    investigate: [
      {
        en: 'The output of `exiftool wb-0311.jpg`: the lines `Artist`, `Date/Time Original` and the GPS position.',
        ar: 'ناتج الأمر `exiftool wb-0311.jpg`: الأسطر `Artist` و`Date/Time Original` وموقع GPS.',
      },
      {
        en: 'The file `~/evidence/sites.txt`: the positions of the places in this case, in decimal degrees.',
        ar: 'الملف `~/evidence/sites.txt`: مواقع الأماكن المذكورة في القضية بالدرجات العشرية.',
      },
    ],
    success: {
      en: 'You have the owner name, the date and the place of the photo, and you know how far to trust them. Two evidence cards are pinned.',
      ar: 'تكون قد عرفت اسم صاحب الصورة وتاريخها ومكانها، وعرفت إلى أي حد تثق بهذه البيانات. تُثبَّت بطاقتا دليل.',
    },
  },
  apps: ['case', 'terminal', 'hex', 'evidence'],
  autoOpen: ['case', 'evidence', 'terminal'],
  world: {
    user: 'a.nasser',
    host: ACT5.soc,
    home: '/home/a.nasser',
    cwd: DIR,
    now: '2026-03-15T11:00:00Z',
    files: {
      [`${DIR}/${ACT5.photo}`]: { content: jpegExif(PHOTO, 400, 2311), owner: 'a.nasser', mtime: '2026-03-15T10:12:00Z' },
      [`${DIR}/RESTORED.txt`]: {
        content: `Restored with trash-restore from the ws07 image copy, 2026-03-15 10:12 UTC (a.nasser).\n${ACT5.photo}  <- ${ACT5.stash}/${ACT5.photo}  (deleted 2026-03-13 08:58 UTC)\n`,
        mtime: '2026-03-15T10:12:30Z',
      },
      [`${DIR}/screen-0313.png`]: { content: pngStub(1920, 1080, 160, 2102), owner: 'a.nasser', mtime: '2026-03-15T10:14:00Z' },
      '/home/a.nasser/evidence/sites.txt': { content: sites, mtime: '2026-03-15T10:30:00Z' },
    },
  },
  objectives: [
    {
      id: 'artist',
      prompt: { en: 'The photo carries the name of its owner (the `Artist` field). What is it?', ar: 'الصورة تحمل اسم صاحبها (الحقل `Artist`). ما هو؟' },
      placeholder: 'name',
      validator: { kind: 'answer', accept: [PHOTO.artist] },
      wrong: { en: '`exiftool` lists every tag. Look for `Artist` (some tools call it Author).', ar: 'الأمر `exiftool` يعرض كل الحقول. ابحث عن `Artist` (بعض الأدوات تسميه Author).' },
      grants: [
        {
          id: 'ev.l23.artist',
          title: { en: 'EXIF author of the whiteboard photo', ar: 'صاحب صورة اللوح حسب بيانات EXIF' },
          type: 'person',
          content: `${ACT5.photo}: Artist=${PHOTO.artist}, ${PHOTO.make} ${PHOTO.model}`,
          links: ['ev.l22.trash', 'ev.l15.vendor'],
        },
      ],
    },
    {
      id: 'taken',
      prompt: { en: 'On what date was the photo taken? (YYYY-MM-DD)', ar: 'في أي تاريخ التُقطت الصورة؟ (بصيغة YYYY-MM-DD)' },
      placeholder: 'YYYY-MM-DD',
      validator: { kind: 'answer', accept: ['2026-03-11', '2026:03:11', '11/03/2026'] },
      wrong: {
        en: 'The file date is when the file was copied. The camera writes its own date: `Date/Time Original`.',
        ar: 'تاريخ الملف هو وقت نسخه. الكاميرا تكتب تاريخها الخاص في الحقل `Date/Time Original`.',
      },
    },
    {
      id: 'where',
      prompt: { en: 'Where was the photo taken? Compare its GPS position with `~/evidence/sites.txt`.', ar: 'أين التُقطت الصورة؟ قارن موقع GPS فيها بالملف `~/evidence/sites.txt`.' },
      validator: {
        kind: 'choice',
        correct: 'nova',
        options: [
          { id: 'hq', label: { en: 'Helix Dynamics HQ', ar: 'المقر الرئيسي لشركة Helix Dynamics' } },
          { id: 'lab', label: { en: 'Helix workshop and test lab', ar: 'ورشة Helix ومختبر الاختبار' } },
          { id: 'nova', label: { en: 'NovaBackup office', ar: 'مكتب NovaBackup' } },
          { id: 'cowork', label: { en: 'Harbour co-working', ar: 'مساحة العمل المشتركة عند الميناء' } },
        ],
      },
      wrong: {
        en: '`exiftool` shows degrees, minutes and seconds, and the list uses decimals. decimal = degrees + minutes/60 + seconds/3600, or let `exiftool -n` do it.',
        ar: 'الأمر `exiftool` يعرض درجات ودقائق وثواني، والقائمة مكتوبة بالكسور العشرية. القيمة العشرية تساوي الدرجات زائد الدقائق مقسومة على 60 زائد الثواني مقسومة على 3600، أو دع `exiftool -n` يحسبها.',
      },
      grants: [
        {
          id: 'ev.l23.place',
          title: { en: 'Photo taken at the NovaBackup office, 2 days before', ar: 'الصورة التُقطت في مكتب NovaBackup قبل الهجوم بيومين' },
          type: 'note',
          content: `GPS ${NOVA_OFFICE.text} = NovaBackup office, 2026-03-11 17:42 (+02:00), two days before the phishing wave`,
          links: ['ev.l23.artist'],
        },
      ],
    },
    {
      id: 'trust',
      prompt: { en: 'How much should an investigator trust an EXIF author name?', ar: 'إلى أي حد يثق المحقق باسم المالك المكتوب في بيانات EXIF؟' },
      validator: {
        kind: 'choice',
        correct: 'lead',
        options: [
          { id: 'proof', label: { en: 'Fully: the camera writes it, so it proves who took the photo', ar: 'ثقة كاملة: الكاميرا هي التي تكتبه، فهو يثبت من التقط الصورة' } },
          { id: 'lead', label: { en: 'As a strong lead: anyone can edit EXIF, so confirm it with other evidence', ar: 'يعدّه خيطاً قوياً: أي شخص يستطيع تعديل بيانات EXIF، فيجب تأكيده بأدلة أخرى' } },
          { id: 'none', label: { en: 'Not at all: metadata is always fake', ar: 'لا يثق به أبداً: البيانات الوصفية مزيّفة دائماً' } },
        ],
      },
      wrong: { en: 'Could a careful attacker plant someone else\'s name? Could a careless one forget to remove theirs?', ar: 'هل يستطيع مهاجم حذر أن يضع اسم شخص آخر؟ وهل يمكن أن ينسى مهاجم مهمل حذف اسمه؟' },
    },
  ],
  guide: {
    nudge: {
      en: '`exiftool wb-0311.jpg` prints everything the camera wrote.',
      ar: 'الأمر `exiftool wb-0311.jpg` يطبع كل ما كتبته الكاميرا.',
    },
    clue: {
      en: '`Artist` is the owner. `Date/Time Original` is when it was taken. For GPS, run `exiftool -n -GPSPosition wb-0311.jpg` and compare with `cat ~/evidence/sites.txt`.',
      ar: 'الحقل `Artist` هو صاحب الصورة. والحقل `Date/Time Original` هو وقت التصوير. لموقع GPS شغّل `exiftool -n -GPSPosition wb-0311.jpg` وقارن الناتج بالأمر `cat ~/evidence/sites.txt`.',
    },
    steps: {
      artist: {
        en: 'Run `exiftool wb-0311.jpg` and find the `Artist` line. It says `kmercer`.',
        ar: 'شغّل `exiftool wb-0311.jpg` وابحث عن سطر `Artist`. قيمته `kmercer`.',
      },
      taken: {
        en: 'The line `Date/Time Original` says `2026:03:11 17:42:09`. The file date is only when the file was copied. Type `2026-03-11`.',
        ar: 'سطر `Date/Time Original` قيمته `2026:03:11 17:42:09`. أما تاريخ الملف فهو وقت نسخه فقط. اكتب `2026-03-11`.',
      },
      where: {
        en: 'Run `exiftool -n -GPSPosition wb-0311.jpg`: it prints `34.684233 33.037900`. In `cat ~/evidence/sites.txt`, the line with 34.6842 N, 33.0379 E is the NovaBackup office. Choose it.',
        ar: 'شغّل `exiftool -n -GPSPosition wb-0311.jpg` فيطبع `34.684233 33.037900`. وفي ناتج `cat ~/evidence/sites.txt` السطر الذي فيه 34.6842 و 33.0379 هو مكتب NovaBackup. اختره.',
      },
      trust: {
        en: 'Choose "As a strong lead: anyone can edit EXIF, so confirm it with other evidence".',
        ar: 'اختر الجواب الذي يعدّ هذه البيانات خيطاً قوياً يحتاج إلى تأكيد بأدلة أخرى، لأن أي شخص يستطيع تعديل بيانات EXIF.',
      },
    },
    concept: {
      en: "Cameras and phones write hidden details into every photo, called EXIF: the device, the time, sometimes the owner's name and the GPS position. This can place a person, a device and a time. It is easy to edit, so use it as a lead and confirm it with other evidence.",
      ar: 'الكاميرات والهواتف تكتب في كل صورة تفاصيل مخفية تسمى EXIF: الجهاز، والوقت، وأحياناً اسم المالك وموقع GPS. هذه البيانات قد تحدد شخصاً وجهازاً ووقتاً. لكن تعديلها سهل، فاستخدمها كخيط وأكّدها بأدلة أخرى.',
    },
  },
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'EXIF is metadata stored inside JPEG and many other photos: camera make and model, software, the moment the shutter fired (Date/Time Original, in camera local time, with Offset Time if present), sometimes an owner name (Artist) or serial number, and GPS latitude and longitude in degrees, minutes and seconds. It travels with the file when it is copied, mailed or uploaded to sites that keep it. For investigators it can place a device, a person and a time, but it is easy to edit or strip, so treat it as a lead and confirm it with independent evidence. For defenders the lesson runs the other way: strip metadata before photos leave the company, especially photos of whiteboards, screens and badges.',
      ar: 'بيانات EXIF بيانات وصفية محفوظة داخل صور JPEG وصور كثيرة غيرها: نوع الكاميرا وطرازها، والبرنامج، ولحظة التصوير (`Date/Time Original` بالتوقيت المحلي للكاميرا)، وأحياناً اسم المالك (`Artist`) أو الرقم التسلسلي، وخط العرض وخط الطول بالدرجات والدقائق والثواني. تنتقل هذه البيانات مع الملف عند نسخه أو إرساله بالبريد أو رفعه إلى مواقع تحتفظ بها. للمحقق، قد تحدد جهازاً وشخصاً ووقتاً، لكن تعديلها أو حذفها سهل، فتعامل معها كخيط وأكّدها بدليل مستقل. وللمدافعين الدرس معكوس: احذف البيانات الوصفية قبل أن تخرج الصور من الشركة، وخصوصاً صور الألواح والشاشات والبطاقات.',
    },
    realTools: ['ExifTool', 'exiv2', 'Autopsy (EXIF module)', 'mat2 (metadata removal)', 'Jeffrey\'s Image Metadata Viewer'],
    takeaway: {
      en: 'A photo can tell you who, when and where. Read it, then confirm it; and strip your own before you share.',
      ar: 'الصورة قد تخبرك من ومتى وأين. اقرأها ثم أكّدها، واحذف بيانات صورك قبل مشاركتها.',
    },
    source: 'CIPA DC-008 (Exif 2.3 standard); MITRE ATT&CK T1592 (Gather Victim Host Information) context; NIST SP 800-86',
  },
  echo: {
    intro: { en: 'A whiteboard photo, thrown away in a hurry. Cameras are terrible at keeping secrets.', ar: 'صورة لوح أبيض رُميت على عجل. الكاميرات لا تجيد حفظ الأسرار.' },
    success: {
      en: 'Taken at NovaBackup\'s office two days before the attack, by a camera that calls its owner kmercer. Same name as that portal admin. Not proof yet, but now we know where to look.',
      ar: 'التُقطت في مكتب NovaBackup قبل الهجوم بيومين، بكاميرا تسمّي صاحبها `kmercer`. الاسم نفسه الذي ظهر في حساب مدير البوابة. ليس إثباتاً بعد، لكننا عرفنا الآن أين نبحث.',
    },
  },
  solution: `exiftool ${ACT5.photo}: Artist=${PHOTO.artist}; Date/Time Original 2026:03:11 17:42:09 (+02:00); GPS 34 41 3.24 N, 33 2 16.44 E = ${NOVA_OFFICE.text} -> NovaBackup office (sites.txt). Choice: lead.`,
  selfTest: [
    { run: `exiftool ${ACT5.photo}`, includes: `Artist                          : ${PHOTO.artist}` },
    { run: `exiftool ${ACT5.photo}`, includes: 'Date/Time Original              : 2026:03:11 17:42:09' },
    { run: `exiftool -n -GPSPosition ${ACT5.photo}`, includes: '34.684233 33.037900' },
    { run: 'cat ~/evidence/sites.txt', includes: NOVA_OFFICE.text },
    { run: 'exiftool screen-0313.png', includes: 'Image Width                     : 1920' },
  ],
};

export default level;
