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
    sm: "h-9",
    md: "h-11",
    lg: "h-16",
  };

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="Indigo"
    >
      <Image
        src="/indigo-logo.png"
        alt="indigo"
        width={566}
        height={246}
        className={cn("w-auto object-contain object-left", heights[size])}
        priority
      />
    </Link>
  );
}
