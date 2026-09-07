export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getMonthlyReport } from "@/lib/actions/reports";

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const report = await getMonthlyReport(year, month);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-sm text-[var(--ink-muted)]">Aylık mesai ve izin özeti</p>
        </div>

        <form className="panel flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">Yıl</label>
            <input
              type="number"
              name="year"
              defaultValue={year}
              className="w-28 rounded-full border border-[var(--border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">Ay</label>
            <select
              name="month"
              defaultValue={month}
              className="rounded-full border border-[var(--border)] px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Göster
          </button>
        </form>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel">
            <p className="text-sm text-[var(--ink-muted)]">Toplam Mesai</p>
            <p className="mt-1 text-3xl font-semibold">{report.totals.totalHours} sa</p>
          </div>
          <div className="panel">
            <p className="text-sm text-[var(--ink-muted)]">Ortalama</p>
            <p className="mt-1 text-3xl font-semibold">{report.totals.avgHours} sa</p>
          </div>
          <div className="panel">
            <p className="text-sm text-[var(--ink-muted)]">İzin Günü</p>
            <p className="mt-1 text-3xl font-semibold">{report.totals.totalLeaveDays}</p>
          </div>
        </div>

        <div className="panel overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 font-medium">Departman</th>
                <th className="px-4 py-3 font-medium">Mesai (sa)</th>
                <th className="px-4 py-3 font-medium">Gün</th>
                <th className="px-4 py-3 font-medium">İzin</th>
              </tr>
            </thead>
            <tbody>
              {report.employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                    Aktif personel yok
                  </td>
                </tr>
              ) : (
                report.employees.map((e) => (
                  <tr key={e.employeeId} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {e.department || "—"}
                    </td>
                    <td className="px-4 py-3">{e.hours}</td>
                    <td className="px-4 py-3">{e.daysPresent}</td>
                    <td className="px-4 py-3">{e.leaveDays}</td>
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
