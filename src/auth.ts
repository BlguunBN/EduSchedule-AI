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
              // Minimal scopes to avoid tenant/admin consent friction.
              // Mail.Read is NOT requested here — it must be granted separately
              // via app registration admin consent in the Azure portal.
              scope: "openid profile email offline_access User.Read",
              // Always show account picker so users can switch/add another Microsoft account.
              prompt: "select_account",
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
        session.user.name = user.name;
        session.user.email = user.email;
      }
      return session;
    },
  },
});
