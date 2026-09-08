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
  restoreFrozenDate,
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
  startDate: string;
  endDate: string;
  reason: string | null;
};

export type CalendarHoliday = {
  id: string;
  date: string;
  name: string;
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
  initialHolidays = [],
  isAdmin,
  employeeId,
  balance,
}: {
  initialLeaves: CalendarLeave[];
  initialFrozen: CalendarFrozen[];
  initialHolidays?: CalendarHoliday[];
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
  const [freezeStart, setFreezeStart] = useState("");
  const [freezeEnd, setFreezeEnd] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [pendingFrozenDelete, setPendingFrozenDelete] =
    useState<CalendarFrozen | null>(null);

  const frozenSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of initialFrozen) {
      const days = eachDayOfInterval({
        start: parseISO(f.startDate),
        end: parseISO(f.endDate),
      });
      for (const d of days) set.add(format(d, "yyyy-MM-dd"));
    }
    return set;
  }, [initialFrozen]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of initialHolidays) map.set(h.date, h.name);
    return map;
  }, [initialHolidays]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  // Mobilde hücrelere sığmayan bilgiler (isimler, tatil adları) altta listelenir.
  const monthEntries = useMemo(() => {
    const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

    const holidayEntries = initialHolidays
      .filter((h) => h.date >= monthStart && h.date <= monthEnd)
      .map((h) => ({
        kind: "holiday" as const,
        id: `h-${h.id}`,
        sortDate: h.date,
        holiday: h,
      }));

    const leaveEntries = initialLeaves
      .filter((l) => l.startDate <= monthEnd && l.endDate >= monthStart)
      .map((l) => ({
        kind: "leave" as const,
        id: `l-${l.id}`,
        sortDate: l.startDate,
        leave: l,
      }));

    return [...holidayEntries, ...leaveEntries].sort((a, b) =>
      a.sortDate.localeCompare(b.sortDate)
    );
  }, [month, initialHolidays, initialLeaves]);

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
    form.set("startDate", freezeStart);
    form.set("endDate", freezeEnd || freezeStart);
    form.set("reason", freezeReason);
    startTransition(async () => {
      const result = await addFrozenDate(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tarih aralığı donduruldu");
      setFreezeStart("");
      setFreezeEnd("");
      setFreezeReason("");
      router.refresh();
    });
  }

  const field = "field";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">İzin hakkı</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl">
            {balance.entitlement} gün
          </p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Kullanılan</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl">
            {balance.used} gün
          </p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Kalan</p>
          <p className="mt-1 text-xl font-semibold text-[var(--brand)] sm:text-2xl">
            {balance.remaining} gün
          </p>
        </div>
        <div className="panel">
          <p className="text-xs text-[var(--ink-muted)]">Bekleyen</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl">
            {balance.pending} gün
          </p>
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
          <h2 className="truncate text-base font-semibold capitalize sm:text-lg">
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
          İzin için iki tarih seçin (başlangıç → bitiş). Dondurulmuş günler
          kilitlidir; resmi tatiller görseldir, aralığa dahil edilebilir.
        </p>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--ink-muted)] sm:text-xs">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Mobil: kompakt ızgara. Detaylar hücreye sığmadığı için altta listelenir. */}
        <div className="grid grid-cols-7 gap-1 lg:hidden">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const frozen = frozenSet.has(key);
            const holidayName = holidayMap.get(key);
            const inMonth = isSameMonth(day, month);
            const selected = isSelected(day);
            const dayLeaves = initialLeaves.filter((l) =>
              dateInRange(day, l.startDate, l.endDate)
            );
            const hasApproved = dayLeaves.some((l) => l.status === "onaylandi");
            const hasPending = dayLeaves.some((l) => l.status !== "onaylandi");

            return (
              <button
                key={key}
                type="button"
                disabled={frozen}
                onClick={() => onDayClick(day)}
                aria-label={[
                  format(day, "d MMMM yyyy", { locale: tr }),
                  holidayName,
                  frozen ? "dondurulmuş" : null,
                  dayLeaves.length ? `${dayLeaves.length} izin` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border transition ${
                  frozen
                    ? "cursor-not-allowed border-dashed border-gray-300 bg-gray-100"
                    : selected
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                      : holidayName
                        ? "border-[var(--brand)]/40 bg-[var(--brand-soft)] active:bg-[var(--brand-soft)]"
                        : "border-[var(--border)] bg-white active:bg-[var(--brand-soft)]"
                } ${!inMonth ? "opacity-40" : ""}`}
              >
                <span
                  className={`text-sm font-semibold ${
                    selected
                      ? "text-white"
                      : isSameDay(day, new Date())
                        ? "text-[var(--brand)]"
                        : "text-[var(--ink)]"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <span className="mt-0.5 flex h-2 items-center gap-0.5">
                  {frozen && <Lock className="size-2.5 text-gray-500" />}
                  {holidayName && (
                    <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                  )}
                  {hasApproved && (
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                  )}
                  {hasPending && (
                    <span className="size-1.5 rounded-full bg-amber-500" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden grid-cols-7 gap-1 lg:grid">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const frozen = frozenSet.has(key);
            const holidayName = holidayMap.get(key);
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
                title={holidayName || undefined}
                onClick={() => onDayClick(day)}
                className={`min-h-[88px] rounded-xl border p-1.5 text-left transition ${
                  frozen
                    ? "cursor-not-allowed border-dashed border-gray-300 bg-gray-100 opacity-80"
                    : selected
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : holidayName
                        ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]/60 hover:border-[var(--brand)]"
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
                {holidayName && (
                  <p className="mb-1 truncate text-[10px] font-medium text-[var(--brand)]">
                    {holidayName}
                  </p>
                )}
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
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--brand)]/50" /> Resmi tatil
          </span>
        </div>

        {/* Mobilde isimler ve tatil adları yalnızca burada okunabilir. */}
        <div className="mt-4 border-t border-[var(--border)] pt-4 lg:hidden">
          <h3 className="mb-2 text-sm font-semibold capitalize">
            {format(month, "MMMM", { locale: tr })} ayrıntıları
          </h3>
          {monthEntries.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Bu ay izin veya resmi tatil yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {monthEntries.map((entry) =>
                entry.kind === "holiday" ? (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 rounded-xl bg-[var(--brand-soft)] px-3 py-2 text-sm"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand)]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink)]">
                        {entry.holiday.name}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {format(parseISO(entry.holiday.date), "d MMMM EEEE", {
                          locale: tr,
                        })}
                      </p>
                    </div>
                  </li>
                ) : (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        entry.leave.status === "onaylandi"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {entry.leave.firstName} {entry.leave.lastName}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {leaveTypeLabels[entry.leave.type] || entry.leave.type} ·{" "}
                        {format(parseISO(entry.leave.startDate), "d MMM", {
                          locale: tr,
                        })}
                        {entry.leave.endDate !== entry.leave.startDate
                          ? ` — ${format(parseISO(entry.leave.endDate), "d MMM", { locale: tr })}`
                          : ""}
                      </p>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="panel space-y-4">
          <h3 className="font-semibold">Dondurulmuş günler</h3>
          <form
            onSubmit={submitFreeze}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                Başlangıç
              </label>
              <input
                type="date"
                required
                value={freezeStart}
                onChange={(e) => {
                  setFreezeStart(e.target.value);
                  if (!freezeEnd || freezeEnd < e.target.value) {
                    setFreezeEnd(e.target.value);
                  }
                }}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                Bitiş
              </label>
              <input
                type="date"
                required
                value={freezeEnd}
                min={freezeStart || undefined}
                onChange={(e) => setFreezeEnd(e.target.value)}
                className={field}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-xs text-[var(--ink-muted)]">
                Neden
              </label>
              <input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Örn. Yoğun sezon"
                className={field}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
            >
              Dondur
            </button>
          </form>

          {initialFrozen.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Henüz dondurulmuş gün yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialFrozen.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">
                      {format(parseISO(f.startDate), "d MMM yyyy", {
                        locale: tr,
                      })}
                      {f.endDate !== f.startDate
                        ? ` – ${format(parseISO(f.endDate), "d MMM yyyy", {
                            locale: tr,
                          })}`
                        : ""}
                    </span>
                    {f.reason && (
                      <span className="ml-2 text-[var(--ink-muted)]">
                        {f.reason}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="tap shrink-0 rounded-full px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100 sm:px-2 sm:py-1"
                    onClick={() => setPendingFrozenDelete(f)}
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

      <Dialog
        open={!!pendingFrozenDelete}
        onOpenChange={(open) => {
          if (!open) setPendingFrozenDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dondurulmuş günü kaldır?</DialogTitle>
          </DialogHeader>
          {pendingFrozenDelete && (
            <p className="text-sm text-[var(--ink-muted)]">
              {format(parseISO(pendingFrozenDelete.startDate), "d MMM yyyy", {
                locale: tr,
              })}
              {pendingFrozenDelete.endDate !== pendingFrozenDelete.startDate
                ? ` – ${format(parseISO(pendingFrozenDelete.endDate), "d MMM yyyy", { locale: tr })}`
                : ""}
              {pendingFrozenDelete.reason
                ? ` — ${pendingFrozenDelete.reason}`
                : ""}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-outline"
              disabled={pending}
              onClick={() => setPendingFrozenDelete(null)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={pending}
              onClick={() => {
                if (!pendingFrozenDelete) return;
                const target = pendingFrozenDelete;
                startTransition(async () => {
                  const result = await removeFrozenDate(target.id);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  setPendingFrozenDelete(null);
                  toast.success("Kaldırıldı", {
                    action: {
                      label: "Geri al",
                      onClick: () => {
                        startTransition(async () => {
                          const restored = await restoreFrozenDate(target.id);
                          if (restored.error) {
                            toast.error(restored.error);
                            return;
                          }
                          toast.success("Geri alındı");
                          router.refresh();
                        });
                      },
                    },
                  });
                  router.refresh();
                });
              }}
            >
              {pending ? "Kaldırılıyor..." : "Kaldır"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
