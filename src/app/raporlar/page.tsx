export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { AppShell } from "@/components/app-shell";
import {
  getAbsences,
  getLateArrivals,
  getMonthlyReport,
  listAuditLogs,
} from "@/lib/actions/reports";
import { istanbulDateKey } from "@/lib/istanbul-time";

const tabs = [
  { id: "ozet", label: "Mesai özeti" },
  { id: "gec", label: "Geç giriş" },
  { id: "devamsizlik", label: "Devamsızlık" },
  { id: "audit", label: "Audit log" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    year?: string;
    month?: string;
    from?: string;
    to?: string;
    action?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const params = await searchParams;
  const tab = (tabs.some((t) => t.id === params.tab)
    ? params.tab
    : "ozet") as TabId;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const todayKey = istanbulDateKey();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const fromKey = params.from || monthStart;
  const toKey = params.to || todayKey;

  const [report, late, absences, audits] = await Promise.all([
    tab === "ozet" ? getMonthlyReport(year, month) : Promise.resolve(null),
    tab === "gec" ? getLateArrivals(fromKey, toKey) : Promise.resolve(null),
    tab === "devamsizlik"
      ? getAbsences(fromKey, toKey)
      : Promise.resolve(null),
    tab === "audit"
      ? listAuditLogs({ action: params.action || undefined })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Mesai, geç giriş, devamsızlık ve işlem geçmişi
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/raporlar?tab=${t.id}`}
              className={`tap rounded-full px-4 text-sm font-medium transition sm:py-2 ${
                tab === t.id
                  ? "bg-[var(--brand)] text-white"
                  : "bg-white text-[var(--ink)]/70 hover:bg-[var(--brand-soft)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "ozet" && report && (
          <>
            <form className="panel grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="tab" value="ozet" />
              <div>
                <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                  Yıl
                </label>
                <input
                  type="number"
                  name="year"
                  defaultValue={year}
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                  Ay
                </label>
                <select name="month" defaultValue={month} className="field">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto">
                Göster
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="panel">
                <p className="text-sm text-[var(--ink-muted)]">Toplam Mesai</p>
                <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {report.totals.totalHours} sa
                </p>
              </div>
              <div className="panel">
                <p className="text-sm text-[var(--ink-muted)]">Ortalama</p>
                <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {report.totals.avgHours} sa
                </p>
              </div>
              <div className="panel">
                <p className="text-sm text-[var(--ink-muted)]">İzin Günü</p>
                <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {report.totals.totalLeaveDays}
                </p>
              </div>
            </div>

            <div className="panel table-scroll !p-0">
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
                  {report.employees.map((e) => (
                    <tr
                      key={e.employeeId}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-[var(--ink-muted)]">
                        {e.department || "—"}
                      </td>
                      <td className="px-4 py-3">{e.hours}</td>
                      <td className="px-4 py-3">{e.daysPresent}</td>
                      <td className="px-4 py-3">{e.leaveDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(tab === "gec" || tab === "devamsizlik") && (
          <form className="panel grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <input type="hidden" name="tab" value={tab} />
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                Başlangıç
              </label>
              <input
                type="date"
                name="from"
                defaultValue={fromKey}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                Bitiş
              </label>
              <input
                type="date"
                name="to"
                defaultValue={toKey}
                className="field"
              />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Göster
            </button>
          </form>
        )}

        {tab === "gec" && late && (
          <div className="panel table-scroll !p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--ink-muted)]">
              Mesai başlangıcı: {late.workStart} · {late.rows.length} kayıt
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Personel</th>
                  <th className="px-4 py-3 font-medium">Giriş</th>
                  <th className="px-4 py-3 font-medium">Gecikme</th>
                </tr>
              </thead>
              <tbody>
                {late.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[var(--ink-muted)]"
                    >
                      Geç giriş yok
                    </td>
                  </tr>
                ) : (
                  late.rows.map((r) => (
                    <tr
                      key={`${r.employeeId}-${r.dayKey}`}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(parseISO(r.dayKey), "d MMM yyyy", {
                          locale: tr,
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">
                        {format(new Date(r.checkInAt), "HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-orange-700">
                        {r.lateMinutes} dk
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "devamsizlik" && absences && (
          <div className="panel table-scroll !p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--ink-muted)]">
              Hafta sonu ve resmi tatiller hariç · {absences.rows.length} kayıt
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Personel</th>
                  <th className="px-4 py-3 font-medium">Departman</th>
                </tr>
              </thead>
              <tbody>
                {absences.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-[var(--ink-muted)]"
                    >
                      Devamsızlık yok
                    </td>
                  </tr>
                ) : (
                  absences.rows.map((r) => (
                    <tr
                      key={`${r.employeeId}-${r.dayKey}`}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(parseISO(r.dayKey), "d MMM yyyy", {
                          locale: tr,
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-[var(--ink-muted)]">
                        {r.department || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "audit" && audits && (
          <div className="panel table-scroll !p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Zaman</th>
                  <th className="px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                  <th className="px-4 py-3 font-medium">Özet</th>
                </tr>
              </thead>
              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[var(--ink-muted)]"
                    >
                      Kayıt yok
                    </td>
                  </tr>
                ) : (
                  audits.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-muted)]">
                        {format(new Date(a.createdAt), "d MMM HH:mm", {
                          locale: tr,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {a.actorEmail || a.actorUsername || "Sistem"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {a.action}
                      </td>
                      <td className="max-w-72 px-4 py-3">{a.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
