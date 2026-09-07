export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import KioskScanner from "./kiosk-scanner";

export default async function KioskPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/giris");
  return <KioskScanner />;
}
