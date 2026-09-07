"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  addFrozenDate,
  createLeaveRequest,
  removeFrozenDate,
} from "@/lib/actions/leave";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { leaveTypeLabels } from "@/lib/utils-app";

export type CalendarLeave = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  note: string | null;
  employeeId: string;
  firstName: string;
  lastName: string;
};

export type CalendarFrozen = {
  id: string;
  date: string;
  reason: string | null;
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function dateInRange(day: Date, start: string, end: string) {
  const key = format(day, "yyyy-MM-dd");
  return key >= start && key <= end;
}

export function LeaveCalendar({
  initialLeaves,
  initialFrozen,
  isAdmin,
  employeeId,
  balance,
}: {
  initialLeaves: CalendarLeave[];
  initialFrozen: CalendarFrozen[];
  isAdmin: boolean;
  employeeId: string | null;
  balance: { entitlement: number; used: number; remaining: number; pending: number };
}) {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [freezeDate, setFreezeDate] = useState("");
  const [freezeReason, setFreezeReason] = useState("");

  const frozenSet = useMemo(
    () => new Set(initialFrozen.map((f) => f.date)),
    [initialFrozen]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  function onDayClick(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    if (frozenSet.has(key)) {
      toast.error("Bu gün dondurulmuş, izin alınamaz");
      return;
    }
    if (!employeeId && !isAdmin) {
      toast.error("Personel kaydınız bağlı değil");
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(key);
      setRangeEnd(null);
      return;
    }

    if (key < rangeStart) {
      setRangeStart(key);
      setRangeEnd(rangeStart);
    } else {
      setRangeEnd(key);
    }
    setDialogOpen(true);
  }

  function isSelected(day: Date) {
    if (!rangeStart) return false;
    const key = format(day, "yyyy-MM-dd");
    const end = rangeEnd || rangeStart;
    return key >= rangeStart && key <= end;
  }

  async function submitLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rangeStart) return;
    const form = new FormData(e.currentTarget);
    form.set("startDate", rangeStart);
    form.set("endDate", rangeEnd || rangeStart);
    if (employeeId) form.set("employeeId", employeeId);

    startTransition(async () => {
      const result = await createLeaveRequest(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("İzin talebi gönderildi");
      setDialogOpen(false);
      setRangeStart(null);
      setRangeEnd(null);
      router.refresh();
    });
  }

  async function submitFreeze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData();
    form.set("date", freezeDate);
    form.set("reason", freezeReason);
    startTransition(async () => {
      const result = await addFrozenDate(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Gün donduruldu");
      setFreezeDate("");
      setFreezeReason("");
      router.refresh();
    });
  }

  const field =
    "w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand)]";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">İzin hakkı</p>
          <p className="mt-1 text-2xl font-semibold">{balance.entitlement} gün</p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Kullanılan</p>
          <p className="mt-1 text-2xl font-semibold">{balance.used} gün</p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Kalan</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--brand)]">
            {balance.remaining} gün
          </p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Bekleyen</p>
          <p className="mt-1 text-2xl font-semibold">{balance.pending} gün</p>
        </div>
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-outline !px-3"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="text-lg font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: tr })}
          </h2>
          <button
            type="button"
            className="btn-outline !px-3"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-[var(--ink-muted)]">
          İzin için iki tarih seçin (başlangıç → bitiş). Dondurulmuş günler kilitlidir.
        </p>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--ink-muted)]">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const frozen = frozenSet.has(key);
            const inMonth = isSameMonth(day, month);
            const selected = isSelected(day);
            const dayLeaves = initialLeaves.filter((l) =>
              dateInRange(day, l.startDate, l.endDate)
            );

            return (
              <button
                key={key}
                type="button"
                disabled={frozen}
                onClick={() => onDayClick(day)}
                className={`min-h-[88px] rounded-xl border p-1.5 text-left transition ${
                  frozen
                    ? "cursor-not-allowed border-dashed border-gray-300 bg-gray-100 opacity-80"
                    : selected
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--border)] bg-white hover:border-[var(--brand)]"
                } ${!inMonth ? "opacity-40" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isSameDay(day, new Date())
                        ? "text-[var(--brand)]"
                        : "text-[var(--ink)]"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {frozen && <Lock className="size-3 text-gray-500" />}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayLeaves.slice(0, 3).map((l) => (
                    <span
                      key={l.id}
                      title={`${l.firstName} ${l.lastName}`}
                      className={`rounded px-1 text-[10px] font-medium ${
                        l.status === "onaylandi"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {initials(l.firstName, l.lastName)}
                    </span>
                  ))}
                  {dayLeaves.length > 3 && (
                    <span className="text-[10px] text-[var(--ink-muted)]">
                      +{dayLeaves.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Onaylı
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> Bekleyen
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> Dondurulmuş
          </span>
        </div>
      </div>

      {isAdmin && (
        <div className="panel space-y-4">
          <h3 className="font-semibold">Dondurulmuş günler</h3>
          <form onSubmit={submitFreeze} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">Tarih</label>
              <input
                type="date"
                required
                value={freezeDate}
                onChange={(e) => setFreezeDate(e.target.value)}
                className={field}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">Neden</label>
              <input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Örn. Yoğun sezon"
                className={field}
              />
            </div>
            <button type="submit" disabled={pending} className="btn-primary">
              Dondur
            </button>
          </form>

          {initialFrozen.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Henüz dondurulmuş gün yok.</p>
          ) : (
            <ul className="space-y-2">
              {initialFrozen.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {format(parseISO(f.date), "d MMM yyyy", { locale: tr })}
                    </span>
                    {f.reason && (
                      <span className="ml-2 text-[var(--ink-muted)]">{f.reason}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => {
                      startTransition(async () => {
                        await removeFrozenDate(f.id);
                        toast.success("Kaldırıldı");
                        router.refresh();
                      });
                    }}
                  >
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setRangeStart(null);
            setRangeEnd(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>İzin talebi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--ink-muted)]">
            {rangeStart &&
              format(parseISO(rangeStart), "d MMM yyyy", { locale: tr })}
            {rangeEnd && rangeEnd !== rangeStart
              ? ` — ${format(parseISO(rangeEnd), "d MMM yyyy", { locale: tr })}`
              : ""}
          </p>
          <form onSubmit={submitLeave} className="space-y-3">
            {isAdmin && !employeeId && (
              <p className="text-sm text-amber-700">
                Admin olarak talep için personel hesabınız bağlı olmalı veya personel
                profilinden işlem yapın.
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm">Tip</label>
              <select name="type" required className={field} defaultValue="yillik">
                <option value="yillik">{leaveTypeLabels.yillik}</option>
                <option value="hastalik">{leaveTypeLabels.hastalik}</option>
                <option value="mazeret">{leaveTypeLabels.mazeret}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Not</label>
              <input name="note" className={field} />
            </div>
            <button
              type="submit"
              disabled={pending || (!employeeId && isAdmin)}
              className="btn-primary w-full"
            >
              {pending ? "Gönderiliyor..." : "Talep gönder"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
