"use client";

import { useRouter } from "next/navigation";
import { createManualAttendance, deleteAttendance } from "@/lib/actions/attendance";
import { toast } from "sonner";
import { useState } from "react";
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
  const field =
    "w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand)]";

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
  return (
    <button
      type="button"
      className="text-xs text-red-600 hover:underline"
      onClick={async () => {
        if (!confirm("Kayıt silinsin mi?")) return;
        await deleteAttendance(id);
        toast.success("Silindi");
        router.refresh();
      }}
    >
      Sil
    </button>
  );
}
