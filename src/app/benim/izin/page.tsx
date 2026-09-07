export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  fetchLeaveBalance,
  getMyLeaveRequests,
} from "@/lib/actions/leave";
import {
  LeaveBalanceCard,
  LeaveHistoryList,
} from "@/components/leave-balance-card";
import Link from "next/link";

export default async function BenimIzinPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const shellRole = session.user.role === "admin" ? "admin" : "personel";
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return (
      <AppShell role={shellRole} userName={session.user.name || session.user.email}>
        <div className="panel">
          <p className="text-sm text-[var(--ink-muted)]">
            Personel kaydı bağlı değil.
          </p>
          <Link href="/takvim" className="btn-outline mt-4 inline-flex">
            Takvime git
          </Link>
        </div>
      </AppShell>
    );
  }

  const [leaves, balance] = await Promise.all([
    getMyLeaveRequests(employeeId),
    fetchLeaveBalance(employeeId),
  ]);

  return (
    <AppShell role={shellRole} userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">İzinlerim</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Bakiye ve talepler — yeni talep için takvimi kullanın
            </p>
          </div>
          <Link href="/takvim" className="btn-primary">
            Takvimden talep et
          </Link>
        </div>

        <LeaveBalanceCard balance={balance} />

        <section className="panel">
          <h2 className="mb-4 font-semibold">Tüm talepler</h2>
          <LeaveHistoryList leaves={leaves} />
        </section>
      </div>
    </AppShell>
  );
}
