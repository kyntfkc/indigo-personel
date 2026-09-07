"use server";

import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employees, users } from "@/lib/db/schema";
import { generateQrToken } from "@/lib/utils-app";
import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }
  return session;
}

async function requireEmployeeAccess(employeeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  if (
    session.user.role !== "admin" &&
    session.user.employeeId !== employeeId
  ) {
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
  const emergencyContact =
    String(formData.get("emergencyContact") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const createLogin = formData.get("createLogin") === "on";
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!firstName || !lastName) {
    return { error: "Ad ve soyad gerekli" };
  }

  let userId: string | null = null;
  if (createLogin) {
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return {
        error:
          "Kullanıcı adı 3–32 karakter; harf, rakam, nokta, _ veya - olmalı",
      };
    }
    if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı" };

    const [existingUsername] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username}`)
      .limit(1);
    if (existingUsername) return { error: "Bu kullanıcı adı zaten kayıtlı" };

    if (email) {
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      if (existingEmail) return { error: "Bu e-posta zaten kayıtlı" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        username,
        email: email ? email.toLowerCase() : null,
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
      emergencyContact,
      notes,
      qrToken: generateQrToken(),
      userId,
      active: true,
    })
    .returning();

  revalidatePath("/personel");
  revalidatePath("/");
  await writeAudit({
    action: "employee.create",
    entityType: "employee",
    entityId: employee.id,
    summary: `Personel eklendi: ${firstName} ${lastName}`,
  });
  return { success: true, id: employee.id };
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await requireEmployeeAccess(id);
  const db = getDb();
  const isAdmin = session.user.role === "admin";

  if (isAdmin) {
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim() || null;
    const phone = String(formData.get("phone") || "").trim() || null;
    const department = String(formData.get("department") || "").trim() || null;
    const position = String(formData.get("position") || "").trim() || null;
    const hireDate = String(formData.get("hireDate") || "").trim() || null;
    const emergencyContact =
      String(formData.get("emergencyContact") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;
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
        emergencyContact,
        notes,
        active,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));
  } else {
    const phone = String(formData.get("phone") || "").trim() || null;
    const emergencyContact =
      String(formData.get("emergencyContact") || "").trim() || null;

    await db
      .update(employees)
      .set({
        phone,
        emergencyContact,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));
  }

  revalidatePath("/personel");
  revalidatePath(`/personel/${id}`);
  revalidatePath("/benim");
  revalidatePath("/");
  await writeAudit({
    action: isAdmin ? "employee.update" : "employee.self_update",
    entityType: "employee",
    entityId: id,
    summary: isAdmin
      ? `Personel güncellendi: ${id}`
      : `Personel kendi profilini güncelledi`,
  });
  return { success: true };
}

export async function uploadEmployeePhoto(employeeId: string, formData: FormData) {
  await requireEmployeeAccess(employeeId);

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Fotoğraf seçin" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Sadece görsel dosyaları yüklenebilir" };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: "Fotoğraf en fazla 4 MB olabilir" };
  }

  const db = getDb();
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) return { error: "Personel bulunamadı" };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const pathname = `employees/${employeeId}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  if (employee.photoUrl) {
    try {
      await del(employee.photoUrl);
    } catch {
      /* ignore */
    }
  }

  await db
    .update(employees)
    .set({ photoUrl: blob.url, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));

  revalidatePath(`/personel/${employeeId}`);
  revalidatePath("/personel");
  revalidatePath("/benim");
  return { success: true, url: blob.url };
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
