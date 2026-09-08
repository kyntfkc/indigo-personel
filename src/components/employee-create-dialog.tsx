"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/lib/actions/employees";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EmployeeCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createLogin, setCreateLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (createLogin) formData.set("createLogin", "on");
    const result = await createEmployee(formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Personel eklendi");
    setOpen(false);
    router.refresh();
  }

  const field = "field";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className="btn-primary">
            Personel Ekle
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Personel</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Ad</label>
              <input name="firstName" required className={field} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Soyad</label>
              <input name="lastName" required className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">E-posta</label>
            <input name="email" type="email" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Telefon</label>
            <input name="phone" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Departman</label>
            <input name="department" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm">İşe giriş</label>
            <input name="hireDate" type="date" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm">T.C. Kimlik No</label>
            <input name="tcKimlik" inputMode="numeric" maxLength={11} className={field} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Kan grubu</label>
              <input name="bloodType" placeholder="A Rh (+)" className={field} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Doğum tarihi</label>
              <input name="birthDate" type="date" className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Adres</label>
            <input name="address" className={field} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="size-5 accent-[var(--brand)]"
            />
            Giriş hesabı oluştur
          </label>
          {createLogin && (
            <>
              <div>
                <label className="mb-1 block text-sm">Kullanıcı adı</label>
                <input
                  name="username"
                  required={createLogin}
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9._\-]+"
                  placeholder="ornek.kullanici"
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Şifre</label>
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  required={createLogin}
                  className={field}
                />
              </div>
            </>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
