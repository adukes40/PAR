import { google } from "googleapis";
import { getSetting } from "@/lib/db/settings";
import { ROLE_PRIORITY, type UserRole } from "@/lib/constants";

// Group setting keys and their default emails
const GROUP_CONFIG: { settingKey: string; role: UserRole; defaultEmail: string }[] = [
  { settingKey: "google_group_admins", role: "ADMIN", defaultEmail: "paradmins@cr.k12.de.us" },
  { settingKey: "google_group_hr", role: "HR", defaultEmail: "parhrusers@cr.k12.de.us" },
  { settingKey: "google_group_authorizers", role: "AUTHORIZER", defaultEmail: "parauthorizers@cr.k12.de.us" },
  { settingKey: "google_group_users", role: "USER", defaultEmail: "parusers@cr.k12.de.us" },
];

/**
 * Builds an authenticated Google Admin SDK client using service account
 * credentials and domain-wide delegation impersonation.
 */
async function getAdminClient() {
  const keyJson = await getSetting("google_service_account_key");
  const adminEmail = await getSetting("google_admin_email");

  if (!keyJson || !adminEmail) {
    return null;
  }

  let key: { client_email: string; private_key: string };
  try {
    key = JSON.parse(keyJson);
  } catch {
    console.error("Failed to parse google_service_account_key JSON");
    return null;
  }

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/admin.directory.group"],
    subject: adminEmail,
  });

  return google.admin({ version: "directory_v1", auth });
}

/**
 * Returns the group email for a given role, reading from AppSetting with fallback to defaults.
 */
async function getGroupEmail(settingKey: string, defaultEmail: string): Promise<string> {
  const custom = await getSetting(settingKey);
  return custom || defaultEmail;
}

/**
 * Checks which PAR Google Groups a user belongs to.
 * Returns an array of matched role keys (e.g. ["HR", "USER"]).
 */
export async function checkGroupMembership(email: string): Promise<UserRole[]> {
  const client = await getAdminClient();
  if (!client) {
    // Admin SDK not configured — graceful fallback
    console.warn("Google Admin SDK not configured, skipping group membership check");
    return [];
  }

  const results = await Promise.allSettled(
    GROUP_CONFIG.map(async ({ settingKey, role, defaultEmail }) => {
      const groupEmail = await getGroupEmail(settingKey, defaultEmail);
      try {
        const res = await client.members.hasMember({
          groupKey: groupEmail,
          memberKey: email,
        });
        return res.data.isMember ? role : null;
      } catch (err: unknown) {
        // 404 means user is not a member — not an error
        const status = (err as { code?: number })?.code;
        if (status === 404) return null;
        console.error(`Error checking membership in ${groupEmail}:`, err);
        return null;
      }
    })
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is UserRole => r !== null);
}

/**
 * Given an array of matched roles, returns the single highest-priority role.
 * Priority: ADMIN > HR > AUTHORIZER > USER
 */
export function mapGroupsToRole(groups: UserRole[]): UserRole {
  for (const role of ROLE_PRIORITY) {
    if (groups.includes(role)) return role;
  }
  return "USER";
}

/**
 * Adds a user to a Google Group.
 */
export async function addMemberToGroup(email: string, groupEmail: string): Promise<boolean> {
  const client = await getAdminClient();
  if (!client) {
    console.warn("Google Admin SDK not configured, skipping group add");
    return false;
  }

  try {
    await client.members.insert({
      groupKey: groupEmail,
      requestBody: {
        email,
        role: "MEMBER",
      },
    });
    return true;
  } catch (err: unknown) {
    // 409 = already a member
    const status = (err as { code?: number })?.code;
    if (status === 409) return true;
    const errors = (err as { errors?: unknown[] })?.errors;
    console.error(`Error adding ${email} to ${groupEmail}: code=${status}`,
      JSON.stringify({ message: (err as Error)?.message, errors }, null, 2));
    return false;
  }
}

/**
 * Removes a user from a Google Group.
 */
export async function removeMemberFromGroup(email: string, groupEmail: string): Promise<boolean> {
  const client = await getAdminClient();
  if (!client) {
    console.warn("Google Admin SDK not configured, skipping group remove");
    return false;
  }

  try {
    await client.members.delete({
      groupKey: groupEmail,
      memberKey: email,
    });
    return true;
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 404) return true; // already not a member
    console.error(`Error removing ${email} from ${groupEmail}:`, err);
    return false;
  }
}

/**
 * Returns the default PAR_Users group email.
 */
export async function getUsersGroupEmail(): Promise<string> {
  const cfg = GROUP_CONFIG.find((g) => g.role === "USER")!;
  return getGroupEmail(cfg.settingKey, cfg.defaultEmail);
}

/**
 * Returns the Google Group email for a given role.
 */
export async function getGroupEmailForRole(role: UserRole): Promise<string> {
  const cfg = GROUP_CONFIG.find((g) => g.role === role) ?? GROUP_CONFIG.find((g) => g.role === "USER")!;
  return getGroupEmail(cfg.settingKey, cfg.defaultEmail);
}

/**
 * Tests the Google Admin SDK connection by listing members of the users group.
 * Returns { success, message }.
 */
export async function testGoogleConnection(): Promise<{ success: boolean; message: string }> {
  const client = await getAdminClient();
  if (!client) {
    return { success: false, message: "Service account key or admin email not configured." };
  }

  try {
    const usersGroupEmail = await getUsersGroupEmail();
    await client.members.list({
      groupKey: usersGroupEmail,
      maxResults: 1,
    });
    return { success: true, message: `Successfully connected and queried ${usersGroupEmail}.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Connection test failed: ${message}` };
  }
}
