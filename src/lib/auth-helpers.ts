import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
}

interface AuthSession {
  user: AuthUser;
  expires: string;
}

type AuthSuccess = { session: AuthSession; error?: undefined };
type AuthError = { session?: undefined; error: NextResponse };

/**
 * Require authentication for an API route.
 * Returns the session if authenticated, or a 401 response.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session: session as unknown as AuthSession };
}

/**
 * Require admin role for an API route.
 * Returns the session if admin, or a 401/403 response.
 */
export async function requireAdmin(): Promise<AuthSuccess | AuthError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = session.user as unknown as AuthUser;
  if (user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session: session as unknown as AuthSession };
}

/**
 * Require HR or Admin role for an API route.
 * Returns the session if HR or ADMIN, or a 401/403 response.
 */
export async function requireHROrAdmin(): Promise<AuthSuccess | AuthError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = session.user as unknown as AuthUser;
  if (user.role !== "ADMIN" && user.role !== "HR") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session: session as unknown as AuthSession };
}

/**
 * Require approver-level access (ADMIN, HR, or AUTHORIZER) for an API route.
 * Returns the session if authorized, or a 401/403 response.
 */
export async function requireApprover(): Promise<AuthSuccess | AuthError> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = session.user as unknown as AuthUser;
  if (user.role !== "ADMIN" && user.role !== "HR" && user.role !== "AUTHORIZER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session: session as unknown as AuthSession };
}
