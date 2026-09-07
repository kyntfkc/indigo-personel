export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMyAttendance } from "@/lib/actions/attendance";
import { MyQr } from "@/components/my-qr";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function BenimPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (session.user.role === "admin" && !session.user.employeeId) {
    // Admin without employee profile can still view empty state
  }

  const employeeId = session.user.employeeId;
  const shellRole = session.user.role === "admin" ? "admin" : "personel";

  if (!employeeId) {
    return (
      <AppShell role={shellRole} userName={session.user.name || session.user.email}>
        <div className="panel">
          <h1 className="text-xl font-semibold">Hesabınız</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Bu hesaba bağlı personel kaydı yok. Yöneticinizden personel profili bağlanmasını isteyin.
          </p>
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

  const records = await getMyAttendance(employeeId);
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
        <div>
          <h1 className="text-2xl font-semibold">Merhaba, {employee.firstName}</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Bugün: <span className="font-medium text-[var(--brand)]">{status}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MyQr token={employee.qrToken} name={name} />

          <section className="panel">
            <h2 className="mb-4 font-semibold">Mesai geçmişi</h2>
            {records.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Henüz kayıt yok</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto">
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
      </div>
    </AppShell>
  );
}
