/**
 * Kerala districts in the official south → north order, plus "other". Codes must match the `profiles.district` check constraint in the database.
 * Display names come from the i18n files: `districts.<code>`.
 */
export const DISTRICTS = [
  'tvm', // Thiruvananthapuram
  'klm', // Kollam
  'pta', // Pathanamthitta
  'alp', // Alappuzha
  'ktm', // Kottayam
  'idk', // Idukki
  'ekm', // Ernakulam
  'tsr', // Thrissur
  'pkd', // Palakkad
  'mlp', // Malappuram
  'kkd', // Kozhikode
  'wyd', // Wayanad
  'knr', // Kannur
  'ksd', // Kasaragod
  'other',
] as const;
export type District = (typeof DISTRICTS)[number];
