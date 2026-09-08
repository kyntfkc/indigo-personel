"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPayment, deletePayment } from "@/lib/actions/payments";
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

export function CreatePaymentDialog({
  employees,
}: {
  employees: { id: string; firstName: string; lastName: string; active?: boolean }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const activeEmployees = employees.filter((e) => e.active !== false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createPayment(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Kayıt eklendi (${result.amount} ₺)`);
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
          <DialogTitle>Ödeme ekle</DialogTitle>
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
            <label className="mb-1 block text-sm">Tür</label>
            <select name="type" required className="field" defaultValue="prim">
              <option value="prim">Prim</option>
              <option value="mesai">Fazla mesai ücreti</option>
              <option value="avans">Avans</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Tarih</label>
            <input
              name="day"
              type="date"
              required
              defaultValue={todayKey()}
              className="field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Tutar (₺)</label>
            <input
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              required
              inputMode="decimal"
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

export function DeletePaymentButton({ id }: { id: string }) {
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
            <DialogTitle>Kayıt silinsin mi?</DialogTitle>
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
                  const result = await deletePayment(id);
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
