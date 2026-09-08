"use server";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employeePayments, employees } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";
import {
  PAYMENT_LABELS,
  isPaymentType,
  type PaymentType,
} from "@/lib/payment-labels";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

export async function listPayments(options?: {
  from?: string;
  to?: string;
  employeeId?: string;
  type?: PaymentType;
}) {
  await requireAdmin();
  const db = getDb();

  const conditions = [];
  if (options?.from) conditions.push(gte(employeePayments.day, options.from));
  if (options?.to) conditions.push(lte(employeePayments.day, options.to));
  if (options?.employeeId) {
    conditions.push(eq(employeePayments.employeeId, options.employeeId));
  }
  if (options?.type) {
    conditions.push(eq(employeePayments.type, options.type));
  }

  return db
    .select({
      id: employeePayments.id,
      day: employeePayments.day,
      type: employeePayments.type,
      amount: employeePayments.amount,
      note: employeePayments.note,
      createdAt: employeePayments.createdAt,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(employeePayments)
    .innerJoin(employees, eq(employeePayments.employeeId, employees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(employeePayments.day), asc(employees.firstName))
    .limit(500);
}

export async function createPayment(formData: FormData) {
  const session = await requireAdmin();
  const db = getDb();

  const employeeId = String(formData.get("employeeId") || "");
  const day = String(formData.get("day") || "").trim();
  const type = String(formData.get("type") || "").trim() as PaymentType;
  const amountRaw = String(formData.get("amount") || "")
    .trim()
    .replace(",", ".");
  const note = String(formData.get("note") || "").trim() || null;

  if (!employeeId || !day || !type) {
    return { error: "Eksik alanlar" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { error: "Geçersiz tarih" };
  }
  if (!isPaymentType(type)) {
    return { error: "Geçersiz tür" };
  }

  const amountNum = Number(amountRaw);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { error: "Tutar 0’dan büyük olmalı" };
  }
  const amount = amountNum.toFixed(2);

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) return { error: "Personel bulunamadı" };
  if (!employee.active) return { error: "Personel pasif durumda" };

  const [row] = await db
    .insert(employeePayments)
    .values({
      employeeId,
      day,
      type,
      amount,
      note,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/prim");

  await writeAudit({
    action: "payment.create",
    entityType: "employee_payment",
    entityId: row.id,
    summary: `${PAYMENT_LABELS[type]}: ${employee.firstName} ${employee.lastName} ${day} (${amount} ₺)`,
    meta: { employeeId, day, type, amount, note },
  });

  return { success: true as const, amount };
}

export async function deletePayment(id: string) {
  await requireAdmin();
  const db = getDb();

  const [row] = await db
    .select()
    .from(employeePayments)
    .where(eq(employeePayments.id, id))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db.delete(employeePayments).where(eq(employeePayments.id, id));

  revalidatePath("/prim");

  await writeAudit({
    action: "payment.delete",
    entityType: "employee_payment",
    entityId: id,
    summary: `Ödeme silindi: ${PAYMENT_LABELS[row.type as PaymentType]} ${row.day} (${row.amount} ₺)`,
    meta: {
      employeeId: row.employeeId,
      day: row.day,
      type: row.type,
      amount: row.amount,
    },
  });

  return { success: true as const };
}
