"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { attendance, employees, leaveRequests } from "@/lib/db/schema";

function monthRange(year: number, month: number) {
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

function calcHoursFromRecords(
  empRecords: { type: string; recordedAt: Date }[]
) {
  let totalMs = 0;
  let openGiris: Date | null = null;

  for (const rec of empRecords) {
    if (rec.type === "giris") {
      openGiris = new Date(rec.recordedAt);
    } else if (rec.type === "cikis" && openGiris) {
      totalMs += new Date(rec.recordedAt).getTime() - openGiris.getTime();
      openGiris = null;
    }
  }

  const daysPresent = new Set(
    empRecords
      .filter((r) => r.type === "giris")
      .map((r) => new Date(r.recordedAt).toISOString().slice(0, 10))
  ).size;

  return {
    hours: Math.round((totalMs / 3600000) * 10) / 10,
    daysPresent,
  };
}

export async function getEmployeeMonthHours(
  employeeId: string,
  year?: number,
  month?: number
) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  if (
    session.user.role !== "admin" &&
    session.user.employeeId !== employeeId
  ) {
    throw new Error("Yetkisiz");
  }

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const { from, to } = monthRange(y, m);

  const db = getDb();
  const records = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.employeeId, employeeId),
        gte(attendance.recordedAt, from),
        lte(attendance.recordedAt, to)
      )
    )
    .orderBy(attendance.recordedAt);

  return { year: y, month: m, ...calcHoursFromRecords(records) };
}

export async function getMonthlyReport(year: number, month: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const db = getDb();
  const { from, to } = monthRange(year, month);

  const activeEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.active, true));

  const records = await db
    .select()
    .from(attendance)
    .where(
      and(gte(attendance.recordedAt, from), lte(attendance.recordedAt, to))
    )
    .orderBy(attendance.recordedAt);

  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.status, "onaylandi"),
        lte(leaveRequests.startDate, to.toISOString().slice(0, 10)),
        gte(leaveRequests.endDate, from.toISOString().slice(0, 10))
      )
    );

  const byEmployee = activeEmployees.map((emp) => {
    const empRecords = records.filter((r) => r.employeeId === emp.id);
    const { hours, daysPresent } = calcHoursFromRecords(empRecords);

    const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
    let leaveDays = 0;
    for (const leave of empLeaves) {
      const start = new Date(
        Math.max(new Date(leave.startDate).getTime(), from.getTime())
      );
      const end = new Date(
        Math.min(new Date(leave.endDate).getTime(), to.getTime())
      );
      const days =
        Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      leaveDays += Math.max(0, days);
    }

    return {
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      hours,
      daysPresent,
      leaveDays,
      recordCount: empRecords.length,
    };
  });

  return {
    year,
    month,
    employees: byEmployee,
    totals: {
      totalHours: Math.round(
        byEmployee.reduce((s, e) => s + e.hours, 0) * 10
      ) / 10,
      avgHours:
        byEmployee.length > 0
          ? Math.round(
              (byEmployee.reduce((s, e) => s + e.hours, 0) /
                byEmployee.length) *
                10
            ) / 10
          : 0,
      totalLeaveDays: byEmployee.reduce((s, e) => s + e.leaveDays, 0),
    },
  };
}
