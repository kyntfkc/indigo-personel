"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
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
  baseUrl,
}: {
  station: DoorStation;
  baseUrl: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const url = `${baseUrl}/kapi/${station.token}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    // Yüksek çözünürlükte üretilip CSS ile küçültülür; dar ekranda taşmaz.
    QRCode.toCanvas(canvasRef.current, url, {
      width: 560,
      margin: 2,
      color: { dark: "#1e1e20", light: "#ffffff" },
    });
  }, [url]);

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
    <div className="panel mx-auto max-w-lg space-y-6 text-center">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{station.name}</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Bu QR kodu kapıya asın. Personel telefonunda giriş yapmışken okutsun.
        </p>
      </div>

      <div className="flex justify-center rounded-2xl bg-white p-2 sm:p-4">
        <canvas
          ref={canvasRef}
          className="h-auto w-full max-w-[280px]"
          aria-label="Kapı QR kodu"
        />
      </div>

      <p className="break-all text-xs text-[var(--ink-muted)]">{url}</p>

      <div className="flex flex-wrap justify-center gap-3">
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

      <p className="text-xs text-[var(--ink-muted)]">
        Akşam zorunlu çıkış yok. Gece yarısından sonra açık mesailer otomatik
        18:00 çıkış olarak işlenir.
      </p>

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
  );
}
