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
    ar: `رجّعنا ${ACT5.photo} من سلة سمير. هي صورة للوح أبيض: gh0st نسخها على ws07 ليشتغل منها، وبعدين رماها. الموبايلات والكاميرات بتكتب تفاصيل مخفية بكل صورة، اسمها بيانات EXIF: الكاميرا، والوقت، وأحياناً اسم صاحبها والموقع بالـ GPS. اقرأها، وقارن الموقع مع قائمة الأماكن بالقضية.`,
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
      prompt: { en: 'The photo carries the name of its owner. What is it?', ar: 'الصورة فيها اسم صاحبها. شو هو؟' },
      placeholder: 'name',
      validator: { kind: 'answer', accept: [PHOTO.artist] },
      wrong: { en: 'exiftool lists every tag. Look for Artist (some tools call it Author).', ar: 'exiftool بيعرض كل الوسوم. دوّر على Artist (بعض الأدوات بتسمّيه Author).' },
      grants: [
        {
          id: 'ev.l23.artist',
          title: { en: 'EXIF author of the whiteboard photo', ar: 'صاحب صورة اللوح حسب EXIF' },
          type: 'person',
          content: `${ACT5.photo}: Artist=${PHOTO.artist}, ${PHOTO.make} ${PHOTO.model}`,
          links: ['ev.l22.trash', 'ev.l15.vendor'],
        },
      ],
    },
    {
      id: 'taken',
      prompt: { en: 'On what date was the photo taken? (YYYY-MM-DD)', ar: 'بأي تاريخ انأخذت الصورة؟ (YYYY-MM-DD)' },
      placeholder: 'YYYY-MM-DD',
      validator: { kind: 'answer', accept: ['2026-03-11', '2026:03:11', '11/03/2026'] },
      wrong: {
        en: 'The file date is when the file was copied. The camera writes its own date: Date/Time Original.',
        ar: 'تاريخ الملف هو وقت نسخه. الكاميرا بتكتب تاريخها الخاص: Date/Time Original.',
      },
    },
    {
      id: 'where',
      prompt: { en: `Where was the photo taken? Compare its GPS position with ~/evidence/sites.txt.`, ar: 'وين انأخذت الصورة؟ قارن موقع الـ GPS مع ‎~/evidence/sites.txt.' },
      validator: {
        kind: 'choice',
        correct: 'nova',
        options: [
          { id: 'hq', label: { en: 'Helix Dynamics HQ', ar: 'المقر الرئيسي لـ Helix Dynamics' } },
          { id: 'lab', label: { en: 'Helix workshop and test lab', ar: 'ورشة ومختبر Helix' } },
          { id: 'nova', label: { en: 'NovaBackup office', ar: 'مكتب NovaBackup' } },
          { id: 'cowork', label: { en: 'Harbour co-working', ar: 'مساحة العمل المشتركة عند الميناء' } },
        ],
      },
      wrong: {
        en: 'exiftool shows degrees, minutes and seconds; the list uses decimals. decimal = deg + min/60 + sec/3600, or let exiftool -n do it.',
        ar: 'exiftool بيعرض درجات ودقائق وثواني؛ والقائمة بالكسور العشرية. العشري = الدرجات + الدقائق/60 + الثواني/3600، أو خلّي exiftool -n يحسبها.',
      },
      grants: [
        {
          id: 'ev.l23.place',
          title: { en: 'Photo taken at the NovaBackup office, 2 days before', ar: 'الصورة انأخذت بمكتب NovaBackup قبل يومين' },
          type: 'note',
          content: `GPS ${NOVA_OFFICE.text} = NovaBackup office, 2026-03-11 17:42 (+02:00), two days before the phishing wave`,
          links: ['ev.l23.artist'],
        },
      ],
    },
    {
      id: 'trust',
      prompt: { en: 'How much should an investigator trust an EXIF author name?', ar: 'قديش لازم المحقق يثق باسم الصاحب الموجود بـ EXIF؟' },
      validator: {
        kind: 'choice',
        correct: 'lead',
        options: [
          { id: 'proof', label: { en: 'Fully: the camera writes it, so it proves who took the photo', ar: 'ثقة كاملة: الكاميرا بتكتبه، فهو بيثبت مين صوّر' } },
          { id: 'lead', label: { en: 'As a strong lead: anyone can edit EXIF, so confirm it with other evidence', ar: 'كخيط قوي: أي حدا بيقدر يعدّل EXIF، فلازم تأكّده بأدلة ثانية' } },
          { id: 'none', label: { en: 'Not at all: metadata is always fake', ar: 'ولا إشي: البيانات الوصفية دايماً مزيّفة' } },
        ],
      },
      wrong: { en: 'Could a careful attacker plant someone else\'s name? Could a careless one forget to remove theirs?', ar: 'المهاجم الشاطر بيقدر يحط اسم حدا ثاني؟ والمهاجم المهمل ممكن ينسى يشيل اسمه؟' },
    },
  ],
  hints: [
    { tier: 'nudge', text: { en: `exiftool ${ACT5.photo} prints everything the camera wrote.`, ar: `‏exiftool ${ACT5.photo} بيطبع كل إشي كتبته الكاميرا.` }, cost: 15 },
    {
      tier: 'direction',
      text: {
        en: 'Artist is the owner. Date/Time Original is when it was taken. For GPS run exiftool -n -GPSPosition and compare with cat ~/evidence/sites.txt.',
        ar: 'Artist هو الصاحب. و Date/Time Original هو وقت التصوير. للـ GPS شغّل exiftool -n -GPSPosition وقارن مع cat ~/evidence/sites.txt.',
      },
      cost: 30,
    },
    {
      tier: 'near-solution',
      text: {
        en: `Artist ${PHOTO.artist}, taken 2026:03:11. 34 deg 41' 3.24" = 34.6842 and 33 deg 2' 16.44" = 33.0379: the NovaBackup line in sites.txt. EXIF can be edited, so it is a lead to confirm.`,
        ar: `‏Artist هو ${PHOTO.artist}، والتصوير 2026:03:11. و 34 درجة 41 دقيقة 3.24 ثانية = 34.6842، و 33 درجة 2 دقيقة 16.44 ثانية = 33.0379: سطر NovaBackup بـ sites.txt. و EXIF بينعدّل، فهو خيط لازم يتأكد.`,
      },
      cost: 45,
    },
  ],
  rewards: { points: 160 },
  debrief: {
    concept: {
      en: 'EXIF is metadata stored inside JPEG and many other photos: camera make and model, software, the moment the shutter fired (Date/Time Original, in camera local time, with Offset Time if present), sometimes an owner name (Artist) or serial number, and GPS latitude and longitude in degrees, minutes and seconds. It travels with the file when it is copied, mailed or uploaded to sites that keep it. For investigators it can place a device, a person and a time, but it is easy to edit or strip, so treat it as a lead and confirm it with independent evidence. For defenders the lesson runs the other way: strip metadata before photos leave the company, especially photos of whiteboards, screens and badges.',
      ar: 'EXIF هي بيانات وصفية مخزّنة جوّا صور JPEG وصور كثير غيرها: نوع الكاميرا وموديلها، والبرنامج، ولحظة التصوير (Date/Time Original بالوقت المحلي للكاميرا، ومعها Offset Time إذا موجود)، وأحياناً اسم الصاحب (Artist) أو الرقم التسلسلي، وخط العرض والطول بالدرجات والدقائق والثواني. بتنتقل مع الملف لما ينسخ أو ينبعت بالإيميل أو ينرفع على مواقع بتحتفظ فيها. للمحقق، بتقدر تحدد جهاز وشخص ووقت، بس سهل تعديلها أو مسحها، فتعامل معها كخيط وأكّدها بدليل مستقل. وللمدافعين الدرس بالعكس: امسح البيانات الوصفية قبل ما تطلع الصور من الشركة، خصوصاً صور الألواح والشاشات والبطاقات.',
    },
    realTools: ['ExifTool', 'exiv2', 'Autopsy (EXIF module)', 'mat2 (metadata removal)', 'Jeffrey\'s Image Metadata Viewer'],
    takeaway: {
      en: 'A photo can tell you who, when and where. Read it, then confirm it; and strip your own before you share.',
      ar: 'الصورة بتقدر تحكيلك مين وإيمتى ووين. اقرأها، وبعدين أكّدها؛ وامسح بيانات صورك قبل ما تشاركها.',
    },
    source: 'CIPA DC-008 (Exif 2.3 standard); MITRE ATT&CK T1592 (Gather Victim Host Information) context; NIST SP 800-86',
  },
  echo: {
    intro: { en: 'A whiteboard photo, thrown away in a hurry. Cameras are terrible at keeping secrets.', ar: 'صورة لوح أبيض، انرمت على عجلة. الكاميرات فاشلة بحفظ الأسرار.' },
    success: {
      en: 'Taken at NovaBackup\'s office two days before the attack, by a camera that calls its owner kmercer. Same name as that portal admin. Not proof yet, but now we know where to look.',
      ar: 'انأخذت بمكتب NovaBackup قبل الهجوم بيومين، بكاميرا بتسمّي صاحبها kmercer. نفس اسم مدير البوابة إياه. لسا مش إثبات، بس هلّق عرفنا وين ندوّر.',
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
