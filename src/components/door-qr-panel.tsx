"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { regenerateDoorToken } from "@/lib/actions/attendance";
import type { DoorStation } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DoorQrPanel({
  station,
  url,
  qrSvg,
}: {
  station: DoorStation;
  url: string;
  qrSvg: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function onRegenerate() {
    startTransition(async () => {
      const result = await regenerateDoorToken();
      if ("error" in result && result.error) {
        toast.error(String(result.error));
        return;
      }
      toast.success("Kapı QR yenilendi");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="panel space-y-8 text-center print:flex print:min-h-[240mm] print:flex-col print:items-center print:justify-center print:space-y-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <Image
          src="/indigo-logo.png"
          alt="indigo"
          width={566}
          height={246}
          className="mx-auto h-auto w-[180px] object-contain sm:w-[220px] print:w-[50mm]"
          priority
        />

        <div
          className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl bg-white p-5 print:max-w-[150mm] print:w-full print:rounded-none print:p-6 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full"
          role="img"
          aria-label={`${station.name} QR kodu`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <p className="text-sm font-medium text-[var(--ink)] print:text-base">
          Giriş ve çıkış için okutun
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <a href={url} target="_blank" rel="noreferrer" className="btn-outline">
          Bağlantıyı aç
        </a>
        <button
          type="button"
          className="btn-outline hidden sm:inline-flex"
          onClick={() => window.print()}
        >
          Yazdır
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() => setConfirmOpen(true)}
        >
          QR yenile
        </button>
      </div>

      <div className="print:hidden">
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Kapı QR yenilensin mi?</DialogTitle>
            </DialogHeader>
            <p className="text-left text-sm text-[var(--ink-muted)]">
              Eski kod geçersiz olur, kapıdaki çıktıyı yenilemeniz gerekir.
            </p>
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-outline"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={onRegenerate}
              >
                {pending ? "Yenileniyor..." : "Yenile"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
