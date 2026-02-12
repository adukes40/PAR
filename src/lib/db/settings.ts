import { prisma } from "@/lib/prisma";

// In-memory cache with TTL to avoid stale reads across runtimes
const settingsCache = new Map<string, string>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

function isCacheValid() {
  return cacheLoadedAt > 0 && Date.now() - cacheLoadedAt < CACHE_TTL_MS;
}

async function ensureCache() {
  if (isCacheValid()) return;
  const all = await prisma.appSetting.findMany();
  settingsCache.clear();
  for (const s of all) {
    settingsCache.set(s.key, s.value);
  }
  cacheLoadedAt = Date.now();
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
  // Update local cache immediately
  settingsCache.set(key, value);
  cacheLoadedAt = Date.now();
}

export function invalidateSettingsCache() {
  settingsCache.clear();
  cacheLoadedAt = 0;
}
