"use server";

import bcrypt from "bcryptjs";
import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { holidays, siteSettings, users } from "@/lib/db/schema";
import { getTurkeyHolidays } from "@/lib/turkey-holidays";

const WORK_START_KEY = "work_start_time";
const DEFAULT_WORK_START = "09:00";

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
  const [created] = await db
    .insert(users)
    .values({
      email,
      username: null,
      passwordHash,
      role: "admin",
    })
    .returning({ id: users.id });

  await writeAudit({
    action: "admin.create",
    entityType: "user",
    entityId: created.id,
    summary: `Admin eklendi: ${email}`,
  });

  revalidatePath("/ayarlar");
  return { success: true };
}

export async function getWorkStartTime() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, WORK_START_KEY))
    .limit(1);
  return row?.value || DEFAULT_WORK_START;
}

export async function setWorkStartTime(formData: FormData) {
  await requireAdmin();
  const value = String(formData.get("workStartTime") || "").trim();
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return { error: "Saat HH:MM formatında olmalı" };
  }
  const [h, m] = value.split(":").map(Number);
  if (h > 23 || m > 59) return { error: "Geçersiz saat" };

  const db = getDb();
  await db
    .insert(siteSettings)
    .values({ key: WORK_START_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });

  await writeAudit({
    action: "settings.work_start",
    entityType: "site_settings",
    entityId: WORK_START_KEY,
    summary: `Mesai başlangıcı ${value} olarak güncellendi`,
  });

  revalidatePath("/ayarlar");
  revalidatePath("/raporlar");
  return { success: true };
}

export async function listHolidays() {
  await requireAdmin();
  const db = getDb();
  return db.select().from(holidays).orderBy(desc(holidays.date));
}

export async function addHoliday(formData: FormData) {
  const session = await requireAdmin();
  const date = String(formData.get("date") || "");
  const name = String(formData.get("name") || "").trim();
  if (!date || !name) return { error: "Tarih ve ad gerekli" };

  const db = getDb();
  try {
    const [row] = await db
      .insert(holidays)
      .values({
        date,
        name,
        createdBy: session.user.id,
      })
      .returning();

    await writeAudit({
      action: "holiday.create",
      entityType: "holiday",
      entityId: row.id,
      summary: `Resmi tatil eklendi: ${date} ${name}`,
    });
  } catch {
    return { error: "Bu tarih zaten kayıtlı" };
  }

  revalidatePath("/ayarlar");
  revalidatePath("/raporlar");
  revalidatePath("/takvim");
  return { success: true };
}

export async function removeHoliday(id: string) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, id))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db.delete(holidays).where(eq(holidays.id, id));
  await writeAudit({
    action: "holiday.delete",
    entityType: "holiday",
    entityId: id,
    summary: `Resmi tatil silindi: ${row.date} ${row.name}`,
  });

  revalidatePath("/ayarlar");
  revalidatePath("/raporlar");
  revalidatePath("/takvim");
  return { success: true };
}

export async function seedTurkeyHolidays() {
  const session = await requireAdmin();
  const db = getDb();
  const list = getTurkeyHolidays([2026, 2027]);
  let inserted = 0;

  for (const item of list) {
    const result = await db
      .insert(holidays)
      .values({
        date: item.date,
        name: item.name,
        createdBy: session.user.id,
      })
      .onConflictDoNothing({ target: holidays.date })
      .returning();
    if (result.length > 0) inserted += 1;
  }

  await writeAudit({
    action: "holiday.seed_turkey",
    entityType: "holiday",
    summary: `Türkiye resmi tatilleri yüklendi (${inserted} yeni, 2026–2027)`,
    meta: { inserted, total: list.length },
  });

  revalidatePath("/ayarlar");
  revalidatePath("/raporlar");
  revalidatePath("/takvim");
  return { success: true, inserted, total: list.length };
}
