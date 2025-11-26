import { getInstalledApps } from "@zecky-dev/react-native-app-list";

const MILLIS_PER_DAY = 86_400_000;
const UNUSED_DAY_THRESHOLD = 30;
const FOREGROUND_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SMALL_CACHE_THRESHOLD_BYTES = 15 * 1024 * 1024; // 15 MB
const UNUSED_SCORE_THRESHOLD = 3;

export type UnusedApp = {
  packageName: string;
  name: string;
  icon?: string;
  version?: string;
  lastUsed: number | null;
  totalForegroundTime: number | null;
  notificationInteractions: number | null;
  cacheSize: number | null;
  unusedScore: number;
  isSystemApp?: boolean;
};

type UsageStat = {
  packageName: string;
  lastUsed: number | null;
  totalForegroundTime: number | null;
};

type NotificationStat = {
  packageName: string;
  interactions: number | null;
};

type CacheStat = {
  packageName: string;
  cacheSize: number | null;
};

type InstalledAppInfo = {
  packageName: string;
  name: string;
  icon?: string;
  version?: string;
  lastUsed?: number | null;
  totalForegroundTime?: number;
  notificationInteractions?: number;
  cacheSize?: number;
  isSystemApp?: boolean;
};

type UsageStatParams = {
  interval: "daily" | "weekly" | "monthly";
};

type MemoKey = string;

const installedAppsCache: {
  snapshot: InstalledAppInfo[] | null;
  promise: Promise<InstalledAppInfo[]> | null;
} = {
  snapshot: null,
  promise: null,
};

const usageStatsCache = new Map<MemoKey, Promise<UsageStat[]>>();
const notificationStatsCache = new Map<MemoKey, Promise<NotificationStat[]>>();
const cacheStatsCache = new Map<MemoKey, Promise<CacheStat[]>>();

export async function scanUnusedApps(): Promise<UnusedApp[]> {
  const installedApps = await fetchInstalledApps(true);
  const userInstalledApps = installedApps.filter((app) => app.isSystemApp !== true);

  const [usageStats, notificationStats, cacheStats] = await Promise.all([
    getUsageStats({ interval: "monthly" }),
    getNotificationUsage(),
    getAppCacheSizes(userInstalledApps),
  ]);

  const usageMap = mapByPackage(usageStats);
  const notificationMap = mapByPackage(notificationStats);
  const cacheMap = mapByPackage(cacheStats);

  const now = Date.now();

  const scoredApps: UnusedApp[] = userInstalledApps.map((app) => {
    const usage = usageMap.get(app.packageName);
    const notif = notificationMap.get(app.packageName);
    const cache = cacheMap.get(app.packageName);

    const lastUsedRaw = usage?.lastUsed ?? app.lastUsed ?? null;
    const lastUsed = typeof lastUsedRaw === "number" ? lastUsedRaw : null;

    const totalForegroundRaw = usage?.totalForegroundTime ?? app.totalForegroundTime ?? null;
    const totalForegroundTime = typeof totalForegroundRaw === "number" ? totalForegroundRaw : null;

    const notificationRaw = notif?.interactions ?? app.notificationInteractions ?? null;
    const hasNotificationData = typeof notificationRaw === "number";
    const notificationInteractions = hasNotificationData ? (notificationRaw as number) : null;

    const cacheRaw = cache?.cacheSize ?? app.cacheSize ?? null;
    const cacheSize = typeof cacheRaw === "number" ? cacheRaw : null;

    const unusedScore = computeUnusedScore({
      lastUsed,
      now,
      totalForegroundTime,
      notificationInteractions,
      hasNotificationData,
      cacheSize,
      isSystemApp: app.isSystemApp === true,
    });

    return {
      packageName: app.packageName,
      name: app.name,
      icon: app.icon,
      version: app.version,
      lastUsed,
      totalForegroundTime,
      notificationInteractions,
      cacheSize,
      unusedScore,
      isSystemApp: app.isSystemApp,
    };
  });

  return scoredApps
    .filter((app) => app.unusedScore >= UNUSED_SCORE_THRESHOLD)
    .sort((a, b) => {
      const aLast = a.lastUsed ?? 0;
      const bLast = b.lastUsed ?? 0;
      return aLast - bLast;
    });
}

async function fetchInstalledApps(forceRefresh = false): Promise<InstalledAppInfo[]> {
  if (installedAppsCache.snapshot && !forceRefresh) {
    return installedAppsCache.snapshot;
  }

  if (installedAppsCache.promise && !forceRefresh) {
    return installedAppsCache.promise;
  }

  const fetchPromise = (async () => {
    const rawApps = (await getInstalledApps()) as Record<string, unknown>[];
    const seen = new Map<string, InstalledAppInfo>();

    for (const app of rawApps) {
      const packageName = extractPackageName(app);
      if (!packageName) {
        continue;
      }

      if (seen.has(packageName)) {
        continue;
      }

      seen.set(packageName, {
        packageName,
        name: extractAppName(app, packageName),
        icon: extractIcon(app),
        version: typeof app.version === "string" ? app.version : undefined,
        lastUsed: extractNumericField(app, ["lastUsedTime", "lastTimeUsed"]),
        totalForegroundTime: extractNumericField(app, ["totalTimeForeground", "totalTimeInForeground"]),
        notificationInteractions: extractNumericField(app, ["notificationInteractions", "notifCount", "notificationCount"]),
        cacheSize: extractNumericField(app, ["cacheSize", "appSize", "size", "storageSize"]),
        isSystemApp: extractBooleanField(app, ["isSystemApp", "systemApp", "isSystem", "system"]),
      });
    }

    const normalized = Array.from(seen.values());
    installedAppsCache.snapshot = normalized;
    installedAppsCache.promise = null;
    return normalized;
  })();

  installedAppsCache.promise = fetchPromise;
  return fetchPromise;
}

