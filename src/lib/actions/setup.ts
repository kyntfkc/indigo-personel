"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function needsSetup() {
  try {
    const db = getDb();
    const rows = await db.select({ id: users.id }).from(users).limit(1);
    return rows.length === 0;
  } catch (error) {
    console.error("needsSetup error:", error);
    return true;
  }
}

export async function createInitialAdmin(formData: FormData) {
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli" };
  }
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalı" };
  }
  if (password !== passwordConfirm) {
    return { error: "Şifreler eşleşmiyor" };
  }

  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    return { error: "Kurulum zaten tamamlanmış" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    email,
    passwordHash,
    role: "admin",
  });

  return { success: true };
}

export async function createPersonelUser(input: {
  email: string;
  password: string;
  employeeId: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { error: "Yetkisiz" };
  }

  const email = input.email.toLowerCase().trim();
  const db = getDb();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { error: "Bu e-posta zaten kayıtlı" };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "personel",
    })
    .returning();

  const { employees } = await import("@/lib/db/schema");
  await db
    .update(employees)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(eq(employees.id, input.employeeId));

  revalidatePath("/personel");
  return { success: true, userId: user.id };
}
