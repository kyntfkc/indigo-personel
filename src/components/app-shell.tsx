"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  QrCode,
  Clock,
  CalendarDays,
  CalendarRange,
  BarChart3,
  LogOut,
  User,
  Menu,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { IndigoLogo } from "./indigo-logo";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personel", label: "Personel", icon: Users },
  { href: "/takvim", label: "Takvim", icon: CalendarRange },
  { href: "/mesai", label: "Fazla Mesai", icon: Clock },
  { href: "/prim", label: "Ödemeler", icon: Wallet },
  { href: "/izin", label: "İzin Onay", icon: CalendarDays },
  { href: "/raporlar", label: "Raporlar", icon: BarChart3 },
  { href: "/kiosk", label: "Kapı QR", icon: QrCode },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

const personelLinks = [
  { href: "/benim", label: "Profilim", icon: User },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/benim/izin", label: "İzinlerim", icon: CalendarDays },
];

function Nav({
  links,
  pathname,
  onNavigate,
  mobile = false,
}: {
  links: typeof adminLinks;
  pathname: string;
  onNavigate: () => void;
  mobile?: boolean;
}) {
  return (
    <nav className={cn("flex flex-col gap-1", mobile && "p-4")}>
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
              mobile && "min-h-12",
              active
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--ink)]/70 hover:bg-[var(--brand-soft)] hover:text-[var(--ink)] active:bg-[var(--brand-soft)]"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  role,
  userName,
}: {
  children: React.ReactNode;
  role: "admin" | "personel";
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = role === "admin" ? adminLinks : personelLinks;

  // Menü açıkken arka planın kaydırılması mobilde kafa karıştırıyor.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-[var(--bg-muted)] print:min-h-0 print:bg-white">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <button
              type="button"
              className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--brand-soft)] active:bg-[var(--brand-soft)] lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Menü"
              aria-expanded={open}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <IndigoLogo />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-[var(--ink)]/70 sm:inline">
              {userName}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/giris" })}
              className="btn-outline !px-3 !py-1.5"
              aria-label="Çıkış"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 top-14 z-30 bg-black/20 print:hidden lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-b border-[var(--border)] bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden">
            <Nav
              links={links}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              mobile
            />
          </div>
        </>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-4 sm:py-6 print:max-w-none print:gap-0 print:p-0">
        <aside className="hidden w-[220px] shrink-0 print:hidden lg:block">
          <div className="panel sticky top-20 !p-3">
            <Nav
              links={links}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
