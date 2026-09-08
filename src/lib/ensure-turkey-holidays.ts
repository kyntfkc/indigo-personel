import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { holidays, siteSettings } from "@/lib/db/schema";
import { getTurkeyHolidays } from "@/lib/turkey-holidays";

const TURKEY_HOLIDAYS_SEED_KEY = "turkey_holidays_seed";
const TURKEY_HOLIDAYS_SEED_VALUE = "2026-2030-no-republic-eve";

/** Eksik Türkiye resmi tatillerini ekler; 28 Ekim Cumhuriyet arifesini gizler. */
export async function ensureTurkeyHolidays() {
  const db = getDb();
  const [flag] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, TURKEY_HOLIDAYS_SEED_KEY))
    .limit(1);
  if (flag?.value === TURKEY_HOLIDAYS_SEED_VALUE) {
    return { success: true as const, inserted: 0, total: 0 };
  }

  const list = getTurkeyHolidays();
  let inserted = 0;
  let restored = 0;

  for (const item of list) {
    const [existing] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.date, item.date))
      .limit(1);

    if (!existing) {
      await db.insert(holidays).values({
        date: item.date,
        name: item.name,
      });
      inserted += 1;
      continue;
    }

    if (existing.deletedAt) {
      await db
        .update(holidays)
        .set({
          name: item.name,
          deletedAt: null,
        })
        .where(eq(holidays.id, existing.id));
      restored += 1;
    } else if (existing.name !== item.name) {
      await db
        .update(holidays)
        .set({ name: item.name })
        .where(eq(holidays.id, existing.id));
    }
  }

  const activeRows = await db
    .select()
    .from(holidays)
    .where(isNull(holidays.deletedAt));

  for (const row of activeRows) {
    const isRepublicEve =
      row.date.endsWith("-10-28") ||
      /Cumhuriyet Bayramı Arife/i.test(row.name);
    if (!isRepublicEve) continue;
    await db
      .update(holidays)
      .set({ deletedAt: new Date() })
      .where(eq(holidays.id, row.id));
  }

  const now = new Date();
  await db
    .insert(siteSettings)
    .values({
      key: TURKEY_HOLIDAYS_SEED_KEY,
      value: TURKEY_HOLIDAYS_SEED_VALUE,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: TURKEY_HOLIDAYS_SEED_VALUE, updatedAt: now },
    });

  return {
    success: true as const,
    inserted: inserted + restored,
    total: list.length,
  };
}
