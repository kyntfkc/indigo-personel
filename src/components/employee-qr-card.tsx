"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { regenerateQrToken } from "@/lib/actions/employees";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function EmployeeQrCard({
  employeeId,
  qrToken,
  name,
}: {
  employeeId: string;
  qrToken: string;
  name: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState(qrToken);
  const router = useRouter();

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, {
      width: 220,
      margin: 2,
      color: { dark: "#1e1e20", light: "#ffffff" },
    });
  }, [token]);

  async function regenerate() {
    const result = await regenerateQrToken(employeeId);
    if (result.success && result.qrToken) {
      setToken(result.qrToken);
      toast.success("QR yenilendi");
      router.refresh();
    }
  }

  function printCard() {
    window.print();
  }

  return (
    <div className="panel text-center print:border print:shadow-none">
      <p className="mb-2 text-lg font-semibold text-[var(--ink)]">{name}</p>
      <p className="mb-4 text-xs text-[var(--ink-muted)]">İndigo Takı Personel Kartı</p>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="rounded-xl" />
      </div>
      <p className="mt-3 font-mono text-[10px] text-[var(--ink-muted)] break-all">
        {token}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
        <button type="button" onClick={printCard} className="btn-primary">
          Yazdır
        </button>
        <button type="button" onClick={regenerate} className="btn-outline">
          QR Yenile
        </button>
      </div>
    </div>
  );
}
