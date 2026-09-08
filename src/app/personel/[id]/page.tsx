import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getEmployee } from "@/lib/actions/employees";
import { EmployeeEditForm } from "@/components/employee-edit-form";
import { EmployeeProfileHeader } from "@/components/employee-profile-header";
import { PhotoUpload } from "@/components/photo-upload";
import {
  LeaveBalanceCard,
  LeaveHistoryList,
} from "@/components/leave-balance-card";
import {
  fetchLeaveBalance,
  getMyLeaveRequests,
} from "@/lib/actions/leave";
import { getEmployeeMonthHours } from "@/lib/actions/reports";
import Link from "next/link";

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
  const [balance, leaves, monthHours] = await Promise.all([
    fetchLeaveBalance(id),
    getMyLeaveRequests(id),
    getEmployeeMonthHours(id),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <Link
          href="/personel"
          className="tap -ml-1 text-sm text-[var(--brand)] hover:underline"
        >
          ← Personel listesi
        </Link>

        <EmployeeProfileHeader
          employee={employee}
          monthHours={monthHours}
          showNotes
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <LeaveBalanceCard balance={balance} hireDate={employee.hireDate} />
          <div className="panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">İzin geçmişi</h2>
              <Link
                href="/takvim"
                className="tap shrink-0 text-xs text-[var(--brand)] hover:underline"
              >
                Takvimde gör
              </Link>
            </div>
            <LeaveHistoryList leaves={leaves.slice(0, 8)} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PhotoUpload
            employeeId={employee.id}
            photoUrl={employee.photoUrl}
            name={name}
          />
          <div className="lg:col-span-2">
            <EmployeeEditForm employee={employee} mode="admin" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
