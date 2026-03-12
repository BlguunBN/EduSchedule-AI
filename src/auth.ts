import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const tenantId = process.env.AUTH_MICROSOFT_TENANT_ID ?? "common";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_CLIENT_ID ?? "placeholder-client-id",
      clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET ?? "placeholder-client-secret",
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read Calendars.ReadWrite Mail.Read",
        },
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role ?? "STUDENT";
      }
      return session;
    },
  },
});
