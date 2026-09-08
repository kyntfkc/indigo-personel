import { config } from "dotenv";
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { employees, users } from "../src/lib/db/schema";
import { generateQrToken } from "../src/lib/utils-app";

const PASSWORD = "Indigo123";

const people = [
  {
    firstName: "Ercan",
    lastName: "Seymen",
    username: "ercan",
    department: "Üretim",
    email: "ercsymn19@gmail.com",
    phone: "0535 777 18 26",
    hireDate: "2017-12-14",
    tcKimlik: "34450829904",
    bloodType: "A Rh (+)",
    birthDate: "1981-10-25",
    address: "İnönü Mah. 416. Sok. No:7 D:4 Bağcılar",
    emergencyContact: "Cennet Seymen / 0535 777 18 26",
  },
  {
    firstName: "Uğur",
    lastName: "İşçi",
    username: "ugur",
    department: "Üretim",
    email: "ugur_isci@hotmail.com",
    phone: "0532 640 09 31",
    hireDate: "2018-10-01",
    tcKimlik: "12689639600",
    bloodType: "B Rh (+)",
    birthDate: "1977-09-09",
    address: "Maraşel Çakmak Mah. Selim Sok. 16/4 Güngören",
    emergencyContact: "Yasemin İşci / 0535 414 46 66",
  },
  {
    firstName: "Murat",
    lastName: "Alıç",
    username: "murat",
    department: "Üretim",
    email: "muratalic7@gmail.com",
    phone: "0541 548 99 28",
    hireDate: "2020-07-06",
    tcKimlik: "32015421334",
    bloodType: "0 Rh (-)",
    birthDate: "1988-01-01",
    address: "Balıkyolu Mah. 476. Sokak No:42 D:5 Esenyurt",
    emergencyContact: "Hasan Alıç / 0534 669 14 59",
  },
] as const;

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

async function main() {
  const client = postgres(resolveDatabaseUrl(), {
    prepare: false,
    max: 1,
    ssl: "require",
  });
  const db = drizzle(client);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const person of people) {
    const [existingEmp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.firstName, person.firstName),
          eq(employees.lastName, person.lastName)
        )
      )
      .limit(1);

    if (existingEmp) {
      console.log(`Atlandı (var): ${person.firstName} ${person.lastName}`);
      continue;
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${person.username}`)
      .limit(1);

    let userId = existingUser?.id ?? null;
    if (!userId) {
      const [user] = await db
        .insert(users)
        .values({
          username: person.username,
          email: person.email.toLowerCase(),
          passwordHash,
          role: "personel",
        })
        .returning();
      userId = user.id;
      console.log(`Kullanıcı: ${person.username}`);
    } else {
      console.log(`Kullanıcı mevcut: ${person.username}`);
    }

    const [employee] = await db
      .insert(employees)
      .values({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        department: person.department,
        hireDate: person.hireDate,
        tcKimlik: person.tcKimlik,
        bloodType: person.bloodType,
        birthDate: person.birthDate,
        address: person.address,
        emergencyContact: person.emergencyContact,
        qrToken: generateQrToken(),
        userId,
        active: true,
      })
      .returning();

    console.log(`Personel: ${employee.firstName} ${employee.lastName} (${employee.id})`);
  }

  await client.end();
  console.log("Import tamam.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
