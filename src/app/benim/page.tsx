export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMyAttendance } from "@/lib/actions/attendance";
import {
  fetchLeaveBalance,
  getMyLeaveRequests,
} from "@/lib/actions/leave";
import { getEmployeeMonthHours } from "@/lib/actions/reports";
import {
  LeaveBalanceCard,
  LeaveHistoryList,
} from "@/components/leave-balance-card";
import { EmployeeProfileHeader } from "@/components/employee-profile-header";
import { PhotoUpload } from "@/components/photo-upload";
import { EmployeeEditForm } from "@/components/employee-edit-form";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

export default async function BenimPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const employeeId = session.user.employeeId;
  const shellRole = session.user.role === "admin" ? "admin" : "personel";

  if (!employeeId) {
    return (
      <AppShell role={shellRole} userName={session.user.name || session.user.email}>
        <div className="panel">
          <h1 className="text-xl font-semibold">Hesabınız</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Bu hesaba bağlı personel kaydı yok. Yöneticinizden personel profili
            bağlanmasını isteyin.
          </p>
          <Link href="/takvim" className="btn-outline mt-4 inline-flex">
            İzin takvimine git
          </Link>
        </div>
      </AppShell>
    );
  }

  const db = getDb();
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) redirect("/giris");

  const [records, balance, leaves, monthHours] = await Promise.all([
    getMyAttendance(employeeId),
    fetchLeaveBalance(employeeId),
    getMyLeaveRequests(employeeId),
    getEmployeeMonthHours(employeeId),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRecords = records.filter(
    (r) => new Date(r.recordedAt) >= todayStart
  );
  const last = todayRecords[0];
  const status =
    last?.type === "giris"
      ? "Mesaide"
      : last?.type === "cikis"
        ? "Çıkış yapıldı"
        : "Bugün kayıt yok";

  const name = `${employee.firstName} ${employee.lastName}`;

  return (
    <AppShell role={shellRole} userName={name}>
      <div className="space-y-6">
        <p className="text-sm text-[var(--ink-muted)]">
          Bugün:{" "}
          <span className="font-medium text-[var(--brand)]">{status}</span>
        </p>

        <EmployeeProfileHeader employee={employee} monthHours={monthHours} />

        <LeaveBalanceCard balance={balance} hireDate={employee.hireDate} />

        <div className="grid gap-6 lg:grid-cols-3">
          <PhotoUpload
            employeeId={employee.id}
            photoUrl={employee.photoUrl}
            name={name}
          />
          <div className="lg:col-span-2">
            <EmployeeEditForm employee={employee} mode="self" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <h2 className="mb-2 font-semibold">Mesai girişi</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Kapıdaki QR kodu telefonunuzla okutun. Akşam zorunlu çıkış yok;
              çıkış yapılmazsa sistem otomatik 18:00 kaydı oluşturur.
            </p>
          </section>

          <section className="panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Son izinler</h2>
              <Link href="/takvim" className="btn-primary !py-1.5 !text-xs">
                Takvimden talep et
              </Link>
            </div>
            <LeaveHistoryList leaves={leaves.slice(0, 6)} />
          </section>
        </div>

        <section className="panel">
          <h2 className="mb-4 font-semibold">Mesai geçmişi</h2>
          {records.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Henüz kayıt yok</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm"
                >
                  <span>
                    {format(new Date(r.recordedAt), "d MMM yyyy HH:mm", {
                      locale: tr,
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.type === "giris"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-orange-50 text-orange-700"
                    }`}
                  >
                    {r.type === "giris" ? "Giriş" : "Çıkış"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
