import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select({ email: users.email }).from(users).limit(5);
    return NextResponse.json({
      ok: true,
      userCount: rows.length,
      hasUrl: Boolean(
        process.env.DATABASE_URL ||
          process.env.POSTGRES_URL ||
          process.env.DATABASE_URL_UNPOOLED
      ),
    });
  } catch (error) {
    const err = error as Error & { cause?: unknown };
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        cause: err.cause ? String(err.cause) : undefined,
      },
      { status: 500 }
    );
  }
}
