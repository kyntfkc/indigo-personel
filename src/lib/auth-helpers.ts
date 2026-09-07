import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/benim");
  return session;
}

export async function requirePersonel() {
  const session = await requireSession();
  if (session.user.role !== "personel") redirect("/");
  return session;
}
