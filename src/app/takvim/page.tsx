import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeaveCalendar } from "@/components/leave-calendar";
import {
  getCalendarLeaveData,
  fetchLeaveBalance,
  listFrozenDates,
} from "@/lib/actions/leave";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
} from "date-fns";

export const dynamic = "force-dynamic";

export default async function TakvimPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const now = new Date();
  const from = format(
    startOfWeek(startOfMonth(subMonths(now, 1)), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const to = format(
    endOfWeek(endOfMonth(addMonths(now, 2)), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const [{ leaves, frozen, holidays }, allFrozen] = await Promise.all([
    getCalendarLeaveData(from, to),
    listFrozenDates(),
  ]);

  const employeeId = session.user.employeeId ?? null;
  const balance = employeeId
    ? await fetchLeaveBalance(employeeId)
    : { entitlement: 0, used: 0, remaining: 0, pending: 0 };

  const shellRole = session.user.role === "admin" ? "admin" : "personel";

  return (
    <AppShell role={shellRole} userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">İzin Takvimi</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Herkesin izinlerini görün, takvimden talep oluşturun
          </p>
        </div>
        <LeaveCalendar
          initialLeaves={leaves}
          initialFrozen={allFrozen.length ? allFrozen : frozen}
          initialHolidays={holidays}
          isAdmin={session.user.role === "admin"}
          employeeId={employeeId}
          balance={balance}
        />
      </div>
    </AppShell>
  );
}
