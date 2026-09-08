"use server";

import bcrypt from "bcryptjs";
import { and, asc, desc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import {
  attendance,
  auditLogs,
  doorStations,
  employees,
  frozenDates,
  holidays,
  leaveRequests,
  siteSettings,
  users,
} from "@/lib/db/schema";
import { getTurkeyHolidays } from "@/lib/turkey-holidays";

const WORK_START_KEY = "work_start_time";
const DEFAULT_WORK_START = "09:00";
const OT_WEEKDAY_KEY = "overtime_weekday_hours";
const OT_WEEKEND_KEY = "overtime_weekend_hours";
const DEFAULT_OT_WEEKDAY = 4;
const DEFAULT_OT_WEEKEND = 8;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

function revalidateHolidayPaths() {
  revalidatePath("/ayarlar");
  revalidatePath("/raporlar");
  revalidatePath("/takvim");
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

export async function getOvertimeHourSettings() {
  const db = getDb();
  const rows = await db
    .select()
    .from(siteSettings)
    .where(inArray(siteSettings.key, [OT_WEEKDAY_KEY, OT_WEEKEND_KEY]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const weekday = Number(map.get(OT_WEEKDAY_KEY));
  const weekend = Number(map.get(OT_WEEKEND_KEY));
  return {
    weekday:
      Number.isFinite(weekday) && weekday > 0
        ? weekday
        : DEFAULT_OT_WEEKDAY,
    weekend:
      Number.isFinite(weekend) && weekend > 0
        ? weekend
        : DEFAULT_OT_WEEKEND,
  };
}

export async function setOvertimeHourSettings(formData: FormData) {
  await requireAdmin();
  const weekday = Number(String(formData.get("weekdayHours") || "").trim());
  const weekend = Number(String(formData.get("weekendHours") || "").trim());

  if (!Number.isFinite(weekday) || weekday <= 0 || weekday > 24) {
    return { error: "Hafta içi saat 1–24 arasında olmalı" };
  }
  if (!Number.isFinite(weekend) || weekend <= 0 || weekend > 24) {
    return { error: "Hafta sonu saat 1–24 arasında olmalı" };
  }

  const weekdayValue = String(Math.round(weekday * 10) / 10);
  const weekendValue = String(Math.round(weekend * 10) / 10);
  const db = getDb();
  const now = new Date();

  await db
    .insert(siteSettings)
    .values({ key: OT_WEEKDAY_KEY, value: weekdayValue, updatedAt: now })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: weekdayValue, updatedAt: now },
    });
  await db
    .insert(siteSettings)
    .values({ key: OT_WEEKEND_KEY, value: weekendValue, updatedAt: now })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: weekendValue, updatedAt: now },
    });

  await writeAudit({
    action: "settings.overtime_hours",
    entityType: "site_settings",
    entityId: "overtime_hours",
    summary: `Fazla mesai saatleri güncellendi (hafta içi ${weekdayValue}, hafta sonu ${weekendValue})`,
  });

  revalidatePath("/ayarlar");
  revalidatePath("/mesai");
  revalidatePath("/raporlar");
  return { success: true };
}

export async function listHolidays() {
  await requireAdmin();
  const db = getDb();
  return db
    .select()
    .from(holidays)
    .where(isNull(holidays.deletedAt))
    .orderBy(desc(holidays.date));
}

export async function addHoliday(formData: FormData) {
  const session = await requireAdmin();
  const date = String(formData.get("date") || "");
  const name = String(formData.get("name") || "").trim();
  if (!date || !name) return { error: "Tarih ve ad gerekli" };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(holidays)
    .where(eq(holidays.date, date))
    .limit(1);

  if (existing) {
    if (!existing.deletedAt) {
      return { error: "Bu tarih zaten kayıtlı" };
    }
    await db
      .update(holidays)
      .set({ name, deletedAt: null, createdBy: session.user.id })
      .where(eq(holidays.id, existing.id));
    await writeAudit({
      action: "holiday.restore",
      entityType: "holiday",
      entityId: existing.id,
      summary: `Resmi tatil geri eklendi: ${date} ${name}`,
    });
    revalidateHolidayPaths();
    return { success: true };
  }

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

  revalidateHolidayPaths();
  return { success: true };
}

export async function removeHoliday(id: string) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select()
    .from(holidays)
    .where(and(eq(holidays.id, id), isNull(holidays.deletedAt)))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db
    .update(holidays)
    .set({ deletedAt: new Date() })
    .where(eq(holidays.id, id));
  await writeAudit({
    action: "holiday.delete",
    entityType: "holiday",
    entityId: id,
    summary: `Resmi tatil silindi: ${row.date} ${row.name}`,
  });

  revalidateHolidayPaths();
  return { success: true };
}

export async function restoreHoliday(id: string) {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select()
    .from(holidays)
    .where(and(eq(holidays.id, id), isNotNull(holidays.deletedAt)))
    .limit(1);
  if (!row) return { error: "Bulunamadı" };

  await db
    .update(holidays)
    .set({ deletedAt: null })
    .where(eq(holidays.id, id));
  await writeAudit({
    action: "holiday.restore",
    entityType: "holiday",
    entityId: id,
    summary: `Resmi tatil geri alındı: ${row.date} ${row.name}`,
  });

  revalidateHolidayPaths();
  return { success: true };
}

export async function seedTurkeyHolidays() {
  const session = await requireAdmin();
  const db = getDb();
  const list = getTurkeyHolidays([2026, 2027]);
  let inserted = 0;
  let restored = 0;

  for (const item of list) {
    const [existing] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.date, item.date))
      .limit(1);

    if (!existing) {
      await db.insert(holidays).values({
        date: item.date,
        name: item.name,
        createdBy: session.user.id,
      });
      inserted += 1;
      continue;
    }

    if (existing.deletedAt) {
      await db
        .update(holidays)
        .set({
          name: item.name,
          deletedAt: null,
          createdBy: session.user.id,
        })
        .where(eq(holidays.id, existing.id));
      restored += 1;
    }
  }

  await writeAudit({
    action: "holiday.seed_turkey",
    entityType: "holiday",
    summary: `Türkiye resmi tatilleri yüklendi (${inserted} yeni, ${restored} geri alındı, 2026–2027)`,
    meta: { inserted, restored, total: list.length },
  });

  revalidateHolidayPaths();
  return {
    success: true,
    inserted: inserted + restored,
    total: list.length,
  };
}

export async function exportDataBackup() {
  await requireAdmin();
  const db = getDb();

  const [
    employeeRows,
    userRows,
    attendanceRows,
    leaveRows,
    frozenRows,
    holidayRows,
    doorRows,
    settingRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(employees).orderBy(asc(employees.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt)),
    db.select().from(attendance).orderBy(desc(attendance.recordedAt)),
    db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt)),
    db.select().from(frozenDates).orderBy(desc(frozenDates.startDate)),
    db.select().from(holidays).orderBy(desc(holidays.date)),
    db.select().from(doorStations).orderBy(asc(doorStations.createdAt)),
    db.select().from(siteSettings),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(5000),
  ]);

  await writeAudit({
    action: "backup.export",
    entityType: "backup",
    summary: "Veri yedeği indirildi",
  });

  return {
    exportedAt: new Date().toISOString(),
    note: "Indigo Personel yedeği. Neon konsol yedeği ayrıca önerilir.",
    employees: employeeRows,
    users: userRows,
    attendance: attendanceRows,
    leaveRequests: leaveRows,
    frozenDates: frozenRows,
    holidays: holidayRows,
    doorStations: doorRows,
    siteSettings: settingRows,
    auditLogs: auditRows,
  };
}
