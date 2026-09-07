"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { regenerateDoorToken } from "@/lib/actions/attendance";
import type { DoorStation } from "@/lib/db/schema";

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
  const url = `${baseUrl}/kapi/${station.token}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 2,
      color: { dark: "#1e1e20", light: "#ffffff" },
    });
  }, [url]);

  function onRegenerate() {
    if (!confirm("Kapı QR yenilensin mi? Eski kod geçersiz olur.")) return;
    startTransition(async () => {
      const result = await regenerateDoorToken();
      if ("error" in result && result.error) {
        toast.error(String(result.error));
        return;
      }
      toast.success("Kapı QR yenilendi");
      router.refresh();
    });
  }

  return (
    <div className="panel mx-auto max-w-lg space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{station.name}</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Bu QR kodu kapıya asın. Personel telefonunda giriş yapmışken okutsun.
        </p>
      </div>

      <div className="flex justify-center rounded-2xl bg-white p-4">
        <canvas ref={canvasRef} />
      </div>

      <p className="break-all text-xs text-[var(--ink-muted)]">{url}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <a href={url} target="_blank" rel="noreferrer" className="btn-outline">
          Bağlantıyı aç
        </a>
        <button
          type="button"
          className="btn-outline"
          onClick={() => window.print()}
        >
          Yazdır
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={onRegenerate}
        >
          {pending ? "Yenileniyor..." : "QR yenile"}
        </button>
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Akşam zorunlu çıkış yok. Gece yarısından sonra açık mesailer otomatik
        18:00 çıkış olarak işlenir.
      </p>
    </div>
  );
}
