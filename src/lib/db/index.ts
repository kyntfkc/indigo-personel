import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  db: Db | undefined;
};

function resolveDatabaseUrl() {
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil");
  }

  return url
    .replace(/[?&]channel_binding=require/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
}

export function getDb() {
  if (globalForDb.db) return globalForDb.db;

  const client =
    globalForDb.client ??
    postgres(resolveDatabaseUrl(), {
      prepare: false,
      max: 1,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
  }

  const db = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = db;
  }
  return db;
}

export type { Db };