function extractPackageName(app: Record<string, unknown>): string | null {
  const candidates = [
    app.packageName,
    app.bundleIdentifier,
    app.id,
    app.appId,
    app.appName,
    app.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function extractAppName(app: Record<string, unknown>, fallback: string): string {
  const candidates = [app.appName, app.name, app.label, app.displayName];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return fallback;
}

function extractIcon(app: Record<string, unknown>): string | undefined {
  const possibleIcon = app.icon || app.iconBase64 || app.iconUri || app.iconPath || app.iconUrl;
  if (!possibleIcon) {
    return undefined;
  }

  if (typeof possibleIcon === "string") {
    const trimmed = possibleIcon.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("file://") || trimmed.startsWith("content://") || trimmed.startsWith("http")) {
      return trimmed;
    }

    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(trimmed)) {
      return `data:image/png;base64,${trimmed}`;
    }
  }

  if (typeof possibleIcon === "object" && possibleIcon !== null) {
    const uri = (possibleIcon as { uri?: string }).uri;
    if (typeof uri === "string") {
      return uri;
    }
  }

  return undefined;
}

function extractNumericField(app: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = app[key];
    const numericValue = typeof value === "number" ? value : undefined;
    if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
      return numericValue;
    }
  }
  return undefined;
}

function extractBooleanField(app: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = app[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    if (typeof value === "number") {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
  }
  return undefined;
}

async function getUsageStats(params: UsageStatParams): Promise<UsageStat[]> {
  const cacheKey = JSON.stringify(params);
  if (!usageStatsCache.has(cacheKey)) {
    const promise = (async () => {
      const apps = await fetchInstalledApps();
      return apps.map<UsageStat>((app) => ({
        packageName: app.packageName,
        lastUsed: typeof app.lastUsed === "number" ? app.lastUsed : null,
        totalForegroundTime: typeof app.totalForegroundTime === "number" ? app.totalForegroundTime : null,
      }));
    })();

    usageStatsCache.set(cacheKey, promise);
  }

  return usageStatsCache.get(cacheKey)!;
}

async function getNotificationUsage(): Promise<NotificationStat[]> {
  const cacheKey = "notification-usage";
  if (!notificationStatsCache.has(cacheKey)) {
    const promise = (async () => {
      const apps = await fetchInstalledApps();
      return apps.map<NotificationStat>((app) => ({
        packageName: app.packageName,
        interactions: typeof app.notificationInteractions === "number" ? app.notificationInteractions : null,
      }));
    })();

    notificationStatsCache.set(cacheKey, promise);
  }

  return notificationStatsCache.get(cacheKey)!;
}

async function getAppCacheSizes(installedApps: InstalledAppInfo[]): Promise<CacheStat[]> {
  const signature = installedApps.map((app) => app.packageName).join("|");
  if (!cacheStatsCache.has(signature)) {
    const promise = Promise.resolve(
      installedApps.map<CacheStat>((app) => ({
        packageName: app.packageName,
        cacheSize: typeof app.cacheSize === "number" ? app.cacheSize : null,
      }))
    );
    cacheStatsCache.set(signature, promise);
  }

  return cacheStatsCache.get(signature)!;
}

function computeUnusedScore({
  lastUsed,
  now,
  totalForegroundTime,
  notificationInteractions,
  hasNotificationData,
  cacheSize,
  isSystemApp,
}: {
  lastUsed: number | null;
  now: number;
  totalForegroundTime: number | null;
  notificationInteractions: number | null;
  hasNotificationData: boolean;
  cacheSize: number | null;
  isSystemApp?: boolean;
}): number {
  let score = 0;

  const hasValidLastUsed = typeof lastUsed === "number" && lastUsed > 0;
  const treatedAsNeverOpened = !isSystemApp && lastUsed === 0;
  if (treatedAsNeverOpened || (hasValidLastUsed && now - lastUsed > UNUSED_DAY_THRESHOLD * MILLIS_PER_DAY)) {
    score += 2;
  }

  const hasForegroundData = typeof totalForegroundTime === "number" && totalForegroundTime > 0;
  if (hasForegroundData) {
    const foregroundTime = totalForegroundTime as number;
    if (foregroundTime < FOREGROUND_THRESHOLD_MS) {
      score += 1;
    }
  }

  if (hasNotificationData && notificationInteractions === 0) {
    score += 1;
  }

  if (typeof cacheSize === "number" && cacheSize <= SMALL_CACHE_THRESHOLD_BYTES) {
    score += 0.5;
  }

  return score;
}

function mapByPackage<T extends { packageName: string }>(collection: T[]): Map<string, T> {
  const map = new Map<string, T>();
  collection.forEach((item) => {
    map.set(item.packageName, item);
  });
  return map;
}


