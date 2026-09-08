/** Türkiye resmi tatilleri (2429 sayılı Kanun + Diyanet bayram takvimi) */
export type TurkeyHoliday = { date: string; name: string };

const DEFAULT_YEARS = [2026, 2027, 2028, 2029, 2030] as const;

/** Sabit milli / genel tatiller — Cumhuriyet Bayramı arifesi (28 Ekim) dahil değil */
function fixedHolidays(year: number): TurkeyHoliday[] {
  return [
    { date: `${year}-01-01`, name: "Yılbaşı" },
    { date: `${year}-04-23`, name: "Ulusal Egemenlik ve Çocuk Bayramı" },
    { date: `${year}-05-01`, name: "Emek ve Dayanışma Günü" },
    {
      date: `${year}-05-19`,
      name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    },
    { date: `${year}-07-15`, name: "Demokrasi ve Milli Birlik Günü" },
    { date: `${year}-08-30`, name: "Zafer Bayramı" },
    { date: `${year}-10-29`, name: "Cumhuriyet Bayramı" },
  ];
}

/** Dini bayramlar (arife + bayram günleri) — Diyanet / takvim kaynaklı */
const RELIGIOUS_BY_YEAR: Record<number, TurkeyHoliday[]> = {
  2026: [
    { date: "2026-03-19", name: "Ramazan Bayramı Arifesi" },
    { date: "2026-03-20", name: "Ramazan Bayramı 1. Gün" },
    { date: "2026-03-21", name: "Ramazan Bayramı 2. Gün" },
    { date: "2026-03-22", name: "Ramazan Bayramı 3. Gün" },
    { date: "2026-05-26", name: "Kurban Bayramı Arifesi" },
    { date: "2026-05-27", name: "Kurban Bayramı 1. Gün" },
    { date: "2026-05-28", name: "Kurban Bayramı 2. Gün" },
    { date: "2026-05-29", name: "Kurban Bayramı 3. Gün" },
    { date: "2026-05-30", name: "Kurban Bayramı 4. Gün" },
  ],
  2027: [
    { date: "2027-03-08", name: "Ramazan Bayramı Arifesi" },
    { date: "2027-03-09", name: "Ramazan Bayramı 1. Gün" },
    { date: "2027-03-10", name: "Ramazan Bayramı 2. Gün" },
    { date: "2027-03-11", name: "Ramazan Bayramı 3. Gün" },
    { date: "2027-05-15", name: "Kurban Bayramı Arifesi" },
    { date: "2027-05-16", name: "Kurban Bayramı 1. Gün" },
    { date: "2027-05-17", name: "Kurban Bayramı 2. Gün" },
    { date: "2027-05-18", name: "Kurban Bayramı 3. Gün" },
    { date: "2027-05-19", name: "Kurban Bayramı 4. Gün" },
  ],
  2028: [
    { date: "2028-02-25", name: "Ramazan Bayramı Arifesi" },
    { date: "2028-02-26", name: "Ramazan Bayramı 1. Gün" },
    { date: "2028-02-27", name: "Ramazan Bayramı 2. Gün" },
    { date: "2028-02-28", name: "Ramazan Bayramı 3. Gün" },
    { date: "2028-05-04", name: "Kurban Bayramı Arifesi" },
    { date: "2028-05-05", name: "Kurban Bayramı 1. Gün" },
    { date: "2028-05-06", name: "Kurban Bayramı 2. Gün" },
    { date: "2028-05-07", name: "Kurban Bayramı 3. Gün" },
    { date: "2028-05-08", name: "Kurban Bayramı 4. Gün" },
  ],
  2029: [
    { date: "2029-02-13", name: "Ramazan Bayramı Arifesi" },
    { date: "2029-02-14", name: "Ramazan Bayramı 1. Gün" },
    { date: "2029-02-15", name: "Ramazan Bayramı 2. Gün" },
    { date: "2029-02-16", name: "Ramazan Bayramı 3. Gün" },
    { date: "2029-04-23", name: "Kurban Bayramı Arifesi" },
    { date: "2029-04-24", name: "Kurban Bayramı 1. Gün" },
    { date: "2029-04-25", name: "Kurban Bayramı 2. Gün" },
    { date: "2029-04-26", name: "Kurban Bayramı 3. Gün" },
    { date: "2029-04-27", name: "Kurban Bayramı 4. Gün" },
  ],
  2030: [
    { date: "2030-02-03", name: "Ramazan Bayramı Arifesi" },
    { date: "2030-02-04", name: "Ramazan Bayramı 1. Gün" },
    { date: "2030-02-05", name: "Ramazan Bayramı 2. Gün" },
    { date: "2030-02-06", name: "Ramazan Bayramı 3. Gün" },
    { date: "2030-04-12", name: "Kurban Bayramı Arifesi" },
    { date: "2030-04-13", name: "Kurban Bayramı 1. Gün" },
    { date: "2030-04-14", name: "Kurban Bayramı 2. Gün" },
    { date: "2030-04-15", name: "Kurban Bayramı 3. Gün" },
    { date: "2030-04-16", name: "Kurban Bayramı 4. Gün" },
  ],
};

function mergeByDate(items: TurkeyHoliday[]): TurkeyHoliday[] {
  const map = new Map<string, string>();
  for (const h of items) {
    const prev = map.get(h.date);
    map.set(h.date, prev ? `${prev} / ${h.name}` : h.name);
  }
  return [...map.entries()]
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getTurkeyHolidays(
  years: number[] = [...DEFAULT_YEARS]
): TurkeyHoliday[] {
  const items: TurkeyHoliday[] = [];
  for (const year of years) {
    items.push(...fixedHolidays(year));
    const religious = RELIGIOUS_BY_YEAR[year];
    if (religious) items.push(...religious);
  }
  return mergeByDate(items).filter(
    (h) => !(h.date.endsWith("-10-28") || /Cumhuriyet Bayramı Arife/i.test(h.name))
  );
}
