"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { IndigoLogo } from "@/components/indigo-logo";

const REMEMBER_LOGIN_KEY = "indigo-perso-remember-login";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [login, setLogin] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_LOGIN_KEY);
      if (saved) {
        setLogin(saved);
        setRemember(true);
      }
    } catch {
      // localStorage yoksa sessiz geç
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const loginValue = String(form.get("login") || "");
    const password = String(form.get("password") || "");
    const rememberMe = form.get("remember") === "on";

    const res = await signIn("credentials", {
      login: loginValue,
      password,
      remember: rememberMe ? "true" : "false",
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Kullanıcı adı / e-posta veya şifre hatalı");
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_LOGIN_KEY, loginValue.trim());
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
    } catch {
      // ignore
    }

    const callback = searchParams.get("callbackUrl") || "/";
    router.push(callback);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-muted)] px-4 py-8">
      <div className="panel w-full max-w-md !p-6 sm:!p-8">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <IndigoLogo size="lg" />
          <p className="text-sm text-[var(--ink-muted)]">
            Personel takip sistemine giriş
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Kullanıcı adı / E-posta
            </label>
            <input
              name="login"
              type="text"
              required
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="field focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              Personel kullanıcı adı, admin e-posta ile girer.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
              Şifre
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="field pr-12 focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--ink)]"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--ink)]">
            <input
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 rounded border-[var(--border)] accent-[var(--brand)]"
            />
            Beni hatırla
          </label>
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
