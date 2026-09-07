import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, employees } from "@/lib/db/schema";

export type AppRole = "admin" | "personel";

declare module "next-auth" {
  interface User {
    role: AppRole;
    employeeId?: string | null;
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.userId, user.id))
          .limit(1);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: employee?.id ?? null,
          name: employee
            ? `${employee.firstName} ${employee.lastName}`
            : user.email,
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
  },
  trustHost: true,
});
