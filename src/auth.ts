import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getMicrosoftAuthConfigStatus } from "@/lib/auth-config";

const microsoft = getMicrosoftAuthConfigStatus();
const allowEmailLinking = process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: microsoft.configured
    ? [
        MicrosoftEntraID({
          clientId: microsoft.clientId,
          clientSecret: microsoft.clientSecret,
          issuer: `https://login.microsoftonline.com/${microsoft.tenantId}/v2.0`,
          allowDangerousEmailAccountLinking: allowEmailLinking,
          authorization: {
            params: {
              // Minimal scopes first to avoid tenant/admin friction during initial sign-in.
              scope: "openid profile email offline_access User.Read",
            },
          },
        }),
      ]
    : [],
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
