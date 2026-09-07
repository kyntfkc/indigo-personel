"use client";

import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/actions/employees";
import { toast } from "sonner";
import { useState } from "react";
import type { Employee } from "@/lib/db/schema";

export function EmployeeEditForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const field =
    "w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand)]";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateEmployee(employee.id, formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Güncellendi");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3">
      <h2 className="font-semibold">Bilgiler</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Ad</label>
          <input name="firstName" defaultValue={employee.firstName} required className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Soyad</label>
          <input name="lastName" defaultValue={employee.lastName} required className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">E-posta</label>
        <input name="email" type="email" defaultValue={employee.email ?? ""} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Telefon</label>
        <input name="phone" defaultValue={employee.phone ?? ""} className={field} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Departman</label>
          <input name="department" defaultValue={employee.department ?? ""} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Pozisyon</label>
          <input name="position" defaultValue={employee.position ?? ""} className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">İşe giriş</label>
        <input name="hireDate" type="date" defaultValue={employee.hireDate ?? ""} className={field} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={employee.active} />
        Aktif
      </label>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
