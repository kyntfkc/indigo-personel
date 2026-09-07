"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employees, users } from "@/lib/db/schema";
import { generateQrToken } from "@/lib/utils-app";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

export async function listEmployees(search?: string) {
  await requireAdmin();
  const db = getDb();

  const rows = await db
    .select()
    .from(employees)
    .orderBy(desc(employees.createdAt));

  if (!search?.trim()) return rows;

  const q = search.trim().toLowerCase();
  return rows.filter(
    (e) =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      (e.email?.toLowerCase().includes(q) ?? false) ||
      (e.department?.toLowerCase().includes(q) ?? false) ||
      (e.position?.toLowerCase().includes(q) ?? false)
  );
}

export async function getEmployee(id: string) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return row ?? null;
}

export async function createEmployee(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const department = String(formData.get("department") || "").trim() || null;
  const position = String(formData.get("position") || "").trim() || null;
  const hireDate = String(formData.get("hireDate") || "").trim() || null;
  const createLogin = formData.get("createLogin") === "on";
  const password = String(formData.get("password") || "");

  if (!firstName || !lastName) {
    return { error: "Ad ve soyad gerekli" };
  }

  let userId: string | null = null;
  if (createLogin) {
    if (!email) return { error: "Giriş hesabı için e-posta gerekli" };
    if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı" };

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (existing) return { error: "Bu e-posta zaten kayıtlı" };

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        role: "personel",
      })
      .returning();
    userId = user.id;
  }

  const [employee] = await db
    .insert(employees)
    .values({
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      hireDate,
      qrToken: generateQrToken(),
      userId,
      active: true,
    })
    .returning();

  revalidatePath("/personel");
  revalidatePath("/");
  return { success: true, id: employee.id };
}

export async function updateEmployee(id: string, formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const department = String(formData.get("department") || "").trim() || null;
  const position = String(formData.get("position") || "").trim() || null;
  const hireDate = String(formData.get("hireDate") || "").trim() || null;
  const active = formData.get("active") === "on";

  if (!firstName || !lastName) {
    return { error: "Ad ve soyad gerekli" };
  }

  await db
    .update(employees)
    .set({
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      hireDate,
      active,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id));

  revalidatePath("/personel");
  revalidatePath(`/personel/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function regenerateQrToken(id: string) {
  await requireAdmin();
  const db = getDb();
  const token = generateQrToken();
  await db
    .update(employees)
    .set({ qrToken: token, updatedAt: new Date() })
    .where(eq(employees.id, id));
  revalidatePath(`/personel/${id}`);
  revalidatePath("/personel");
  return { success: true, qrToken: token };
}

export async function getEmployeeCount() {
  const db = getDb();
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.active, true));
  return rows.length;
}
