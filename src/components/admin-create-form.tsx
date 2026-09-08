"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAdmin } from "@/lib/actions/settings";

export function AdminCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const field = "field";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const result = await createAdmin(new FormData(form));
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Admin eklendi");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4">
      <div>
        <h2 className="font-semibold">Yeni admin</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Admin e-posta ve şifre ile giriş yapar.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">E-posta</label>
        <input name="email" type="email" required className={field} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Şifre</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className={field}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Şifre (tekrar)</label>
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={6}
          className={field}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? "Ekleniyor..." : "Admin ekle"}
      </button>
    </form>
  );
}
