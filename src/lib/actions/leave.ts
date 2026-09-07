"use server";

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { employees, frozenDates, leaveRequests } from "@/lib/db/schema";
import { assertLeaveAllowed, getLeaveBalance } from "@/lib/leave-policy";
import { writeAudit } from "@/lib/audit";

function revalidateLeavePaths() {
  revalidatePath("/izin");
  revalidatePath("/benim/izin");
  revalidatePath("/benim");
  revalidatePath("/takvim");
  revalidatePath("/personel");
  revalidatePath("/");
}

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

  const check = await assertLeaveAllowed({
    employeeId,
    startDate,
    endDate,
    type,
  });
  if (!check.ok) return { error: check.error };

  const db = getDb();
  await db.insert(leaveRequests).values({
    employeeId,
    type,
    startDate,
    endDate,
    note,
    status: "beklemede",
  });

  revalidateLeavePaths();
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

  revalidateLeavePaths();
  await writeAudit({
    action: `leave.${status}`,
    entityType: "leave_request",
    entityId: id,
    summary: `İzin ${status === "onaylandi" ? "onaylandı" : "reddedildi"}`,
  });
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

export async function fetchLeaveBalance(employeeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  if (
    session.user.role !== "admin" &&
    session.user.employeeId !== employeeId
  ) {
    throw new Error("Yetkisiz");
  }
  return getLeaveBalance(employeeId);
}

export async function getCalendarLeaveData(from: string, to: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  const db = getDb();

  const leaves = await db
    .select({
      id: leaveRequests.id,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
      note: leaveRequests.note,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(
      and(
        lte(leaveRequests.startDate, to),
        gte(leaveRequests.endDate, from),
        // show pending + approved on calendar
      )
    );

  const visible = leaves.filter(
    (l) => l.status === "beklemede" || l.status === "onaylandi"
  );

  const frozen = await db
    .select()
    .from(frozenDates)
    .where(
      and(lte(frozenDates.startDate, to), gte(frozenDates.endDate, from))
    )
    .orderBy(desc(frozenDates.startDate));

  return { leaves: visible, frozen };
}

export async function listFrozenDates() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  const db = getDb();
  return db.select().from(frozenDates).orderBy(desc(frozenDates.startDate));
}

export async function addFrozenDate(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Yetkisiz" };
  }

  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!startDate || !endDate) return { error: "Tarih aralığı gerekli" };
  if (endDate < startDate) {
    return { error: "Bitiş tarihi başlangıçtan önce olamaz" };
  }

  const db = getDb();
  const overlapping = await db
    .select()
    .from(frozenDates)
    .where(
      and(
        lte(frozenDates.startDate, endDate),
        gte(frozenDates.endDate, startDate)
      )
    )
    .limit(1);
  if (overlapping.length > 0) {
    return { error: "Bu aralık mevcut dondurulmuş günlerle çakışıyor" };
  }

  await db.insert(frozenDates).values({
    startDate,
    endDate,
    reason,
    createdBy: session.user.id,
  });

  revalidateLeavePaths();
  return { success: true };
}

export async function removeFrozenDate(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Yetkisiz" };
  }

  const db = getDb();
  await db.delete(frozenDates).where(eq(frozenDates.id, id));
  revalidateLeavePaths();
  return { success: true };
}
