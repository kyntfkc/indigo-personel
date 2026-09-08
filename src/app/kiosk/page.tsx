export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DoorQrPanel } from "@/components/door-qr-panel";
import { getDoorStation } from "@/lib/actions/attendance";
import { headers } from "next/headers";
import QRCode from "qrcode";

export default async function KioskPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");

  const station = await getDoorStation();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "https";
  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `${proto}://${host}`;

  const url = `${baseUrl}/kapi/${station.token}`;
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    color: { dark: "#1e1e20", light: "#0000" },
  });

  return (
    <AppShell role="admin" userName={session.user.name || session.user.email}>
      <DoorQrPanel station={station} url={url} qrSvg={qrSvg} />
    </AppShell>
  );
}
