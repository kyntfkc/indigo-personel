"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employees, leaveRequests } from "@/lib/db/schema";

export async function createLeaveRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Yetkisiz" };

  let employeeId = session.user.employeeId;
  if (session.user.role === "admin") {
    employeeId = String(formData.get("employeeId") || employeeId || "");
  }
  if (!employeeId) return { error: "Personel kaydı bulunamadı" };

  const type = String(formData.get("type") || "") as
    | "yillik"
    | "hastalik"
    | "mazeret";
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!type || !startDate || !endDate) {
    return { error: "Eksik alanlar" };
  }
  if (endDate < startDate) {
    return { error: "Bitiş tarihi başlangıçtan önce olamaz" };
  }

  const db = getDb();
  await db.insert(leaveRequests).values({
    employeeId,
    type,
    startDate,
    endDate,
    note,
    status: "beklemede",
  });

  revalidatePath("/izin");
  revalidatePath("/benim/izin");
  revalidatePath("/");
  return { success: true };
}

export async function listLeaveRequests(status?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const db = getDb();
  const rows = await db
    .select({
      id: leaveRequests.id,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
      note: leaveRequests.note,
      createdAt: leaveRequests.createdAt,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(
      status
        ? eq(
            leaveRequests.status,
            status as "beklemede" | "onaylandi" | "reddedildi"
          )
        : undefined
    )
    .orderBy(desc(leaveRequests.createdAt));

  return rows;
}

export async function reviewLeaveRequest(
  id: string,
  status: "onaylandi" | "reddedildi"
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Yetkisiz" };
  }

  const db = getDb();
  await db
    .update(leaveRequests)
    .set({
      status,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(leaveRequests.id, id));

  revalidatePath("/izin");
  revalidatePath("/benim/izin");
  revalidatePath("/");
  return { success: true };
}

export async function getMyLeaveRequests(employeeId: string) {
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
    .from(leaveRequests)
    .where(eq(leaveRequests.employeeId, employeeId))
    .orderBy(desc(leaveRequests.createdAt));
}

export async function getPendingLeaveCount() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return 0;

  const db = getDb();
  const rows = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.status, "beklemede"));
  return rows.length;
}
