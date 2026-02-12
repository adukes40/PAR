import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that don't require authentication
const publicPaths = ["/auth", "/api/auth"];

// Role-based access control for pages
const pageRoleMap: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin/settings", roles: ["ADMIN"] },
  { prefix: "/admin/audit-log", roles: ["ADMIN"] },
  { prefix: "/admin/dropdowns", roles: ["ADMIN", "HR"] },
  { prefix: "/admin/approvers", roles: ["ADMIN", "HR"] },
  { prefix: "/admin/users", roles: ["ADMIN", "HR"] },
  { prefix: "/approvals", roles: ["ADMIN", "HR", "AUTHORIZER"] },
];

// Role-based access control for API write operations
const apiWriteRoleMap: { prefix: string; roles: string[] }[] = [
  { prefix: "/api/settings", roles: ["ADMIN"] },
  { prefix: "/api/audit-logs", roles: ["ADMIN"] },
  { prefix: "/api/approvers", roles: ["ADMIN", "HR"] },
  { prefix: "/api/dropdowns", roles: ["ADMIN", "HR"] },
  { prefix: "/api/users", roles: ["ADMIN", "HR"] },
  { prefix: "/api/approvals", roles: ["ADMIN", "HR", "AUTHORIZER"] },
];

function isPublicPath(pathname: string) {
  return publicPaths.some((p) => pathname.startsWith(p));
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

function getAllowedRolesForPage(pathname: string): string[] | null {
  for (const { prefix, roles } of pageRoleMap) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null; // No restriction — any authenticated user
}

function getAllowedRolesForApiWrite(pathname: string, method: string): string[] | null {
  if (method === "GET") return null;
  for (const { prefix, roles } of apiWriteRoleMap) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Allow static assets and public paths
  if (isStaticAsset(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  if (!req.auth?.user) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Page routes redirect to sign-in
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const userRole = (req.auth.user as any).role as string | undefined;

  // Check page access
  const pageRoles = getAllowedRolesForPage(pathname);
  if (pageRoles && (!userRole || !pageRoles.includes(userRole))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check API write access
  const apiRoles = getAllowedRolesForApiWrite(pathname, method);
  if (apiRoles && (!userRole || !apiRoles.includes(userRole))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
