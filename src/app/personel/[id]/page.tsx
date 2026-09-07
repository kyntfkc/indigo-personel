import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getEmployee } from "@/lib/actions/employees";
import { EmployeeQrCard } from "@/components/employee-qr-card";
import { EmployeeEditForm } from "@/components/employee-edit-form";
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

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <div className="space-y-6">
        <div>
          <Link href="/personel" className="text-sm text-[var(--brand)] hover:underline">
            ← Personel listesi
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{name}</h1>
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
