"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addHoliday,
  exportDataBackup,
  removeHoliday,
  restoreHoliday,
  seedTurkeyHolidays,
  setWorkStartTime,
} from "@/lib/actions/settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Holiday } from "@/lib/db/schema";

const field = "field";

export function WorkStartForm({ workStart }: { workStart: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await setWorkStartTime(fd);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Mesai başlangıcı güncellendi");
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold">Mesai başlangıcı</h2>
      <p className="text-sm text-[var(--ink-muted)]">
        Geç giriş raporu bu saate göre hesaplanır (İstanbul).
      </p>
      <div>
        <label className="mb-1 block text-sm">Saat</label>
        <input
          name="workStartTime"
          type="time"
          required
          defaultValue={workStart}
          className={field}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full sm:w-auto"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}

export function HolidaysPanel({ holidays }: { holidays: Holiday[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays) map.set(h.date, h);
    return map;
  }, [holidays]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const monthHolidays = useMemo(() => {
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    return holidays
      .filter((h) => h.date >= from && h.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, month]);

  function onDayClick(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const existing = holidayByDate.get(key);
    if (existing) {
      setPendingDelete(existing);
      return;
    }
    setDate(key);
    nameRef.current?.focus();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    startTransition(async () => {
      const result = await removeHoliday(target.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPendingDelete(null);
      toast.success("Silindi", {
        action: {
          label: "Geri al",
          onClick: () => {
            startTransition(async () => {
              const restored = await restoreHoliday(target.id);
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
  }

  return (
    <div className="panel space-y-4">
      <div>
        <h2 className="font-semibold">Resmi tatiller</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Bu günler iş günü sayılmaz; takvimde görsel olarak işaretlenir, izin
          aralığına dahil edilebilir.
        </p>
        <button
          type="button"
          disabled={pending}
          className="btn-outline mt-3 w-full !text-xs sm:w-auto"
          onClick={() => {
            startTransition(async () => {
              const result = await seedTurkeyHolidays();
              if ("error" in result && result.error) {
                toast.error(String(result.error));
                return;
              }
              toast.success(
                `Türkiye tatilleri yüklendi (${result.inserted} yeni / ${result.total})`
              );
              router.refresh();
            });
          }}
        >
          Türkiye resmi tatillerini ekle (2026–2027)
        </button>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("date", date);
          fd.set("name", name);
          startTransition(async () => {
            const result = await addHoliday(fd);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Tatil eklendi");
            setDate("");
            setName("");
            router.refresh();
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs text-[var(--ink-muted)]">
            Tarih
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--ink-muted)]">
            Ad
          </label>
          <input
            ref={nameRef}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. 23 Nisan"
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full sm:w-auto"
        >
          Ekle
        </button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-outline !px-3"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="truncate text-base font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: tr })}
        </h3>
        <button
          type="button"
          className="btn-outline !px-3"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Boş güne dokunun, tarih alanı dolar. Tatil gününe dokunduğunuzda silme
        onayı çıkar.
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--ink-muted)] sm:text-xs">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Mobil: tatil adı hücreye sığmadığı için nokta ile işaretlenir, liste altta. */}
      <div className="grid grid-cols-7 gap-1 lg:hidden">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const holiday = holidayByDate.get(key);
          const inMonth = isSameMonth(day, month);
          const selected = date === key;

          return (
            <button
              key={key}
              type="button"
              disabled={pending}
              aria-label={
                holiday
                  ? `${format(day, "d MMMM", { locale: tr })} — ${holiday.name}, kaldırmak için dokunun`
                  : `${format(day, "d MMMM", { locale: tr })} — tarihi seçmek için dokunun`
              }
              onClick={() => onDayClick(day)}
              className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border transition ${
                holiday
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]"
                  : selected
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
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
              <span className="mt-0.5 flex h-2 items-center">
                {holiday && (
                  <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden grid-cols-7 gap-1 lg:grid">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const holiday = holidayByDate.get(key);
          const inMonth = isSameMonth(day, month);
          const selected = date === key;

          return (
            <button
              key={key}
              type="button"
              disabled={pending}
              title={
                holiday
                  ? `${holiday.name} — kaldırmak için tıklayın`
                  : "Tarihi seçmek için tıklayın"
              }
              onClick={() => onDayClick(day)}
              className={`min-h-[72px] rounded-xl border p-1.5 text-left transition ${
                holiday
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]/60 hover:border-[var(--brand)]"
                  : selected
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] bg-white hover:border-[var(--brand)]"
              } ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`text-xs font-semibold ${
                  isSameDay(day, new Date())
                    ? "text-[var(--brand)]"
                    : "text-[var(--ink)]"
                }`}
              >
                {format(day, "d")}
              </span>
              {holiday && (
                <p className="mt-1 truncate text-[10px] font-medium text-[var(--brand)]">
                  {holiday.name}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--brand)]/50" /> Resmi tatil
        </span>
      </div>

      {/* Mobilde tatil adları yalnızca burada okunabilir. */}
      <div className="border-t border-[var(--border)] pt-4 lg:hidden">
        <h3 className="mb-2 text-sm font-semibold capitalize">
          {format(month, "MMMM", { locale: tr })} tatilleri
        </h3>
        {monthHolidays.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Bu ay resmi tatil yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthHolidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--brand-soft)] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {h.name}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {format(new Date(h.date + "T12:00:00"), "d MMMM EEEE", {
                      locale: tr,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className="tap shrink-0 rounded-full px-3 text-xs font-medium text-red-600 transition active:bg-red-100"
                  onClick={() => setPendingDelete(h)}
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tatili kaldır?</DialogTitle>
          </DialogHeader>
          {pendingDelete && (
            <p className="text-sm text-[var(--ink-muted)]">
              {format(new Date(pendingDelete.date + "T12:00:00"), "d MMMM yyyy", {
                locale: tr,
              })}{" "}
              — {pendingDelete.name}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-outline"
              disabled={pending}
              onClick={() => setPendingDelete(null)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={pending}
              onClick={confirmDelete}
            >
              {pending ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BackupExportPanel() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="panel space-y-3">
      <h2 className="font-semibold">Veri yedeği</h2>
      <p className="text-sm text-[var(--ink-muted)]">
        Personel, mesai, izin, tatil ve ayarları JSON olarak indirir. Neon
        konsol yedeği ayrıca önerilir.
      </p>
      <button
        type="button"
        disabled={pending}
        className="btn-primary w-full sm:w-auto"
        onClick={() => {
          startTransition(async () => {
            try {
              const data = await exportDataBackup();
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              const day = new Date().toISOString().slice(0, 10);
              a.href = url;
              a.download = `indigo-yedek-${day}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Yedek indirildi");
            } catch {
              toast.error("Yedek alınamadı");
            }
          });
        }}
      >
        {pending ? "Hazırlanıyor..." : "Veri yedeği indir"}
      </button>
    </div>
  );
}
