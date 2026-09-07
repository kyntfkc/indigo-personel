/** Türkiye resmi tatilleri (2429 sayılı Kanun + Diyanet bayram takvimi) */
export type TurkeyHoliday = { date: string; name: string };

export const TURKEY_HOLIDAYS_2026: TurkeyHoliday[] = [
  { date: "2026-01-01", name: "Yılbaşı" },
  { date: "2026-03-19", name: "Ramazan Bayramı Arifesi" },
  { date: "2026-03-20", name: "Ramazan Bayramı 1. Gün" },
  { date: "2026-03-21", name: "Ramazan Bayramı 2. Gün" },
  { date: "2026-03-22", name: "Ramazan Bayramı 3. Gün" },
  { date: "2026-04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı" },
  { date: "2026-05-01", name: "Emek ve Dayanışma Günü" },
  { date: "2026-05-19", name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { date: "2026-05-26", name: "Kurban Bayramı Arifesi" },
  { date: "2026-05-27", name: "Kurban Bayramı 1. Gün" },
  { date: "2026-05-28", name: "Kurban Bayramı 2. Gün" },
  { date: "2026-05-29", name: "Kurban Bayramı 3. Gün" },
  { date: "2026-05-30", name: "Kurban Bayramı 4. Gün" },
  { date: "2026-07-15", name: "Demokrasi ve Milli Birlik Günü" },
  { date: "2026-08-30", name: "Zafer Bayramı" },
  { date: "2026-10-28", name: "Cumhuriyet Bayramı Arifesi" },
  { date: "2026-10-29", name: "Cumhuriyet Bayramı" },
];

export const TURKEY_HOLIDAYS_2027: TurkeyHoliday[] = [
  { date: "2027-01-01", name: "Yılbaşı" },
  { date: "2027-03-08", name: "Ramazan Bayramı Arifesi" },
  { date: "2027-03-09", name: "Ramazan Bayramı 1. Gün" },
  { date: "2027-03-10", name: "Ramazan Bayramı 2. Gün" },
  { date: "2027-03-11", name: "Ramazan Bayramı 3. Gün" },
  { date: "2027-04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı" },
  { date: "2027-05-01", name: "Emek ve Dayanışma Günü" },
  { date: "2027-05-15", name: "Kurban Bayramı Arifesi" },
  { date: "2027-05-16", name: "Kurban Bayramı 1. Gün" },
  { date: "2027-05-17", name: "Kurban Bayramı 2. Gün" },
  { date: "2027-05-18", name: "Kurban Bayramı 3. Gün" },
  {
    date: "2027-05-19",
    name: "Kurban Bayramı 4. Gün / Gençlik ve Spor Bayramı",
  },
  { date: "2027-07-15", name: "Demokrasi ve Milli Birlik Günü" },
  { date: "2027-08-30", name: "Zafer Bayramı" },
  { date: "2027-10-28", name: "Cumhuriyet Bayramı Arifesi" },
  { date: "2027-10-29", name: "Cumhuriyet Bayramı" },
];

export function getTurkeyHolidays(years: number[] = [2026, 2027]) {
  const all = [...TURKEY_HOLIDAYS_2026, ...TURKEY_HOLIDAYS_2027];
  return all.filter((h) => years.includes(Number(h.date.slice(0, 4))));
}
