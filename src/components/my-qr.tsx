"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function MyQr({ token, name }: { token: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, {
      width: 200,
      margin: 2,
      color: { dark: "#1e1e20", light: "#ffffff" },
    });
  }, [token]);

  return (
    <div className="panel text-center">
      <p className="mb-1 font-semibold">{name}</p>
      <p className="mb-4 text-xs text-[var(--ink-muted)]">Mesai QR kodunuz</p>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="rounded-xl" />
      </div>
    </div>
  );
}
