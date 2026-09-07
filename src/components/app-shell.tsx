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
} from "lucide-react";
import { IndigoLogo } from "./indigo-logo";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personel", label: "Personel", icon: Users },
  { href: "/kiosk", label: "Kiosk", icon: QrCode },
  { href: "/mesai", label: "Mesai", icon: Clock },
  { href: "/takvim", label: "Takvim", icon: CalendarRange },
  { href: "/izin", label: "İzin Onay", icon: CalendarDays },
  { href: "/raporlar", label: "Raporlar", icon: BarChart3 },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

const personelLinks = [
  { href: "/benim", label: "Profilim", icon: User },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/benim/izin", label: "İzinlerim", icon: CalendarDays },
];

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

  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
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
            onClick={() => setOpen(false)}
            className={cn(
              "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
              active
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--ink)]/70 hover:bg-[var(--brand-soft)] hover:text-[var(--ink)]"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg-muted)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full p-2 text-[var(--ink)] lg:hidden hover:bg-[var(--brand-soft)]"
              onClick={() => setOpen(!open)}
              aria-label="Menü"
            >
              <Menu className="size-5" />
            </button>
            <IndigoLogo />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--ink)]/70 sm:inline">
              {userName}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/giris" })}
              className="btn-outline !px-3 !py-1.5"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="border-b border-[var(--border)] bg-white lg:hidden">
          <Nav mobile />
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-[220px] shrink-0 lg:block">
          <div className="panel sticky top-20 !p-3">
            <Nav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
