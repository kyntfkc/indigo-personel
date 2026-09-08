export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { listEmployees } from "@/lib/actions/employees";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
import Link from "next/link";
import { QrCode } from "lucide-react";

export default async function PersonelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const { q } = await searchParams;
  const employees = await listEmployees(q);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Personel</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              {employees.length} kayıt
            </p>
          </div>
          <EmployeeCreateDialog />
        </div>

        <form className="panel !py-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Ara: ad, departman, e-posta..."
            className="field"
          />
        </form>

        {/* Mobil: dokunulabilir kart listesi. */}
        <div className="space-y-2 lg:hidden">
          {employees.length === 0 ? (
            <p className="panel text-center text-sm text-[var(--ink-muted)]">
              Henüz personel yok. İlk kaydı ekleyin.
            </p>
          ) : (
            employees.map((e) => (
              <Link
                key={e.id}
                href={`/personel/${e.id}`}
                className="panel flex items-center justify-between gap-3 transition active:bg-[var(--brand-soft)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="truncate text-sm text-[var(--ink-muted)]">
                    {e.department || "Departman yok"}
                  </p>
                  {e.email && (
                    <p className="truncate text-xs text-[var(--ink-muted)]">
                      {e.email}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    e.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {e.active ? "Aktif" : "Pasif"}
                </span>
              </Link>
            ))
          )}
        </div>

        <div className="panel table-scroll hidden !p-0 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Departman</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                    Henüz personel yok. İlk kaydı ekleyin.
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/personel/${e.id}`}
                        className="font-medium text-[var(--ink)] hover:text-[var(--brand)]"
                      >
                        {e.firstName} {e.lastName}
                      </Link>
                      {e.email && (
                        <p className="text-xs text-[var(--ink-muted)]">{e.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {e.department || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {e.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/personel/${e.id}`}
                        className="tap text-[var(--brand)] hover:underline"
                      >
                        <QrCode className="h-4 w-4" />
                        Detay
                      </Link>
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
