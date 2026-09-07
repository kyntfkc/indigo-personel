export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { needsSetup } from "@/lib/actions/setup";
import LoginForm from "./login-form";

export default async function GirisPage() {
  try {
    if (await needsSetup()) redirect("/kurulum");
  } catch {
    redirect("/kurulum");
  }

  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "admin" ? "/" : "/benim");
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg-muted)]" />}>
      <LoginForm />
    </Suspense>
  );
}
