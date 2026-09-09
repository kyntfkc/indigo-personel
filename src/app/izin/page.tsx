export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { listLeaveRequests } from "@/lib/actions/leave";
import { listEmployees } from "@/lib/actions/employees";
import { LeaveReviewButtons } from "@/components/leave-review-buttons";
import { CreateAdminLeaveDialog } from "@/components/admin-leave-dialog";
import { leaveStatusLabels, leaveTypeLabels } from "@/lib/utils-app";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

export default async function IzinPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const { status } = await searchParams;
  const [rows, employees] = await Promise.all([
    listLeaveRequests(status || undefined),
    listEmployees(),
  ]);

  const tabs = [
    { value: "", label: "Tümü" },
    { value: "beklemede", label: "Bekleyen" },
    { value: "onaylandi", label: "Onaylı" },
    { value: "reddedildi", label: "Red" },
  ];

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">İzin Yönetimi</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Manuel izin ekleyin veya talepleri onaylayın
            </p>
          </div>
          <CreateAdminLeaveDialog employees={employees} />
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.value || "all"}
              href={t.value ? `/izin?status=${t.value}` : "/izin"}
              className={`tap rounded-full px-4 text-sm font-medium sm:py-1.5 ${
                (status || "") === t.value
                  ? "bg-[var(--brand)] text-white"
                  : "bg-white text-[var(--ink-muted)] border border-[var(--border)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Mobil: kart listesi. İşlem butonları tabloda sığmıyor. */}
        <div className="space-y-2 lg:hidden">
          {rows.length === 0 ? (
            <p className="panel text-center text-sm text-[var(--ink-muted)]">
              Talep yok
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="panel space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-[var(--ink)]">
                    {r.firstName} {r.lastName}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "beklemede"
                        ? "bg-amber-50 text-amber-700"
                        : r.status === "onaylandi"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {leaveStatusLabels[r.status]}
                  </span>
                </div>
                <p className="text-sm text-[var(--ink-muted)]">
                  {leaveTypeLabels[r.type]} ·{" "}
                  {format(new Date(r.startDate), "d MMM", { locale: tr })} —{" "}
                  {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                </p>
                {r.note && (
                  <p className="text-sm text-[var(--ink-muted)]">{r.note}</p>
                )}
                {r.status === "beklemede" && <LeaveReviewButtons id={r.id} />}
              </div>
            ))
          )}
        </div>

        <div className="panel table-scroll hidden !p-0 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                    Talep yok
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {r.firstName} {r.lastName}
                      </p>
                      {r.note && (
                        <p className="text-xs text-[var(--ink-muted)]">{r.note}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{leaveTypeLabels[r.type]}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-muted)]">
                      {format(new Date(r.startDate), "d MMM", { locale: tr })} —{" "}
                      {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.status === "beklemede"
                            ? "bg-amber-50 text-amber-700"
                            : r.status === "onaylandi"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {leaveStatusLabels[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "beklemede" ? (
                        <LeaveReviewButtons id={r.id} />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
