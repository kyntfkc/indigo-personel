"use server";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employees, overtime } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";
import { overtimeHoursForDay } from "@/lib/istanbul-time";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

export async function listOvertime(options?: {
  from?: string;
  to?: string;
  employeeId?: string;
}) {
  await requireAdmin();
  const db = getDb();

  const conditions = [];
  if (options?.from) {
    conditions.push(gte(overtime.day, options.from));
  }
  if (options?.to) {
    conditions.push(lte(overtime.day, options.to));
  }
  if (options?.employeeId) {
    conditions.push(eq(overtime.employeeId, options.employeeId));
  }

  return db
    .select({
      id: overtime.id,
      day: overtime.day,
      hours: overtime.hours,
      note: overtime.note,
      createdAt: overtime.createdAt,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(overtime)
    .innerJoin(employees, eq(overtime.employeeId, employees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(overtime.day), asc(employees.firstName))
    .limit(500);
}

export async function createOvertime(formData: FormData) {
  const session = await requireAdmin();
  const db = getDb();

  const employeeId = String(formData.get("employeeId") || "");
  const day = String(formData.get("day") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (!employeeId || !day) {
    return { error: "Eksik alanlar" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { error: "Geçersiz tarih" };
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) return { error: "Personel bulunamadı" };
  if (!employee.active) return { error: "Personel pasif durumda" };

  const hours = overtimeHoursForDay(day);

  const [existing] = await db
    .select({ id: overtime.id })
    .from(overtime)
    .where(and(eq(overtime.employeeId, employeeId), eq(overtime.day, day)))
    .limit(1);
  if (existing) {
    return { error: "Bu personel için bu günde zaten fazla mesai kaydı var" };
  }

  const [row] = await db
    .insert(overtime)
    .values({
      employeeId,
      day,
      hours,
      note,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/mesai");
  revalidatePath("/raporlar");
  revalidatePath("/");

  await writeAudit({
    action: "overtime.create",
    entityType: "overtime",
    entityId: row.id,
    summary: `Fazla mesai: ${employee.firstName} ${employee.lastName} ${day} (+${hours} sa)`,
    meta: { employeeId, day, hours, note },
  });

  return { success: true as const, hours };
}

export async function deleteOvertime(id: string) {
  await requireAdmin();
  const db = getDb();

  const [row] = await db
    .select()
    .from(overtime)
    .where(eq(overtime.id, id))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db.delete(overtime).where(eq(overtime.id, id));

  revalidatePath("/mesai");
  revalidatePath("/raporlar");
  revalidatePath("/");

  await writeAudit({
    action: "overtime.delete",
    entityType: "overtime",
    entityId: id,
    summary: `Fazla mesai silindi: ${row.day} (+${row.hours} sa)`,
    meta: {
      employeeId: row.employeeId,
      day: row.day,
      hours: row.hours,
    },
  });

  return { success: true as const };
}
