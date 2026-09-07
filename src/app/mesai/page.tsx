export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { listAttendance } from "@/lib/actions/attendance";
import { listEmployees } from "@/lib/actions/employees";
import {
  ManualAttendanceDialog,
  DeleteAttendanceButton,
} from "@/components/mesai-actions";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function MesaiPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; employeeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = params.from || today;
  const to = params.to || today;

  const [records, employees] = await Promise.all([
    listAttendance({
      from,
      to,
      employeeId: params.employeeId,
    }),
    listEmployees(),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Mesai</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Giriş / çıkış kayıtları
            </p>
          </div>
          <ManualAttendanceDialog employees={employees} />
        </div>

        <form className="panel grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">Başlangıç</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-full border border-[var(--border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">Bitiş</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-full border border-[var(--border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">Personel</label>
            <select
              name="employeeId"
              defaultValue={params.employeeId || ""}
              className="w-full rounded-full border border-[var(--border)] px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Filtrele
            </button>
          </div>
        </form>

        <div className="panel overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Zaman</th>
                <th className="px-4 py-3 font-medium">Yöntem</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.type === "giris"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {r.type === "giris" ? "Giriş" : "Çıkış"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {format(new Date(r.recordedAt), "d MMM yyyy HH:mm", {
                        locale: tr,
                      })}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {r.method === "qr" ? "QR" : "Manuel"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteAttendanceButton id={r.id} />
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
