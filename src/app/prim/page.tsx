export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { listEmployees } from "@/lib/actions/employees";
import { listPayments } from "@/lib/actions/payments";
import {
  PAYMENT_LABELS,
  isPaymentType,
  type PaymentType,
} from "@/lib/payment-labels";
import {
  CreatePaymentDialog,
  DeletePaymentButton,
} from "@/components/payment-actions";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

function formatTry(amount: string | number) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(n);
}

function monthRange(dayKey: string) {
  const [y, m] = dayKey.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export default async function PrimPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    employeeId?: string;
    type?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaults = monthRange(today);
  const from = params.from || defaults.from;
  const to = params.to || defaults.to;
  const type = params.type && isPaymentType(params.type) ? params.type : undefined;

  const [records, employees] = await Promise.all([
    listPayments({
      from,
      to,
      employeeId: params.employeeId,
      type,
    }),
    listEmployees(),
  ]);

  const total = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPrim = records
    .filter((r) => r.type === "prim")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalMesai = records
    .filter((r) => r.type === "mesai")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAvans = records
    .filter((r) => r.type === "avans")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Prim / Mesai / Avans</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Ödenen prim, fazla mesai ücreti ve avans
            </p>
          </div>
          <CreatePaymentDialog employees={employees} />
        </div>

        <form className="panel grid gap-3 sm:grid-cols-5">
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
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-muted)]">
              Tür
            </label>
            <select name="type" defaultValue={type || ""} className="field">
              <option value="">Tümü</option>
              <option value="prim">Prim</option>
              <option value="mesai">Fazla mesai ücreti</option>
              <option value="avans">Avans</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Filtrele
            </button>
          </div>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel">
            <p className="text-xs text-[var(--ink-muted)]">Toplam</p>
            <p className="mt-1 text-xl font-semibold">{formatTry(total)}</p>
          </div>
          <div className="panel">
            <p className="text-xs text-[var(--ink-muted)]">Prim</p>
            <p className="mt-1 text-xl font-semibold">{formatTry(totalPrim)}</p>
          </div>
          <div className="panel">
            <p className="text-xs text-[var(--ink-muted)]">Fazla mesai ücreti</p>
            <p className="mt-1 text-xl font-semibold">{formatTry(totalMesai)}</p>
          </div>
          <div className="panel">
            <p className="text-xs text-[var(--ink-muted)]">Avans</p>
            <p className="mt-1 text-xl font-semibold">{formatTry(totalAvans)}</p>
          </div>
        </div>

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
                      {PAYMENT_LABELS[r.type as PaymentType]}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink)]">
                      {formatTry(r.amount)}
                    </span>
                    {r.note ? (
                      <span className="truncate text-xs text-[var(--ink-muted)]">
                        {r.note}
                      </span>
                    ) : null}
                  </div>
                </div>
                <DeletePaymentButton id={r.id} />
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
                <th className="px-4 py-3 font-medium">Tutar</th>
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
                      {PAYMENT_LABELS[r.type as PaymentType]}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatTry(r.amount)}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-[var(--ink-muted)]">
                      {r.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeletePaymentButton id={r.id} />
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
