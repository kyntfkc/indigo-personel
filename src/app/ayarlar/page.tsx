export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { AppShell } from "@/components/app-shell";
import { AdminCreateForm } from "@/components/admin-create-form";
import {
  HolidaysPanel,
  WorkStartForm,
} from "@/components/settings-work-holidays";
import {
  getWorkStartTime,
  listAdmins,
  listHolidays,
} from "@/lib/actions/settings";

export default async function AyarlarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const [admins, workStart, holidays] = await Promise.all([
    listAdmins(),
    getWorkStartTime(),
    listHolidays(),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--ink)]">Ayarlar</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Yönetici, mesai saati ve resmi tatiller
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkStartForm workStart={workStart} />
          <HolidaysPanel holidays={holidays} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCreateForm />

          <section className="panel">
            <h2 className="mb-4 font-semibold">Mevcut adminler</h2>
            {admins.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Admin yok</p>
            ) : (
              <ul className="space-y-2">
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-muted)] px-3 py-2.5 text-sm"
                  >
                    <span className="truncate font-medium">
                      {admin.email || "—"}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                      {format(new Date(admin.createdAt), "d MMM yyyy", {
                        locale: tr,
                      })}
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
