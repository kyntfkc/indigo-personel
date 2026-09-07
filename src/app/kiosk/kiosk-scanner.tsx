"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { scanQrAttendance } from "@/lib/actions/attendance";
import { IndigoLogo } from "@/components/indigo-logo";
import Link from "next/link";

type ScanResult = {
  type: "giris" | "cikis";
  name: string;
  recordedAt: string;
};

export default function KioskScanner() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastTokenRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);

  const handleScan = useCallback(async (decodedText: string) => {
    const now = Date.now();
    if (
      decodedText === lastTokenRef.current &&
      now - lastTimeRef.current < 2500
    ) {
      return;
    }
    lastTokenRef.current = decodedText;
    lastTimeRef.current = now;

    if (busy) return;
    setBusy(true);
    setError("");

    const res = await scanQrAttendance(decodedText);
    setBusy(false);

    if (res.error) {
      setError(res.error);
      setResult(null);
      return;
    }

    if (res.success && res.employee && res.type) {
      setResult({
        type: res.type as "giris" | "cikis",
        name: res.employee.name,
        recordedAt: res.recordedAt!,
      });
      setError("");
    }
  }, [busy]);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  async function start() {
    setError("");
    setResult(null);
    try {
      const scanner = new Html5Qrcode("kiosk-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 260 } },
        (text) => {
          void handleScan(text);
        },
        () => undefined
      );
      setScanning(true);
    } catch {
      setError("Kamera açılamadı. İzin verdiğinizden emin olun.");
    }
  }

  async function stop() {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--ink)] text-white">
      <header className="flex items-center justify-between px-4 py-4">
        <IndigoLogo size="md" className="rounded-md bg-white px-2 py-1" />
        <Link href="/" className="btn-outline !border-white/30 !text-white hover:!bg-white/10">
          Panele dön
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-10">
        <h1 className="text-center text-2xl font-semibold sm:text-3xl">
          QR Mesai Kiosk
        </h1>
        <p className="text-center text-white/60">
          Personel kartındaki QR kodu kameraya okutun
        </p>

        <div
          id="kiosk-reader"
          className="w-full overflow-hidden rounded-2xl bg-black/40 [&_video]:rounded-2xl"
        />

        {!scanning ? (
          <button
            type="button"
            onClick={start}
            className="btn-primary !px-10 !py-4 !text-lg"
          >
            Kamerayı Aç
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="btn-outline !border-white/40 !px-8 !py-3 !text-white hover:!bg-white/10"
          >
            Kamerayı Kapat
          </button>
        )}

        {error && (
          <div className="w-full rounded-2xl bg-red-500/20 px-4 py-3 text-center text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`w-full rounded-2xl px-6 py-5 text-center ${
              result.type === "giris"
                ? "bg-emerald-500/20 text-emerald-100"
                : "bg-[var(--brand)]/30 text-[var(--brand)]"
            }`}
          >
            <p className="text-sm uppercase tracking-wider opacity-80">
              {result.type === "giris" ? "Giriş kaydedildi" : "Çıkış kaydedildi"}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">{result.name}</p>
            <p className="mt-1 text-sm opacity-70">
              {new Date(result.recordedAt).toLocaleTimeString("tr-TR")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
