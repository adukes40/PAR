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

        const groups = await checkGroupMembership(user.email);

        // If Admin SDK is not configured (groups check returned empty due to no credentials),
        // check if credentials are actually configured before denying
        if (groups.length === 0) {
          const { getSetting } = await import("@/lib/db/settings");
          const keyJson = await getSetting("google_service_account_key");
          const adminEmail = await getSetting("google_admin_email");

          if (!keyJson || !adminEmail) {
            // Admin SDK not configured yet — allow sign-in (graceful fallback)
            console.warn("Google Admin SDK not configured, allowing sign-in without group check");
            return true;
          }

          // Verify the key is actually valid JSON with required fields
          try {
            const parsed = JSON.parse(keyJson);
            if (!parsed.client_email || !parsed.private_key) {
              console.warn("Google service account key missing client_email or private_key, allowing sign-in");
              return true;
            }
          } catch {
            console.warn("Google service account key is not valid JSON, allowing sign-in");
            return true;
          }

          // Admin SDK is configured but user is not in any group — deny
          return false;
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
        // On error, allow sign-in to avoid locking out all users
        return true;
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
