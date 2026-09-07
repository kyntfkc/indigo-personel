export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { needsSetup } from "@/lib/actions/setup";
import KurulumForm from "./kurulum-form";

export default async function KurulumPage() {
  try {
    const needed = await needsSetup();
    if (!needed) redirect("/giris");
  } catch {
    // DB bağlantısı yoksa formu yine göster
  }

  return <KurulumForm />;
}
