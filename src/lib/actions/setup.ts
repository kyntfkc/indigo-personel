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
  username: string;
  password: string;
  employeeId: string;
  email?: string | null;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { error: "Yetkisiz" };
  }

  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      error:
        "Kullanıcı adı 3–32 karakter; harf, rakam, nokta, _ veya - olmalı",
    };
  }

  const email = input.email?.toLowerCase().trim() || null;
  const db = getDb();

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existingUsername) {
    return { error: "Bu kullanıcı adı zaten kayıtlı" };
  }

  if (email) {
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingEmail) {
      return { error: "Bu e-posta zaten kayıtlı" };
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      username,
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
