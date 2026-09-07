"use server";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { attendance, employees } from "@/lib/db/schema";

const COOLDOWN_MS = 60_000;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

export async function scanQrAttendance(qrToken: string) {
  await requireAdmin();
  const db = getDb();
  const token = qrToken.trim();

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.qrToken, token))
    .limit(1);

  if (!employee) {
    return { error: "Geçersiz QR kod" };
  }
  if (!employee.active) {
    return { error: "Personel pasif durumda" };
  }

  const [last] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.employeeId, employee.id))
    .orderBy(desc(attendance.recordedAt))
    .limit(1);

  if (last) {
    const elapsed = Date.now() - new Date(last.recordedAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return {
        error: `Çok hızlı. ${wait} sn sonra tekrar deneyin.`,
      };
    }
  }

  const type = !last || last.type === "cikis" ? "giris" : "cikis";

  const [record] = await db
    .insert(attendance)
    .values({
      employeeId: employee.id,
      type,
      method: "qr",
      recordedAt: new Date(),
    })
    .returning();

  revalidatePath("/mesai");
  revalidatePath("/");
  revalidatePath("/kiosk");

  return {
    success: true,
    type,
    employee: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
    },
    recordedAt: record.recordedAt.toISOString(),
  };
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

  const start = new Date();
  start.setHours(0, 0, 0, 0);

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
