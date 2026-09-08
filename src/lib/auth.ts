import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, employees } from "@/lib/db/schema";

export type AppRole = "admin" | "personel";

declare module "next-auth" {
  interface User {
    role: AppRole;
    employeeId?: string | null;
    remember?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: AppRole;
      employeeId?: string | null;
      name?: string | null;
    } & DefaultSession["user"];
  }
}

const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 gün
const SESSION_MAX_AGE_DEFAULT = 12 * 60 * 60; // 12 saat

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        login: { label: "Kullanıcı adı veya e-posta", type: "text" },
        password: { label: "Şifre", type: "password" },
        remember: { label: "Beni hatırla", type: "text" },
      },
      async authorize(credentials) {
        const login = String(credentials?.login || "")
          .trim()
          .toLowerCase();
        const password = credentials?.password as string | undefined;
        const remember =
          credentials?.remember === "true" || credentials?.remember === true;
        if (!login || !password) return null;

        const db = getDb();
        const isEmail = login.includes("@");

        const [user] = await db
          .select()
          .from(users)
          .where(
            isEmail
              ? eq(users.email, login)
              : sql`lower(${users.username}) = ${login}`
          )
          .limit(1);

        if (!user) return null;

        // Personel: kullanıcı adı zorunlu (eski hesaplarda username yoksa e-posta kabul)
        if (user.role === "personel" && isEmail && user.username) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, user.id))
          .limit(1);

        return {
          id: user.id,
          email: user.email ?? user.username ?? "",
          role: user.role,
          employeeId: employee?.id ?? null,
          name: employee
            ? `${employee.firstName} ${employee.lastName}`
            : user.username ?? user.email ?? "",
          remember,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.sub = user.id;
        token.remember = Boolean(user.remember);
        const maxAge = token.remember
          ? SESSION_MAX_AGE_REMEMBER
          : SESSION_MAX_AGE_DEFAULT;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as AppRole) || "personel";
        session.user.employeeId = (token.employeeId as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/giris",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_REMEMBER,
  },
  trustHost: true,
});
