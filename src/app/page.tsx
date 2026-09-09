export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { needsSetup } from "@/lib/actions/setup";
import { AppShell } from "@/components/app-shell";
import { getTodayAttendanceSummary } from "@/lib/actions/attendance";
import { getPendingLeaveCount } from "@/lib/actions/leave";
import { getEmployeeCount, listEmployees } from "@/lib/actions/employees";
import { getLateArrivals } from "@/lib/actions/reports";
import { formatIstanbulHm, formatLateMinutes, istanbulDateKey } from "@/lib/istanbul-time";
import { Clock, Users, CalendarDays, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { LateArrivalDialog, ManualAttendanceDialog } from "@/components/mesai-actions";

export default async function DashboardPage() {
  try {
    if (await needsSetup()) redirect("/kurulum");
  } catch {
    redirect("/kurulum");
  }

  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (session.user.role !== "admin") redirect("/benim");

  const todayKey = istanbulDateKey();
  const [summary, pendingLeave, employeeCount, lateToday, employees] =
    await Promise.all([
      getTodayAttendanceSummary(),
      getPendingLeaveCount(),
      getEmployeeCount(),
      getLateArrivals(todayKey, todayKey),
      listEmployees(),
    ]);

  const cards = [
    {
      label: "Aktif Personel",
      value: employeeCount,
      icon: Users,
      href: "/personel",
    },
    {
      label: "Bugün Giriş",
      value: summary.checkedInCount,
      icon: UserCheck,
      href: "/raporlar",
    },
    {
      label: "Geç Kalan",
      value: lateToday.rows.length,
      icon: Clock,
      href: "/raporlar?tab=gec",
    },
    {
      label: "Bekleyen İzin",
      value: pendingLeave,
      icon: CalendarDays,
      href: "/izin",
    },
  ];

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Dashboard</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="panel transition hover:border-[var(--brand)] active:bg-[var(--brand-soft)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--ink-muted)] sm:text-sm">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                    {value}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-[var(--brand-soft)] p-2 text-[var(--brand)] sm:p-2.5">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--ink)]">Geç Kalanlar</h2>
              <div className="flex shrink-0 items-center gap-2">
                <LateArrivalDialog employees={employees} />
                <Link
                  href="/raporlar?tab=gec"
                  className="tap shrink-0 text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Tümünü gör
                </Link>
              </div>
            </div>
            {lateToday.rows.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Bugün geç giriş yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {lateToday.rows.map((row) => (
                  <li
                    key={`${row.employeeId}-${row.dayKey}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-muted)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-[var(--ink-muted)]">
                        {row.department || "—"} ·{" "}
                        {formatIstanbulHm(row.checkInAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                      {formatLateMinutes(row.lateMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--ink)]">Bugünkü Kayıtlar</h2>
              <ManualAttendanceDialog employees={employees} />
            </div>
            {summary.records.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Henüz kayıt yok.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain">
                {summary.records.slice(0, 15).map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {formatIstanbulHm(row.recordedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.type === "giris"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {row.type === "giris" ? "Giriş" : "Çıkış"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
