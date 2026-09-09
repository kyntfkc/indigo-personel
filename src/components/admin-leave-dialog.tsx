"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createAdminLeave } from "@/lib/actions/leave";
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

export function CreateAdminLeaveDialog({
  employees,
}: {
  employees: { id: string; firstName: string; lastName: string; active?: boolean }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const activeEmployees = employees.filter((e) => e.active !== false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createAdminLeave(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("İzin kaydı eklendi");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className="btn-primary">
            İzin ekle
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manuel izin ekle</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--ink-muted)]">
          Kayıt doğrudan onaylı olarak işlenir.
        </p>
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
            <label className="mb-1 block text-sm">Tip</label>
            <select name="type" required className="field" defaultValue="yillik">
              <option value="yillik">Yıllık izin</option>
              <option value="hastalik">Hastalık</option>
              <option value="mazeret">Mazeret</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Başlangıç</label>
              <input
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (endDate < v) setEndDate(v);
                }}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Bitiş</label>
              <input
                name="endDate"
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="field"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Not</label>
            <input name="note" className="field" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
