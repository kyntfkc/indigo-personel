import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "")
  .replace(/[?&]channel_binding=require/g, "");

const sql = postgres(url, { ssl: "require", prepare: false, max: 1 });
const rows = await sql`select email from users limit 2`;
console.log(rows);
await sql.end();
