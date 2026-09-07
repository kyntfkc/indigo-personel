import { NextRequest, NextResponse } from "next/server";
import { autoCheckoutOpenShifts } from "@/lib/actions/attendance";
import { previousIstanbulDateKey } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const day =
    req.nextUrl.searchParams.get("day") || previousIstanbulDateKey();
  const result = await autoCheckoutOpenShifts(day);
  return NextResponse.json(result);
}
