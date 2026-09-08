"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createOvertime,
  deleteOvertime,
} from "@/lib/actions/overtime";
import {
  isWeekend,
  overtimeHoursForDay,
} from "@/lib/istanbul-time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CreateOvertimeDialog({
  employees,
  hourSettings,
}: {
  employees: { id: string; firstName: string; lastName: string; active?: boolean }[];
  hourSettings: { weekday: number; weekend: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState(todayKey);
  const [hours, setHours] = useState(() =>
    String(overtimeHoursForDay(todayKey(), hourSettings))
  );
  const activeEmployees = employees.filter((e) => e.active !== false);

  const preview = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const weekend = isWeekend(day);
    const suggested = overtimeHoursForDay(day, hourSettings);
    return {
      weekend,
      suggested,
      label: weekend ? "Hafta sonu fazla mesai" : "Hafta içi fazla mesai",
    };
  }, [day, hourSettings]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    setHours(String(overtimeHoursForDay(day, hourSettings)));
  }, [day, hourSettings]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createOvertime(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Fazla mesai eklendi (+${result.hours} sa)`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className="btn-primary">
            Ekle
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fazla mesai ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Personel</label>
            <select name="employeeId" required className="field">
              <option value="">Seçin</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Tarih</label>
            <input
              name="day"
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="field"
            />
          </div>
          {preview && (
            <p className="rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--ink)]">
              {preview.label} · varsayılan{" "}
              <span className="font-semibold">+{preview.suggested} sa</span>
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm">Saat</label>
            <input
              name="hours"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Not</label>
            <input name="note" className="field" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            Kaydet
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteOvertimeButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="tap shrink-0 rounded-full px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100 sm:px-2 sm:py-1"
        onClick={() => setOpen(true)}
      >
        Sil
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fazla mesai silinsin mi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--ink-muted)]">
            Bu işlem geri alınamaz.
          </p>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteOvertime(id);
                  if (result && "error" in result && result.error) {
                    toast.error(String(result.error));
                    return;
                  }
                  toast.success("Silindi");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              {pending ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
