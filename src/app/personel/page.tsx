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
            className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </form>

        <div className="panel overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Departman</th>
                <th className="px-4 py-3 font-medium">Pozisyon</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
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
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {e.position || "—"}
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
                        className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"
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
