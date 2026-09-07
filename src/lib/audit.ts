import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAudit(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  meta?: unknown;
  actorUserId?: string | null;
}) {
  try {
    let actorUserId: string | null;
    if (input.actorUserId !== undefined) {
      actorUserId = input.actorUserId;
    } else {
      const session = await auth();
      actorUserId = session?.user?.id ?? null;
    }

    const db = getDb();
    await db.insert(auditLogs).values({
      actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      meta: input.meta === undefined ? null : JSON.stringify(input.meta),
    });
  } catch (error) {
    console.error("writeAudit failed:", error);
  }
}
