"use server";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { attendance, doorStations, employees } from "@/lib/db/schema";
import { generateQrToken } from "@/lib/utils-app";
import {
  istanbulDateKey,
  istanbulDayBounds,
  istanbulEighteenHundred,
  previousIstanbulDateKey,
} from "@/lib/istanbul-time";
import { writeAudit } from "@/lib/audit";
import { getWorkStartTime } from "@/lib/actions/settings";
import { workStartDateTime } from "@/lib/work-calendar";

const COOLDOWN_MS = 60_000;

export type AttendanceMethod = "qr" | "manuel" | "otomatik" | "yuz";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
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
  await writeAudit({
    action: "door.token_regenerate",
    entityType: "door_station",
    entityId: updated.id,
    summary: "Kapı QR token yenilendi",
  });
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

  if (closed > 0) {
    await writeAudit({
      action: "attendance.auto_checkout",
      entityType: "attendance",
      entityId: targetDay,
      summary: `Otomatik 18:00 çıkış: ${closed} kişi (${targetDay})`,
      actorUserId: null,
    });
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

async function assertAttendanceSequence(input: {
  employeeId: string;
  type: "giris" | "cikis";
  recordedAt: Date;
  excludeId?: string;
}): Promise<{ error: string } | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: attendance.id,
      type: attendance.type,
      recordedAt: attendance.recordedAt,
    })
    .from(attendance)
    .where(eq(attendance.employeeId, input.employeeId))
    .orderBy(asc(attendance.recordedAt), asc(attendance.id));

  const others = input.excludeId
    ? rows.filter((r) => r.id !== input.excludeId)
    : rows;
  const t = input.recordedAt.getTime();

  let prev: (typeof others)[number] | null = null;
  let next: (typeof others)[number] | null = null;
  for (const r of others) {
    const rt = new Date(r.recordedAt).getTime();
    if (rt <= t) prev = r;
    else {
      next = r;
      break;
    }
  }

  if (input.type === "giris") {
    if (prev && prev.type !== "cikis") {
      return { error: "Bu saatten önce zaten açık bir giriş var" };
    }
    if (next && next.type !== "cikis") {
      return { error: "Bu saatten sonra zaten bir giriş var" };
    }
  } else {
    if (!prev || prev.type !== "giris") {
      return { error: "Çıkış eklemek için önceki kayıt giriş olmalı" };
    }
    if (next && next.type !== "giris") {
      return { error: "Bu saatten sonra zaten bir çıkış var" };
    }
  }

  return null;
}

export async function createManualAttendance(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const employeeId = String(formData.get("employeeId") || "");
  const type = String(formData.get("type") || "") as "giris" | "cikis";
  const recordedAtRaw = String(formData.get("recordedAt") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!employeeId || !type || !recordedAtRaw) {
    return { error: "Eksik alanlar" };
  }
  if (type !== "giris" && type !== "cikis") {
    return { error: "Geçersiz tip" };
  }

  const recordedAt = new Date(recordedAtRaw);
  if (Number.isNaN(recordedAt.getTime())) {
    return { error: "Geçersiz zaman" };
  }

  const seqError = await assertAttendanceSequence({
    employeeId,
    type,
    recordedAt,
  });
  if (seqError) return seqError;

  await db.insert(attendance).values({
    employeeId,
    type,
    method: "manuel",
    recordedAt,
    note,
  });

  revalidatePath("/mesai");
  revalidatePath("/");
  revalidatePath("/raporlar");
  await writeAudit({
    action: "attendance.manual",
    entityType: "attendance",
    entityId: employeeId,
    summary: `Manuel ${type} kaydı`,
    meta: { recordedAt: recordedAtRaw, note },
  });
  return { success: true };
}

export async function createLateArrival(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const employeeId = String(formData.get("employeeId") || "");
  const recordedAtRaw = String(formData.get("recordedAt") || "");
  const note =
    String(formData.get("note") || "").trim() || "Manuel geç giriş";

  if (!employeeId || !recordedAtRaw) {
    return { error: "Eksik alanlar" };
  }

  const recordedAt = new Date(recordedAtRaw);
  if (Number.isNaN(recordedAt.getTime())) {
    return { error: "Geçersiz zaman" };
  }

  const workStart = await getWorkStartTime();
  const dayKey = istanbulDateKey(recordedAt);
  const startAt = workStartDateTime(dayKey, workStart);
  if (recordedAt <= startAt) {
    return {
      error: `Geç giriş için saat mesai başlangıcından sonra olmalı (örn. ${workStart})`,
    };
  }

  const seqError = await assertAttendanceSequence({
    employeeId,
    type: "giris",
    recordedAt,
  });
  if (seqError) return seqError;

  await db.insert(attendance).values({
    employeeId,
    type: "giris",
    method: "manuel",
    recordedAt,
    note,
  });

  revalidatePath("/");
  revalidatePath("/mesai");
  revalidatePath("/raporlar");
  await writeAudit({
    action: "attendance.late_manual",
    entityType: "attendance",
    entityId: employeeId,
    summary: "Manuel geç giriş kaydı",
    meta: { recordedAt: recordedAtRaw, note, workStart },
  });
  return { success: true };
}

export async function updateAttendance(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const id = String(formData.get("id") || "");
  const type = String(formData.get("type") || "") as "giris" | "cikis";
  const recordedAtRaw = String(formData.get("recordedAt") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!id || !type || !recordedAtRaw) {
    return { error: "Eksik alanlar" };
  }
  if (type !== "giris" && type !== "cikis") {
    return { error: "Geçersiz tip" };
  }

  const recordedAt = new Date(recordedAtRaw);
  if (Number.isNaN(recordedAt.getTime())) {
    return { error: "Geçersiz zaman" };
  }

  const [row] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, id))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  const seqError = await assertAttendanceSequence({
    employeeId: row.employeeId,
    type,
    recordedAt,
    excludeId: id,
  });
  if (seqError) return seqError;

  await db
    .update(attendance)
    .set({ type, recordedAt, note })
    .where(eq(attendance.id, id));

  revalidatePath("/mesai");
  revalidatePath("/");
  revalidatePath("/raporlar");
  await writeAudit({
    action: "attendance.update",
    entityType: "attendance",
    entityId: id,
    summary: `Mesai kaydı güncellendi: ${type}`,
    meta: {
      employeeId: row.employeeId,
      recordedAt: recordedAtRaw,
      note,
      previousType: row.type,
      previousRecordedAt: row.recordedAt.toISOString(),
    },
  });
  return { success: true };
}

export async function deleteAttendance(id: string) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, id))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db.delete(attendance).where(eq(attendance.id, id));
  revalidatePath("/mesai");
  revalidatePath("/");
  await writeAudit({
    action: "attendance.delete",
    entityType: "attendance",
    entityId: id,
    summary: `Mesai kaydı silindi: ${row.type}`,
    meta: {
      employeeId: row.employeeId,
      recordedAt: row.recordedAt,
      method: row.method,
    },
  });
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
