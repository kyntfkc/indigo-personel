"use server";

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { attendance, doorStations, employees } from "@/lib/db/schema";
import { generateQrToken } from "@/lib/utils-app";

const COOLDOWN_MS = 60_000;

export type AttendanceMethod = "qr" | "manuel" | "otomatik" | "yuz";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

/** Istanbul calendar day bounds as UTC Date objects */
export function istanbulDayBounds(dayKey: string) {
  // dayKey = yyyy-MM-dd in Europe/Istanbul
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

export async function recordAttendance(input: {
  employeeId: string;
  method: AttendanceMethod;
  recordedAt?: Date;
  note?: string | null;
  forceType?: "giris" | "cikis";
  skipCooldown?: boolean;
}) {
  const db = getDb();
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);

  if (!employee) return { error: "Personel bulunamadı" };
  if (!employee.active) return { error: "Personel pasif durumda" };

  const [last] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.employeeId, employee.id))
    .orderBy(desc(attendance.recordedAt))
    .limit(1);

  if (!input.skipCooldown && last && !input.forceType) {
    const elapsed = Date.now() - new Date(last.recordedAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return { error: `Çok hızlı. ${wait} sn sonra tekrar deneyin.` };
    }
  }

  const type =
    input.forceType ??
    (!last || last.type === "cikis" ? "giris" : "cikis");

  const [record] = await db
    .insert(attendance)
    .values({
      employeeId: employee.id,
      type,
      method: input.method,
      recordedAt: input.recordedAt ?? new Date(),
      note: input.note ?? null,
    })
    .returning();

  revalidatePath("/mesai");
  revalidatePath("/");
  revalidatePath("/benim");
  revalidatePath("/kiosk");

  return {
    success: true as const,
    type,
    employee: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
    },
    recordedAt: record.recordedAt.toISOString(),
  };
}

export async function ensureDoorStation() {
  const db = getDb();
  const [existing] = await db.select().from(doorStations).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(doorStations)
    .values({
      name: "Ana Kapı",
      token: generateQrToken(),
      active: true,
    })
    .returning();
  return created;
}

export async function getDoorStation() {
  await requireAdmin();
  return ensureDoorStation();
}

export async function regenerateDoorToken() {
  await requireAdmin();
  const db = getDb();
  const station = await ensureDoorStation();
  const [updated] = await db
    .update(doorStations)
    .set({ token: generateQrToken() })
    .where(eq(doorStations.id, station.id))
    .returning();
  revalidatePath("/kiosk");
  return { success: true as const, station: updated };
}

export async function checkInViaDoor(token: string) {
  const session = await auth();
  if (!session?.user) return { error: "Giriş yapmalısınız" };

  const employeeId = session.user.employeeId;
  if (!employeeId) {
    return { error: "Hesabınıza bağlı personel kaydı yok" };
  }

  const db = getDb();
  const [station] = await db
    .select()
    .from(doorStations)
    .where(eq(doorStations.token, token.trim()))
    .limit(1);

  if (!station || !station.active) {
    return { error: "Geçersiz veya pasif kapı QR kodu" };
  }

  return recordAttendance({
    employeeId,
    method: "qr",
    note: `Kapı: ${station.name}`,
  });
}

export async function autoCheckoutOpenShifts(dayKey?: string) {
  const targetDay = dayKey ?? previousIstanbulDateKey();
  const db = getDb();
  const { start, end } = istanbulDayBounds(targetDay);
  const checkoutAt = istanbulEighteenHundred(targetDay);

  const dayRecords = await db
    .select()
    .from(attendance)
    .where(
      and(gte(attendance.recordedAt, start), lte(attendance.recordedAt, end))
    )
    .orderBy(desc(attendance.recordedAt));

  const latestByEmployee = new Map<string, (typeof dayRecords)[0]>();
  for (const row of dayRecords) {
    if (!latestByEmployee.has(row.employeeId)) {
      latestByEmployee.set(row.employeeId, row);
    }
  }

  let closed = 0;
  for (const [employeeId, last] of latestByEmployee) {
    if (last.type !== "giris") continue;

    await recordAttendance({
      employeeId,
      method: "otomatik",
      forceType: "cikis",
      recordedAt: checkoutAt,
      note: "Otomatik 18:00 çıkış",
      skipCooldown: true,
    });
    closed += 1;
  }

  return { success: true as const, dayKey: targetDay, closed };
}

export async function listAttendance(options?: {
  from?: string;
  to?: string;
  employeeId?: string;
}) {
  await requireAdmin();
  const db = getDb();

  const conditions = [];
  if (options?.from) {
    conditions.push(gte(attendance.recordedAt, new Date(options.from)));
  }
  if (options?.to) {
    const toDate = new Date(options.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(attendance.recordedAt, toDate));
  }
  if (options?.employeeId) {
    conditions.push(eq(attendance.employeeId, options.employeeId));
  }

  const rows = await db
    .select({
      id: attendance.id,
      type: attendance.type,
      recordedAt: attendance.recordedAt,
      method: attendance.method,
      note: attendance.note,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(attendance.recordedAt))
    .limit(500);

  return rows;
}

export async function createManualAttendance(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const employeeId = String(formData.get("employeeId") || "");
  const type = String(formData.get("type") || "") as "giris" | "cikis";
  const recordedAt = String(formData.get("recordedAt") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!employeeId || !type || !recordedAt) {
    return { error: "Eksik alanlar" };
  }

  await db.insert(attendance).values({
    employeeId,
    type,
    method: "manuel",
    recordedAt: new Date(recordedAt),
    note,
  });

  revalidatePath("/mesai");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAttendance(id: string) {
  await requireAdmin();
  const db = getDb();
  await db.delete(attendance).where(eq(attendance.id, id));
  revalidatePath("/mesai");
  revalidatePath("/");
  return { success: true };
}

export async function getTodayAttendanceSummary() {
  await requireAdmin();
  const db = getDb();

  const dayKey = istanbulDateKey();
  const { start } = istanbulDayBounds(dayKey);

  const rows = await db
    .select({
      id: attendance.id,
      type: attendance.type,
      recordedAt: attendance.recordedAt,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .where(gte(attendance.recordedAt, start))
    .orderBy(desc(attendance.recordedAt));

  const latestByEmployee = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    if (!latestByEmployee.has(row.employeeId)) {
      latestByEmployee.set(row.employeeId, row);
    }
  }

  const open = [...latestByEmployee.values()].filter((r) => r.type === "giris");
  const checkedInToday = new Set(
    rows.filter((r) => r.type === "giris").map((r) => r.employeeId)
  );

  return {
    records: rows,
    openCount: open.length,
    checkedInCount: checkedInToday.size,
    open,
  };
}

export async function getMyAttendance(employeeId: string, limit = 30) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  if (
    session.user.role !== "admin" &&
    session.user.employeeId !== employeeId
  ) {
    throw new Error("Yetkisiz");
  }

  const db = getDb();
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.employeeId, employeeId))
    .orderBy(desc(attendance.recordedAt))
    .limit(limit);
}
