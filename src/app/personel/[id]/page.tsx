import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getEmployee } from "@/lib/actions/employees";
import { EmployeeQrCard } from "@/components/employee-qr-card";
import { EmployeeEditForm } from "@/components/employee-edit-form";
import {
  LeaveBalanceCard,
  LeaveHistoryList,
} from "@/components/leave-balance-card";
import {
  fetchLeaveBalance,
  getMyLeaveRequests,
} from "@/lib/actions/leave";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function PersonelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const name = `${employee.firstName} ${employee.lastName}`;
  const [balance, leaves] = await Promise.all([
    fetchLeaveBalance(id),
    getMyLeaveRequests(id),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/personel"
            className="text-sm text-[var(--brand)] hover:underline"
          >
            ← Personel listesi
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{name}</h1>
              <p className="text-sm text-[var(--ink-muted)]">
                {[employee.position, employee.department]
                  .filter(Boolean)
                  .join(" · ") || "Profil"}
                {employee.hireDate
                  ? ` · İşe giriş ${format(parseISO(employee.hireDate), "d MMM yyyy", { locale: tr })}`
                  : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                employee.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {employee.active ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LeaveBalanceCard balance={balance} hireDate={employee.hireDate} />
          <div className="panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">İzin geçmişi</h2>
              <Link href="/takvim" className="text-xs text-[var(--brand)] hover:underline">
                Takvimde gör
              </Link>
            </div>
            <LeaveHistoryList leaves={leaves.slice(0, 8)} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <EmployeeEditForm employee={employee} />
          <EmployeeQrCard
            employeeId={employee.id}
            qrToken={employee.qrToken}
            name={name}
          />
        </div>
      </div>
    </AppShell>
  );
}
