import Image from "next/image";
import { differenceInYears, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { Employee } from "@/lib/db/schema";
import { Mail, Phone, ShieldAlert, Clock } from "lucide-react";

function tenureYears(hireDate: string | null | undefined) {
  if (!hireDate) return null;
  const hire = parseISO(hireDate);
  if (Number.isNaN(hire.getTime())) return null;
  return Math.max(0, differenceInYears(new Date(), hire));
}

export function EmployeeProfileHeader({
  employee,
  monthHours,
  showNotes = false,
}: {
  employee: Employee;
  monthHours: { hours: number; daysPresent: number; month: number; year: number };
  showNotes?: boolean;
}) {
  const name = `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  const years = tenureYears(employee.hireDate);
  const monthLabel = format(
    new Date(monthHours.year, monthHours.month - 1, 1),
    "MMMM",
    { locale: tr }
  );

  return (
    <div className="panel">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative mx-auto size-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--brand)] bg-[var(--brand-soft)] sm:mx-0">
          {employee.photoUrl ? (
            <Image
              src={employee.photoUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl font-semibold text-[var(--brand)]">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-semibold text-[var(--ink)]">{name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                employee.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {employee.active ? "Aktif" : "Pasif"}
            </span>
          </div>

          <p className="text-sm text-[var(--ink-muted)]">
            {[employee.position, employee.department].filter(Boolean).join(" · ") ||
              "Pozisyon belirtilmemiş"}
            {employee.hireDate
              ? ` · İşe giriş ${format(parseISO(employee.hireDate), "d MMM yyyy", { locale: tr })}`
              : ""}
            {years !== null ? ` · ${years} yıl kıdem` : ""}
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm text-[var(--ink-muted)] sm:justify-start">
            {employee.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 text-[var(--brand)]" />
                {employee.email}
              </span>
            )}
            {employee.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-[var(--brand)]" />
                {employee.phone}
              </span>
            )}
            {employee.emergencyContact && (
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-[var(--brand)]" />
                Acil: {employee.emergencyContact}
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-sm font-medium text-[var(--ink)]">
            <Clock className="size-4 text-[var(--brand)]" />
            Bu ay ({monthLabel}): {monthHours.hours} sa · {monthHours.daysPresent} gün
          </div>

          {showNotes && employee.notes && (
            <div className="rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-left text-sm">
              <p className="mb-0.5 text-xs font-medium text-[var(--ink-muted)]">
                Admin notu
              </p>
              <p className="text-[var(--ink)]">{employee.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
