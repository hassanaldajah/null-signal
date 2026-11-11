import type { Act, LevelMeta } from '../engine/schema';

// Hub map: 27 levels, five acts of 5 and a short final act of 2 (the owner's final count). Level *content* lives in
// src/levels/actN/lXX.ts and is lazy-loaded.

type Row = [title: string, titleAr: string, skill: string, skillAr: string];

const ACTS: { title: string; titleAr: string; color: string; rows: Row[] }[] = [
  {
    title: 'Linux Basics', titleAr: 'أساسيات لينكس', color: '#00e5ff',
    rows: [
      ['Locked Out', 'خارج الباب', 'Clues outside the computer', 'الأدلة خارج الجهاز'],
      ['Into the Shell', 'داخل الطرفية', 'ls / cd navigation', 'التنقل بالأمرين ls و cd'],
      ['Hidden in Plain Sight', 'مخفي أمام عينيك', 'Hidden files (ls -a, cat)', 'الملفات المخفية'],
      ['Needle in a Haystack', 'إبرة في كومة قش', 'Searching text with grep', 'البحث في النصوص بالأمر grep'],
      ['The Watcher', 'المراقِب', 'find by name, time, permissions', 'البحث عن الملفات بالأمر find'],
    ],
  },
  {
    title: 'Phishing Awareness', titleAr: 'الوعي بالتصيّد', color: '#ff2bd6',
    rows: [
      ['Return to Sender', 'أعدها إلى المرسِل', 'Email headers & the fake sender', 'ترويسات البريد والمرسِل المزيّف'],
      ['Look-alike', 'الشبيه', 'Look-alike domains', 'النطاقات الشبيهة'],
      ['Special Delivery', 'توصيل خاص', 'Suspicious attachment names', 'أسماء المرفقات المشبوهة'],
      ['Signed, Sealed', 'موقّع ومختوم', 'SPF / DKIM results', 'نتائج SPF و DKIM'],
      ['Patient Zero', 'المريض صفر', 'Who clicked the link', 'من ضغط الرابط'],
    ],
  },
  {
    title: 'Password Hygiene', titleAr: 'سلامة كلمات المرور', color: '#ffc857',
    rows: [
      ['Not a Secret', 'ليس سراً', 'Encoding vs hashing', 'الترميز مقابل الهاش'],
      ['Fingerprints', 'البصمات', 'Recognizing hash formats', 'التعرّف على صيغ الهاش'],
      ['Weak Links', 'حلقات ضعيفة', 'Audit account password policy', 'تدقيق سياسة الحسابات'],
      ['Knock Knock', 'طرق على الباب', 'Repeated failed logins in auth.log', 'محاولات دخول فاشلة متكررة'],
      ['Domino Effect', 'أثر الدومينو', 'Accounts that reuse a password', 'حسابات تكرر كلمة المرور نفسها'],
    ],
  },
  {
    title: 'Logs & Timeline', titleAr: 'السجلات والخط الزمني', color: '#39ff88',
    rows: [
      ['Who Was Here', 'من كان هنا', 'auth.log analysis', 'تحليل سجل المصادقة'],
      ['Strange Requests', 'طلبات غريبة', 'An unusual request in a web log', 'طلب غريب في سجل الويب'],
      ['Footsteps', 'آثار الأقدام', 'bash_history', 'سجل الأوامر'],
      ['Clockwork', 'كالساعة', 'An unexpected scheduled task', 'مهمة مجدولة غير متوقعة'],
      ['Reconstruction', 'إعادة البناء', 'Full intrusion timeline', 'الخط الزمني للاختراق'],
    ],
  },
  {
    title: 'File Forensics', titleAr: 'التحليل الجنائي للملفات', color: '#7c4dff',
    rows: [
      ['Wrong Label', 'الملصق الخاطئ', 'Magic bytes & file signatures', 'توقيعات الملفات'],
      ['Gone, Not Forgotten', 'حُذف ولم يُنسَ', 'Restore from the recycle bin', 'الاسترجاع من سلة المحذوفات'],
      ['Picture This', 'ما تقوله الصورة', 'EXIF metadata', 'بيانات EXIF'],
      ['Between the Lines', 'بين السطور', 'A hidden message in a text file', 'رسالة مخفية في ملف نصي'],
      ['Chain of Custody', 'سلسلة الحيازة', 'Hashing & evidence integrity', 'الهاش وسلامة الأدلة'],
    ],
  },
  {
    // The response, and the end of the game (owner's call): containment, then the finale, which checks
    // the cleanup and unmasks gh0st from clues spread over the whole game.
    title: 'Unmasking', titleAr: 'كشف القناع', color: '#ff1744',
    rows: [
      ['Lockdown', 'الاحتواء', 'Containment: isolate, disable, block', 'الاحتواء: العزل والإيقاف والحظر'],
      ['Unmasked', 'بلا قناع', 'Verify the cleanup, then: who is gh0st?', 'تحقق من التنظيف، ثم: من هو gh0st؟'],
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
      boss: i === act.rows.length - 1,
    };
  }),
}));

export const levelsInOrder: LevelMeta[] = acts.flatMap((act) => act.levels);

export function levelMeta(id: string): LevelMeta | undefined {
  return levelsInOrder.find((level) => level.id === id);
}
