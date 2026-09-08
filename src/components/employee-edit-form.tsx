"use client";

import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/actions/employees";
import { toast } from "sonner";
import { useState } from "react";
import type { Employee } from "@/lib/db/schema";

export function EmployeeEditForm({
  employee,
  mode = "admin",
}: {
  employee: Employee;
  mode?: "admin" | "self";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const field = "field";
  const area = "field-area";

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

  if (mode === "self") {
    return (
      <form onSubmit={onSubmit} className="panel space-y-3">
        <h2 className="font-semibold">İletişim bilgilerim</h2>
        <div>
          <label className="mb-1 block text-sm">Telefon</label>
          <input name="phone" defaultValue={employee.phone ?? ""} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Adres</label>
          <input name="address" defaultValue={employee.address ?? ""} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Acil iletişim</label>
          <input
            name="emergencyContact"
            defaultValue={employee.emergencyContact ?? ""}
            placeholder="Ad / telefon"
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full sm:w-auto"
        >
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    );
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
      <div>
        <label className="mb-1 block text-sm">Acil iletişim</label>
        <input
          name="emergencyContact"
          defaultValue={employee.emergencyContact ?? ""}
          placeholder="Ad / telefon"
          className={field}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Departman</label>
        <input name="department" defaultValue={employee.department ?? ""} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-sm">İşe giriş</label>
        <input name="hireDate" type="date" defaultValue={employee.hireDate ?? ""} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-sm">T.C. Kimlik No</label>
        <input
          name="tcKimlik"
          inputMode="numeric"
          maxLength={11}
          defaultValue={employee.tcKimlik ?? ""}
          className={field}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Kan grubu</label>
          <input name="bloodType" defaultValue={employee.bloodType ?? ""} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Doğum tarihi</label>
          <input name="birthDate" type="date" defaultValue={employee.birthDate ?? ""} className={field} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">Adres</label>
        <input name="address" defaultValue={employee.address ?? ""} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Admin notu</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={employee.notes ?? ""}
          className={area}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={employee.active}
          className="size-5 accent-[var(--brand)]"
        />
        Aktif
      </label>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
