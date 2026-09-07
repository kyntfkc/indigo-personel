import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const raw = process.env.DATABASE_URL;
if (!raw) throw new Error("no DATABASE_URL");
const url = raw.replace(/[?&]channel_binding=require/g, "");
const sql = neon(url);
const users = await sql`select email, role from users`;
const employees = await sql`select first_name, last_name from employees`;
console.log(JSON.stringify({ users, employees }, null, 2));
