"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInitialAdmin } from "@/lib/actions/setup";
import { IndigoLogo } from "@/components/indigo-logo";

export default function KurulumForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createInitialAdmin(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/giris");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-muted)] px-4">
      <div className="panel w-full max-w-md !p-8">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <IndigoLogo />
          <h1 className="text-xl font-semibold text-[var(--ink)]">İlk Kurulum</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Yönetici hesabı oluşturun
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-posta</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Şifre</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Şifre (tekrar)</label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={6}
              className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Oluşturuluyor..." : "Admin Oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}
