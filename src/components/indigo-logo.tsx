import Link from "next/link";

export function IndigoLogo({ className = "h-8" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8 shrink-0"
        aria-hidden
      >
        <circle cx="20" cy="20" r="18" fill="var(--brand)" opacity="0.15" />
        <circle
          cx="20"
          cy="20"
          r="12"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
        />
        <circle cx="20" cy="20" r="4" fill="var(--brand)" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-[var(--ink)]">
        İndigo <span className="font-normal text-[var(--brand)]">Personel</span>
      </span>
    </Link>
  );
}
