export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { checkInViaDoor } from "@/lib/actions/attendance";
import { IndigoLogo } from "@/components/indigo-logo";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function KapiPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/giris?callbackUrl=${encodeURIComponent(`/kapi/${token}`)}`);
  }

  const result = await checkInViaDoor(token);
  const homeHref = session.user.role === "admin" ? "/" : "/benim";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-muted)] px-4 py-8">
      <div className="panel w-full max-w-md space-y-6 !p-6 text-center sm:!p-8">
        <IndigoLogo size="lg" className="mx-auto justify-center" />

        {"error" in result ? (
          <>
            <h1 className="text-xl font-semibold text-[var(--destructive)]">
              İşlem başarısız
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">{result.error}</p>
          </>
        ) : (
          <>
            <div
              className={`mx-auto flex size-16 items-center justify-center rounded-full text-2xl font-bold text-white ${
                result.type === "giris" ? "bg-emerald-500" : "bg-orange-500"
              }`}
            >
              {result.type === "giris" ? "G" : "Ç"}
            </div>
            <h1 className="text-xl font-semibold text-[var(--ink)]">
              {result.type === "giris" ? "Giriş kaydedildi" : "Çıkış kaydedildi"}
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              {result.employee?.name}
              {result.recordedAt
                ? ` · ${format(new Date(result.recordedAt), "d MMM yyyy HH:mm", {
                    locale: tr,
                  })}`
                : ""}
            </p>
          </>
        )}

        <Link href={homeHref} className="btn-primary w-full sm:w-auto">
          Panele dön
        </Link>
      </div>
    </div>
  );
}
