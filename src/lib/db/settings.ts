import { prisma } from "@/lib/prisma";

// In-memory cache to avoid DB hits on every auth request
const settingsCache = new Map<string, string>();
let cacheLoaded = false;

async function ensureCache() {
  if (cacheLoaded) return;
  const all = await prisma.appSetting.findMany();
  for (const s of all) {
    settingsCache.set(s.key, s.value);
  }
  cacheLoaded = true;
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureCache();
  return settingsCache.get(key) ?? null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  await ensureCache();
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = settingsCache.get(key) ?? null;
  }
  return result;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  // Invalidate cache so next read picks up the new value
  settingsCache.set(key, value);
}

export function invalidateSettingsCache() {
  settingsCache.clear();
  cacheLoaded = false;
}
