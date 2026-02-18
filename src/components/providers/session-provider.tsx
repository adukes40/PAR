"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Watches session status; when the JWT expires and the periodic refetch
 * returns "unauthenticated", automatically signs the user out and
 * redirects to the login page.
 */
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if already on an auth page
    if (pathname.startsWith("/auth")) return;

    if (status === "unauthenticated") {
      signOut({ callbackUrl: "/auth/signin" });
    }
  }, [status, pathname]);

  return <>{children}</>;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Re-check session every 5 minutes; if the JWT has expired,
      // NextAuth returns an unauthenticated response and useSession()
      // status flips to "unauthenticated", triggering client-side redirect.
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
    >
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
