/** Istanbul calendar helpers for attendance */

export function istanbulDayBounds(dayKey: string) {
  const start = new Date(`${dayKey}T00:00:00+03:00`);
  const end = new Date(`${dayKey}T23:59:59.999+03:00`);
  return { start, end };
}

export function istanbulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function previousIstanbulDateKey(date = new Date()) {
  const todayKey = istanbulDateKey(date);
  const noon = new Date(`${todayKey}T12:00:00+03:00`);
  noon.setDate(noon.getDate() - 1);
  return istanbulDateKey(noon);
}

export function istanbulEighteenHundred(dayKey: string) {
  return new Date(`${dayKey}T18:00:00+03:00`);
}

/** dayKey = yyyy-MM-dd */
export function isWeekend(dayKey: string) {
  const d = new Date(`${dayKey}T12:00:00+03:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(d);
  return weekday === "Sat" || weekday === "Sun";
}

export function overtimeHoursForDay(
  dayKey: string,
  settings: { weekday: number; weekend: number } = {
    weekday: 4,
    weekend: 8,
  }
) {
  return isWeekend(dayKey) ? settings.weekend : settings.weekday;
}

/** datetime-local (YYYY-MM-DDTHH:mm) değerini İstanbul saati olarak Date'e çevir */
export function parseIstanbulDateTimeLocal(raw: string): Date | null {
  const trimmed = raw.trim();
  const m = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (m) {
    const [, day, hh, mm, ss] = m;
    return new Date(`${day}T${hh}:${mm}:${ss ?? "00"}+03:00`);
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Date'i datetime-local input değeri olarak İstanbul saatinde üret */
export function toIstanbulDateTimeLocalValue(date: Date | string = new Date()) {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** İstanbul saatinde HH:mm */
export function formatIstanbulHm(date: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
}

/** 75 → "1 sa 15 dk", 45 → "45 dk" */
export function formatLateMinutes(totalMinutes: number) {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hours} sa`;
  return `${hours} sa ${rem} dk`;
}
