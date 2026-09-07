export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { needsSetup } from "@/lib/actions/setup";
import { AppShell } from "@/components/app-shell";
import { getTodayAttendanceSummary } from "@/lib/actions/attendance";
import { getPendingLeaveCount } from "@/lib/actions/leave";
import { getEmployeeCount } from "@/lib/actions/employees";
import { Clock, Users, CalendarDays, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

export default async function DashboardPage() {
  try {
    if (await needsSetup()) redirect("/kurulum");
  } catch {
    redirect("/kurulum");
  }

  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (session.user.role !== "admin") redirect("/benim");

  const [summary, pendingLeave, employeeCount] = await Promise.all([
    getTodayAttendanceSummary(),
    getPendingLeaveCount(),
    getEmployeeCount(),
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
      href: "/mesai",
    },
    {
      label: "Açık Mesai",
      value: summary.openCount,
      icon: Clock,
      href: "/mesai",
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, href }) => (
            <Link key={label} href={href} className="panel transition hover:border-[var(--brand)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 text-3xl font-semibold text-[var(--ink)]">{value}</p>
                </div>
                <div className="rounded-full bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[var(--ink)]">Açık Mesailer</h2>
              <Link href="/kiosk" className="btn-primary !py-1.5 !text-xs">
                Kapı QR
              </Link>
            </div>
            {summary.open.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Şu an açık mesai yok.</p>
            ) : (
              <ul className="space-y-2">
                {summary.open.map((row) => (
                  <li
                    key={row.employeeId}
                    className="flex items-center justify-between rounded-xl bg-[var(--bg-muted)] px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {row.department || "—"}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--brand)]">
                      {format(new Date(row.recordedAt), "HH:mm")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="mb-4 font-semibold text-[var(--ink)]">Bugünkü Kayıtlar</h2>
            {summary.records.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Henüz kayıt yok.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {summary.records.slice(0, 15).map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {format(new Date(row.recordedAt), "HH:mm")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
