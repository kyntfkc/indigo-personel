"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { IndigoLogo } from "@/components/indigo-logo";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("E-posta veya şifre hatalı");
      return;
    }

    const callback = searchParams.get("callbackUrl") || "/";
    router.push(callback);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-muted)] px-4">
      <div className="panel w-full max-w-md !p-8">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <IndigoLogo />
          <p className="text-sm text-[var(--ink-muted)]">Personel takip sistemine giriş</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              E-posta
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Şifre
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
