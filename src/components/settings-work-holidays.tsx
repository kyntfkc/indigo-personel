"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  addHoliday,
  removeHoliday,
  seedTurkeyHolidays,
  setWorkStartTime,
} from "@/lib/actions/settings";
import type { Holiday } from "@/lib/db/schema";

const field =
  "w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand)]";

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
      <button type="submit" disabled={pending} className="btn-primary">
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

  return (
    <div className="panel space-y-4">
      <div>
        <h2 className="font-semibold">Resmi tatiller</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Bu günler iş günü sayılmaz; izin talebi de engellenir.
        </p>
        <button
          type="button"
          disabled={pending}
          className="btn-outline mt-3 !text-xs"
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
        className="flex flex-wrap items-end gap-3"
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
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-[var(--ink-muted)]">
            Ad
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. 23 Nisan"
            className={field}
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          Ekle
        </button>
      </form>

      {holidays.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Henüz tatil yok</p>
      ) : (
        <ul className="space-y-2">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">
                  {format(parseISO(h.date), "d MMM yyyy", { locale: tr })}
                </span>
                <span className="ml-2 text-[var(--ink-muted)]">{h.name}</span>
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => {
                  startTransition(async () => {
                    await removeHoliday(h.id);
                    toast.success("Silindi");
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
  );
}
