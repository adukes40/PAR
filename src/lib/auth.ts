import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
// google-admin is imported dynamically in the signIn callback to avoid
// pulling googleapis into the Edge runtime (middleware runs on Edge).

/**
 * Build the providers list.
 * Google is only included when both Client ID and Secret are set
 * (from env vars — the settings API writes to .env.docker and requires restart).
 */
function buildProviders() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providers: any[] = [];

  if (googleClientId && googleClientSecret) {
    providers.push(
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  providers.push(
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    })
  );

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account }) {
      // Local admin (credentials) bypasses group check
      if (account?.provider === "credentials") return true;

      if (!user.email) return false;

      try {
        // Dynamic import to avoid pulling googleapis into Edge runtime
        const { checkGroupMembership, mapGroupsToRole } = await import("@/lib/google-admin");

        const { getSetting } = await import("@/lib/db/settings");
        const keyJson = await getSetting("google_service_account_key");
        const adminEmailSetting = await getSetting("google_admin_email");

        // If Admin SDK is not configured yet, deny Google sign-ins.
        // All users must be in a Google group to access PAR.
        if (!keyJson || !adminEmailSetting) {
          console.warn("Google Admin SDK not configured — denying Google sign-in (no group verification possible)");
          return "/auth/signin?error=AccessDenied";
        }

        const groups = await checkGroupMembership(user.email);

        if (groups.length === 0) {
          // User is not in any PAR Google group — deny access
          console.warn(`User ${user.email} is not a member of any PAR Google group — access denied`);
          return "/auth/signin?error=AccessDenied";
        }

        // Update role in DB based on group membership
        const role = mapGroupsToRole(groups);
        await prisma.user.update({
          where: { email: user.email },
          data: { role },
        });

        return true;
      } catch (err) {
        console.error("Error in signIn callback:", err);
        // On error, deny sign-in rather than granting unauthorized access
        return "/auth/signin?error=AccessDenied";
      }
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.id = user.id;
      }

      // On sign-in, re-read role from DB since signIn callback may have updated it
      if (trigger === "signIn" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (session.user as any).role = token.role as string;
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
});
