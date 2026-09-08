"use client";

import { useRouter } from "next/navigation";
import { createLeaveRequest } from "@/lib/actions/leave";
import { toast } from "sonner";
import { useState } from "react";

export function LeaveRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const field = "field";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createLeaveRequest(new FormData(e.currentTarget));
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("İzin talebi gönderildi");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3">
      <h2 className="font-semibold">Yeni izin talebi</h2>
      <div>
        <label className="mb-1 block text-sm">Tip</label>
        <select name="type" required className={field}>
          <option value="yillik">Yıllık İzin</option>
          <option value="hastalik">Hastalık</option>
          <option value="mazeret">Mazeret</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Başlangıç</label>
          <input name="startDate" type="date" required className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Bitiş</label>
          <input name="endDate" type="date" required className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">Not</label>
        <input name="note" className={field} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? "Gönderiliyor..." : "Talep Gönder"}
      </button>
    </form>
  );
}
