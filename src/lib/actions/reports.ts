"use server";

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  attendance,
  auditLogs,
  employees,
  leaveRequests,
  users,
} from "@/lib/db/schema";
import { getWorkStartTime } from "@/lib/actions/settings";
import {
  eachDayKeys,
  isWorkDay,
  loadHolidaySet,
  workStartDateTime,
} from "@/lib/work-calendar";
import { istanbulDateKey } from "@/lib/istanbul-time";
import {
  countLeaveDays,
  getEntitlementDays,
} from "@/lib/leave-policy";

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
      .map((r) => istanbulDateKey(new Date(r.recordedAt)))
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
      totalHours:
        Math.round(byEmployee.reduce((s, e) => s + e.hours, 0) * 10) / 10,
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

export async function getLateArrivals(fromKey: string, toKey: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const workStart = await getWorkStartTime();
  const holidaySet = await loadHolidaySet(fromKey, toKey);
  const workDays = eachDayKeys(fromKey, toKey).filter((d) =>
    isWorkDay(d, holidaySet)
  );

  const db = getDb();
  const from = new Date(`${fromKey}T00:00:00+03:00`);
  const to = new Date(`${toKey}T23:59:59.999+03:00`);

  const records = await db
    .select({
      employeeId: attendance.employeeId,
      recordedAt: attendance.recordedAt,
      type: attendance.type,
      firstName: employees.firstName,
      lastName: employees.lastName,
      department: employees.department,
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .where(
      and(
        eq(attendance.type, "giris"),
        gte(attendance.recordedAt, from),
        lte(attendance.recordedAt, to)
      )
    )
    .orderBy(attendance.recordedAt);

  const firstGiris = new Map<string, (typeof records)[0]>();
  for (const row of records) {
    const day = istanbulDateKey(new Date(row.recordedAt));
    const key = `${row.employeeId}|${day}`;
    if (!firstGiris.has(key)) firstGiris.set(key, row);
  }

  const late: {
    employeeId: string;
    name: string;
    department: string | null;
    dayKey: string;
    checkInAt: string;
    workStart: string;
    lateMinutes: number;
  }[] = [];

  for (const day of workDays) {
    const startAt = workStartDateTime(day, workStart);
    for (const [mapKey, row] of firstGiris) {
      if (!mapKey.endsWith(`|${day}`)) continue;
      const checkIn = new Date(row.recordedAt);
      if (checkIn <= startAt) continue;
      const lateMinutes = Math.round(
        (checkIn.getTime() - startAt.getTime()) / 60000
      );
      late.push({
        employeeId: row.employeeId,
        name: `${row.firstName} ${row.lastName}`,
        department: row.department,
        dayKey: day,
        checkInAt: checkIn.toISOString(),
        workStart,
        lateMinutes,
      });
    }
  }

  late.sort((a, b) =>
    a.dayKey === b.dayKey
      ? b.lateMinutes - a.lateMinutes
      : b.dayKey.localeCompare(a.dayKey)
  );

  return { fromKey, toKey, workStart, rows: late };
}

export async function getAbsences(fromKey: string, toKey: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const holidaySet = await loadHolidaySet(fromKey, toKey);
  const workDays = eachDayKeys(fromKey, toKey).filter((d) =>
    isWorkDay(d, holidaySet)
  );

  const db = getDb();
  const activeEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.active, true));

  const from = new Date(`${fromKey}T00:00:00+03:00`);
  const to = new Date(`${toKey}T23:59:59.999+03:00`);

  const girisRecords = await db
    .select({
      employeeId: attendance.employeeId,
      recordedAt: attendance.recordedAt,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.type, "giris"),
        gte(attendance.recordedAt, from),
        lte(attendance.recordedAt, to)
      )
    );

  const present = new Set(
    girisRecords.map(
      (r) => `${r.employeeId}|${istanbulDateKey(new Date(r.recordedAt))}`
    )
  );

  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.status, "onaylandi"),
        lte(leaveRequests.startDate, toKey),
        gte(leaveRequests.endDate, fromKey)
      )
    );

  const onLeave = (employeeId: string, day: string) =>
    leaves.some(
      (l) =>
        l.employeeId === employeeId && l.startDate <= day && l.endDate >= day
    );

  const rows: {
    employeeId: string;
    name: string;
    department: string | null;
    dayKey: string;
  }[] = [];

  for (const day of workDays) {
    for (const emp of activeEmployees) {
      if (present.has(`${emp.id}|${day}`)) continue;
      if (onLeave(emp.id, day)) continue;
      rows.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        dayKey: day,
      });
    }
  }

  rows.sort((a, b) =>
    a.dayKey === b.dayKey
      ? a.name.localeCompare(b.name, "tr")
      : b.dayKey.localeCompare(a.dayKey)
  );

  return { fromKey, toKey, rows };
}

export async function listAuditLogs(options?: {
  action?: string;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const db = getDb();
  const limit = options?.limit ?? 200;

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
      meta: auditLogs.meta,
      createdAt: auditLogs.createdAt,
      actorEmail: users.email,
      actorUsername: users.username,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(options?.action ? eq(auditLogs.action, options.action) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getLeaveBalanceReport() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Yetkisiz");
  }

  const db = getDb();
  const [activeEmployees, yillikLeaves] = await Promise.all([
    db.select().from(employees).where(eq(employees.active, true)),
    db
      .select({
        employeeId: leaveRequests.employeeId,
        status: leaveRequests.status,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
      })
      .from(leaveRequests)
      .where(eq(leaveRequests.type, "yillik")),
  ]);

  const usedByEmp = new Map<string, number>();
  const pendingByEmp = new Map<string, number>();

  for (const row of yillikLeaves) {
    const days = countLeaveDays(row.startDate, row.endDate);
    if (row.status === "onaylandi") {
      usedByEmp.set(
        row.employeeId,
        (usedByEmp.get(row.employeeId) ?? 0) + days
      );
    } else if (row.status === "beklemede") {
      pendingByEmp.set(
        row.employeeId,
        (pendingByEmp.get(row.employeeId) ?? 0) + days
      );
    }
  }

  const rows = activeEmployees
    .map((emp) => {
      const entitlement = getEntitlementDays(emp.hireDate);
      const used = usedByEmp.get(emp.id) ?? 0;
      const pending = pendingByEmp.get(emp.id) ?? 0;
      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        hireDate: emp.hireDate,
        entitlement,
        used,
        remaining: Math.max(0, entitlement - used),
        pending,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const totals = {
    remaining: rows.reduce((s, r) => s + r.remaining, 0),
    pending: rows.reduce((s, r) => s + r.pending, 0),
    used: rows.reduce((s, r) => s + r.used, 0),
  };

  return { rows, totals };
}
