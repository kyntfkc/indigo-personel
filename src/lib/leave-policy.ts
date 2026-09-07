import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { getDb } from "@/lib/db";
import {
  employees,
  frozenDates,
  leaveRequests,
} from "@/lib/db/schema";

export function getEntitlementDays(
  hireDate: string | null | undefined,
  asOf: Date = new Date()
): number {
  if (!hireDate) return 0;
  const hire = parseISO(hireDate);
  if (Number.isNaN(hire.getTime())) return 0;

  const years =
    (asOf.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years >= 5) return 21;
  if (years >= 1) return 14;
  return 0;
}

export function countLeaveDays(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  return differenceInCalendarDays(end, start) + 1;
}

export function eachDateInRange(startDate: string, endDate: string): string[] {
  const days = countLeaveDays(startDate, endDate);
  if (days === 0) return [];
  const start = parseISO(startDate);
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export async function getLeaveBalance(employeeId: string) {
  const db = getDb();
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    return { entitlement: 0, used: 0, remaining: 0, pending: 0 };
  }

  const entitlement = getEntitlementDays(employee.hireDate);
  const rows = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.employeeId, employeeId));

  let used = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.type !== "yillik") continue;
    const days = countLeaveDays(row.startDate, row.endDate);
    if (row.status === "onaylandi") used += days;
    if (row.status === "beklemede") pending += days;
  }

  return {
    entitlement,
    used,
    remaining: Math.max(0, entitlement - used),
    pending,
  };
}

export async function assertLeaveAllowed(input: {
  employeeId: string;
  startDate: string;
  endDate: string;
  type: "yillik" | "hastalik" | "mazeret";
  excludeRequestId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { employeeId, startDate, endDate, type, excludeRequestId } = input;

  if (endDate < startDate) {
    return { ok: false, error: "Bitiş tarihi başlangıçtan önce olamaz" };
  }

  const db = getDb();
  const rangeDates = eachDateInRange(startDate, endDate);

  const frozen = await db
    .select()
    .from(frozenDates)
    .where(
      and(
        lte(frozenDates.startDate, endDate),
        gte(frozenDates.endDate, startDate),
        isNull(frozenDates.deletedAt)
      )
    );

  if (frozen.length > 0) {
    const ranges = frozen
      .map((f) =>
        f.startDate === f.endDate
          ? f.startDate
          : `${f.startDate} – ${f.endDate}`
      )
      .join(", ");
    return {
      ok: false,
      error: `Dondurulmuş günler seçilemez: ${ranges}`,
    };
  }

  const existing = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.employeeId, employeeId));

  for (const row of existing) {
    if (excludeRequestId && row.id === excludeRequestId) continue;
    if (row.status === "reddedildi") continue;
    const overlaps = !(endDate < row.startDate || startDate > row.endDate);
    if (overlaps) {
      return {
        ok: false,
        error: "Bu tarihlerde zaten bekleyen veya onaylı izin var",
      };
    }
  }

  if (type === "yillik") {
    const balance = await getLeaveBalance(employeeId);
    const days = rangeDates.length;
    if (balance.entitlement === 0) {
      return {
        ok: false,
        error: "Yıllık izin hakkı için en az 1 yıl dolmuş olmalı",
      };
    }
    if (days > balance.remaining) {
      return {
        ok: false,
        error: `Yetersiz izin hakkı. Kalan: ${balance.remaining} gün, talep: ${days} gün`,
      };
    }
  }

  return { ok: true };
}
