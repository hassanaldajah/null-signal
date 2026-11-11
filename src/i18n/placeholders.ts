/**
 * Word placeholders used in answer boxes. Format masks (HH:MM, 0.0.0.0, /path) stay as they are;
 * answers themselves are always typed in Latin letters. `npm run validate` checks this list.
 */
export const PLACEHOLDERS_AR: Record<string, string> = {
  number: 'رقم',
  username: 'اسم المستخدم',
  domain: 'النطاق',
  'file name': 'اسم الملف',
  algorithm: 'اسم الخوارزمية',
  account: 'اسم الحساب',
  site: 'الموقع',
  command: 'الأمر',
  minutes: 'عدد الدقائق',
  name: 'الاسم',
  'host name': 'اسم الجهاز',
  'character name': 'اسم الرمز بالإنجليزية',
  'First Last': 'الاسم ثم اسم العائلة',
};
