import type { Act, LevelMeta } from '../engine/schema';

// Hub map: 6 acts x 5 levels (30, the owner's final count). Level *content* lives in
// src/levels/actN/lXX.ts and is lazy-loaded.

type Row = [title: string, titleAr: string, skill: string, skillAr: string];

const ACTS: { title: string; titleAr: string; color: string; rows: Row[] }[] = [
  {
    title: 'Linux Basics', titleAr: 'أساسيات لينكس', color: '#00e5ff',
    rows: [
      ['Locked Out', 'مقفول برّا', 'Clues outside the computer', 'الأدلة خارج الجهاز'],
      ['Into the Shell', 'جوّا الطرفية', 'ls / cd navigation', 'التنقل بـ ls و cd'],
      ['Hidden in Plain Sight', 'مخفي قدّام عينك', 'Hidden files (ls -a, cat)', 'الملفات المخفية'],
      ['Needle in a Haystack', 'إبرة بكومة قش', 'Searching text with grep', 'البحث بـ grep'],
      ['The Watcher', 'المراقِب', 'find by name, time, permissions', 'البحث بـ find'],
    ],
  },
  {
    title: 'Phishing Awareness', titleAr: 'الوعي بالتصيّد', color: '#ff2bd6',
    rows: [
      ['Return to Sender', 'رجّعها للمرسل', 'Email headers & the fake sender', 'ترويسات الإيميل والمرسل المزيّف'],
      ['Look-alike', 'الشبيه', 'Look-alike domains', 'النطاقات الشبيهة'],
      ['Special Delivery', 'توصيل خاص', 'Suspicious attachment names', 'أسماء المرفقات المشبوهة'],
      ['Signed, Sealed', 'موقّع ومختوم', 'SPF / DKIM results', 'نتائج SPF و DKIM'],
      ['Patient Zero', 'المريض صفر', 'Who clicked the link', 'مين كبس على الرابط'],
    ],
  },
  {
    title: 'Password Hygiene', titleAr: 'نظافة كلمات المرور', color: '#ffc857',
    rows: [
      ['Not a Secret', 'مش سر', 'Encoding vs hashing', 'الترميز مقابل الهاش'],
      ['Fingerprints', 'البصمات', 'Recognizing hash formats', 'التعرّف على صيغ الهاش'],
      ['Weak Links', 'حلقات ضعيفة', 'Audit account password policy', 'تدقيق سياسة حسابات المرور'],
      ['Knock Knock', 'دق دق', 'Repeated failed logins in auth.log', 'محاولات دخول فاشلة متكررة'],
      ['Domino Effect', 'أثر الدومينو', 'Accounts that reuse a password', 'حسابات بتعيد استخدام كلمة المرور'],
    ],
  },
  {
    title: 'Logs & Timeline', titleAr: 'السجلات والخط الزمني', color: '#39ff88',
    rows: [
      ['Who Was Here', 'مين كان هون', 'auth.log analysis', 'تحليل سجل المصادقة'],
      ['Strange Requests', 'طلبات غريبة', 'An unusual request in a web log', 'طلب غريب بسجل الويب'],
      ['Footsteps', 'آثار الأقدام', 'bash_history', 'سجل الأوامر'],
      ['Clockwork', 'كالساعة', 'An unexpected scheduled task', 'مهمة مجدولة غير متوقعة'],
      ['Reconstruction', 'إعادة البناء', 'Full intrusion timeline', 'الخط الزمني للاختراق'],
    ],
  },
  {
    title: 'File Forensics', titleAr: 'جنائيات الملفات', color: '#7c4dff',
    rows: [
      ['Wrong Label', 'الملصق الغلط', 'Magic bytes & file signatures', 'التوقيعات السحرية للملفات'],
      ['Gone, Not Forgotten', 'راح بس ما انتسى', 'Restore from the recycle bin', 'الاسترجاع من سلة المحذوفات'],
      ['Picture This', 'تخيّل', 'EXIF metadata', 'بيانات EXIF'],
      ['Between the Lines', 'بين السطور', 'A hidden message in a text file', 'رسالة مخفية بملف نصي'],
      ['Chain of Custody', 'سلسلة الحيازة', 'Hashing & evidence integrity', 'الهاش وسلامة الأدلة'],
    ],
  },
  {
    // The owner's former Network, Threat Detection and Windows acts, merged into five bigger levels:
    // every planned skill survives as an objective (ports, DNS, plain HTTP, firewall, process tree,
    // base64, IOCs, detection rule, report).
    title: 'Unmasking', titleAr: 'كشف القناع', color: '#ff1744',
    rows: [
      ['Long Names', 'أسماء طويلة', 'Ports, DNS, plain HTTP, a tunnel and a block rule', 'المنافذ و DNS و HTTP المكشوف ونفق وقاعدة حظر'],
      ['Imposters', 'المنتحلون', 'A strange process, its process tree and Run key', 'عملية غريبة وشجرة عملياتها ومفتاح تشغيلها'],
      ['Read the Strings', 'اقرأ النصوص', 'Strings, a base64 config and indicators (IOCs)', 'النصوص وإعدادات base64 والمؤشرات'],
      ['Event Horizon', 'أفق الأحداث', 'Windows logon events and a detection rule', 'أحداث الدخول بويندوز وقاعدة كشف'],
      ['Unmasked', 'بلا قناع', 'The incident report: who is gh0st?', 'تقرير الحادثة: مين هو gh0st؟'],
    ],
  },
];

export const acts: Act[] = ACTS.map((act, actIndex) => ({
  id: actIndex + 1,
  title: { en: act.title, ar: act.titleAr },
  color: act.color,
  levels: act.rows.map(([title, titleAr, skill, skillAr], i): LevelMeta => {
    const order = actIndex * 5 + i + 1;
    return {
      id: `L${String(order).padStart(2, '0')}`,
      act: actIndex + 1,
      order,
      title: { en: title, ar: titleAr },
      skill: { en: skill, ar: skillAr },
      boss: i === 4,
    };
  }),
}));

export const levelsInOrder: LevelMeta[] = acts.flatMap((act) => act.levels);

export function levelMeta(id: string): LevelMeta | undefined {
  return levelsInOrder.find((level) => level.id === id);
}
