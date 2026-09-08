export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { listEmployees } from "@/lib/actions/employees";
import { listOvertime } from "@/lib/actions/overtime";
import { getOvertimeHourSettings } from "@/lib/actions/settings";
import {
  CreateOvertimeDialog,
  DeleteOvertimeButton,
} from "@/components/overtime-actions";
import { isWeekend } from "@/lib/istanbul-time";
import { format, parseISO } from "date-fns";
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

  const [records, employees, hourSettings] = await Promise.all([
    listOvertime({
      from,
      to,
      employeeId: params.employeeId,
    }),
    listEmployees(),
    getOvertimeHourSettings(),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Fazla mesai</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Hafta içi +{hourSettings.weekday} sa · Hafta sonu +
              {hourSettings.weekend} sa
            </p>
          </div>
          <CreateOvertimeDialog
            employees={employees}
            hourSettings={hourSettings}
          />
        </div>

        <form className="panel grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">
              Başlangıç
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">
              Bitiş
            </label>
            <input type="date" name="to" defaultValue={to} className="field" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">
              Personel
            </label>
            <select
              name="employeeId"
              defaultValue={params.employeeId || ""}
              className="field"
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

        <div className="space-y-2 lg:hidden">
          {records.length === 0 ? (
            <p className="panel text-center text-sm text-[var(--ink-muted)]">
              Kayıt bulunamadı
            </p>
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                className="panel flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                    {format(parseISO(r.day), "d MMM yyyy", { locale: tr })}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand)]">
                      {isWeekend(r.day) ? "Hafta sonu" : "Hafta içi"}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink)]">
                      +{r.hours} sa
                    </span>
                    {r.note ? (
                      <span className="truncate text-xs text-[var(--ink-muted)]">
                        {r.note}
                      </span>
                    ) : null}
                  </div>
                </div>
                <DeleteOvertimeButton id={r.id} />
              </div>
            ))
          )}
        </div>

        <div className="panel table-scroll hidden !p-0 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Saat</th>
                <th className="px-4 py-3 font-medium">Not</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--ink-muted)]"
                  >
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-muted)]">
                      {format(parseISO(r.day), "d MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-4 py-3">
                      {isWeekend(r.day) ? "Hafta sonu" : "Hafta içi"}
                    </td>
                    <td className="px-4 py-3 font-medium">+{r.hours} sa</td>
                    <td className="max-w-48 truncate px-4 py-3 text-[var(--ink-muted)]">
                      {r.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteOvertimeButton id={r.id} />
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
