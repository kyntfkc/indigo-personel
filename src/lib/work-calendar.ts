import { and, gte, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { holidays } from "@/lib/db/schema";

/** dayKey = yyyy-MM-dd */
export function isWeekend(dayKey: string) {
  const d = new Date(`${dayKey}T12:00:00+03:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(d);
  return weekday === "Sat" || weekday === "Sun";
}

export function eachDayKeys(fromKey: string, toKey: string): string[] {
  if (toKey < fromKey) return [];
  const keys: string[] = [];
  let cur = fromKey;
  while (cur <= toKey) {
    keys.push(cur);
    const d = new Date(`${cur}T12:00:00+03:00`);
    d.setDate(d.getDate() + 1);
    cur = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
  return keys;
}

export function isWorkDay(dayKey: string, holidaySet: Set<string>) {
  return !isWeekend(dayKey) && !holidaySet.has(dayKey);
}

export function workStartDateTime(dayKey: string, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const hh = String(h ?? 9).padStart(2, "0");
  const mm = String(m ?? 0).padStart(2, "0");
  return new Date(`${dayKey}T${hh}:${mm}:00+03:00`);
}

export async function loadHolidaySet(fromKey: string, toKey: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(holidays)
    .where(
      and(
        gte(holidays.date, fromKey),
        lte(holidays.date, toKey),
        isNull(holidays.deletedAt)
      )
    );
  return new Set(rows.map((r) => r.date));
}

export async function listHolidaysInRange(fromKey: string, toKey: string) {
  const db = getDb();
  return db
    .select()
    .from(holidays)
    .where(
      and(
        gte(holidays.date, fromKey),
        lte(holidays.date, toKey),
        isNull(holidays.deletedAt)
      )
    )
    .orderBy(holidays.date);
}
