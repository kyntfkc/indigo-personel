import Link from "next/link";
import Image from "next/image";

export function IndigoLogo({
  className = "",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center ${className}`}
      aria-label="Indigo"
    >
      <Image
        src="/indigo-logo.jpg"
        alt="indigo"
        width={140}
        height={40}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}
