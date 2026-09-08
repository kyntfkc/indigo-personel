import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { leaveStatusLabels, leaveTypeLabels } from "@/lib/utils-app";

export function LeaveBalanceCard({
  balance,
  hireDate,
}: {
  balance: {
    entitlement: number;
    used: number;
    remaining: number;
    pending: number;
  };
  hireDate?: string | null;
}) {
  return (
    <div className="panel space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">İzin bakiyesi</h2>
          {hireDate && (
            <p className="text-xs text-[var(--ink-muted)]">
              İşe giriş:{" "}
              {format(parseISO(hireDate), "d MMM yyyy", { locale: tr })}
            </p>
          )}
        </div>
        <Link href="/takvim" className="btn-outline shrink-0 !py-1.5 !text-xs">
          Takvim
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--ink-muted)]">Hak</p>
          <p className="text-xl font-semibold">{balance.entitlement}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--ink-muted)]">Kullanılan</p>
          <p className="text-xl font-semibold">{balance.used}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--ink-muted)]">Kalan</p>
          <p className="text-xl font-semibold text-[var(--brand)]">
            {balance.remaining}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--ink-muted)]">Bekleyen</p>
          <p className="text-xl font-semibold">{balance.pending}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">
        Politika: 1 yıl → 14 gün, 5 yıl → 21 gün (takvim günü)
      </p>
    </div>
  );
}

export function LeaveHistoryList({
  leaves,
}: {
  leaves: {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
    note?: string | null;
  }[];
}) {
  if (leaves.length === 0) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">Henüz izin talebi yok.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {leaves.map((l) => (
        <li
          key={l.id}
          className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium">{leaveTypeLabels[l.type] || l.type}</p>
            <p className="text-[var(--ink-muted)]">
              {format(parseISO(l.startDate), "d MMM", { locale: tr })} —{" "}
              {format(parseISO(l.endDate), "d MMM yyyy", { locale: tr })}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              l.status === "beklemede"
                ? "bg-amber-50 text-amber-700"
                : l.status === "onaylandi"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {leaveStatusLabels[l.status] || l.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
