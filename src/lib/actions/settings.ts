"use server";

import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

export async function listAdmins() {
  await requireAdmin();
  const db = getDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.createdAt));
}

export async function createAdmin(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Yetkisiz" };
  }

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
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { error: "Bu e-posta zaten kayıtlı" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    email,
    username: null,
    passwordHash,
    role: "admin",
  });

  revalidatePath("/ayarlar");
  return { success: true };
}
