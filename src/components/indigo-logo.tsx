import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function IndigoLogo({
  className = "",
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const heights = {
    sm: "h-8 sm:h-9",
    md: "h-9 sm:h-11",
    lg: "h-12 sm:h-16",
  };

  const textSizes = {
    sm: "text-xl sm:text-2xl",
    md: "text-2xl sm:text-3xl",
    lg: "text-3xl sm:text-4xl",
  };

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-1.5 sm:gap-2", className)}
      aria-label="indigo perso"
    >
      <Image
        src="/indigo-logo.png"
        alt=""
        width={566}
        height={246}
        className={cn("w-auto object-contain object-left", heights[size])}
        priority
      />
      <span
        className={cn(
          "font-serif font-medium lowercase leading-none tracking-tight text-[var(--brand)]",
          textSizes[size]
        )}
      >
        perso
      </span>
    </Link>
  );
}
