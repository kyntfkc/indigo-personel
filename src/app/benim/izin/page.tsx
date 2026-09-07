export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getMyLeaveRequests } from "@/lib/actions/leave";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { leaveStatusLabels, leaveTypeLabels } from "@/lib/utils-app";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function BenimIzinPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const employeeId = session.user.employeeId;
  if (!employeeId) {
    return (
      <AppShell role="personel" userName={session.user.name || session.user.email}>
        <div className="panel">
          <p className="text-sm text-[var(--ink-muted)]">
            Personel kaydı bağlı değil.
          </p>
        </div>
      </AppShell>
    );
  }

  const leaves = await getMyLeaveRequests(employeeId);

  return (
    <AppShell role="personel" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">İzinlerim</h1>
          <p className="text-sm text-[var(--ink-muted)]">Talep oluşturun ve durumu takip edin</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LeaveRequestForm />

          <section className="panel">
            <h2 className="mb-4 font-semibold">Geçmiş talepler</h2>
            {leaves.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Henüz talep yok</p>
            ) : (
              <ul className="space-y-3">
                {leaves.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-xl border border-[var(--border)] px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{leaveTypeLabels[l.type]}</p>
                        <p className="text-[var(--ink-muted)]">
                          {format(new Date(l.startDate), "d MMM", { locale: tr })} —{" "}
                          {format(new Date(l.endDate), "d MMM yyyy", { locale: tr })}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          l.status === "beklemede"
                            ? "bg-amber-50 text-amber-700"
                            : l.status === "onaylandi"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {leaveStatusLabels[l.status]}
                      </span>
                    </div>
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
