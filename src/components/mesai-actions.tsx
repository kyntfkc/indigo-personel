"use client";

import { useRouter } from "next/navigation";
import { createManualAttendance, deleteAttendance } from "@/lib/actions/attendance";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ManualAttendanceDialog({
  employees,
}: {
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const field = "field";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createManualAttendance(new FormData(e.currentTarget));
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Kayıt eklendi");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className="btn-outline">
            Manuel Kayıt
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manuel mesai kaydı</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Personel</label>
            <select name="employeeId" required className={field}>
              <option value="">Seçin</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Tip</label>
            <select name="type" required className={field}>
              <option value="giris">Giriş</option>
              <option value="cikis">Çıkış</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Zaman</label>
            <input
              name="recordedAt"
              type="datetime-local"
              required
              defaultValue={new Date().toISOString().slice(0, 16)}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Not</label>
            <input name="note" className={field} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            Kaydet
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAttendanceButton({ id }: { id: string }) {
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
            <DialogTitle>Mesai kaydı silinsin mi?</DialogTitle>
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
                  const result = await deleteAttendance(id);
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
