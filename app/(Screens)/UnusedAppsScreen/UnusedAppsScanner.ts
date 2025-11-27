// improved-unused-apps-scanner.ts
import { getInstalledApps } from "@zecky-dev/react-native-app-list";

const MILLIS_PER_DAY = 86_400_000;
const UNUSED_DAY_THRESHOLD = 30; // base days since last use considered "old"
const FOREGROUND_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SMALL_CACHE_THRESHOLD_BYTES = 15 * 1024 * 1024; // 15 MB
// Adjusted detection threshold (higher resolution)
const UNUSED_SCORE_THRESHOLD = 4.0;

// Weight constants (tune these for your desired sensitivity)
const WEIGHTS = {
  neverOpened: 3.0,
  daysSinceLastUsedPerDay: 0.02, // score per day not used
  lowForegroundTime: 1.0,
  zeroNotifications: 0.75,
  smallCache: 0.25,
  largeAppSize: 0.75,
  oldInstallDaysPerDay: 0.005,
  neverUpdated: 0.5,
  zeroLaunchCount: 2.0,
  lowDataUsage: 0.5,
  lowBatteryUsage: 0.25,
  manyPermissions: -0.5, // reduce likelihood if app has many permissions (likely important)
  foregroundServicePresent: -1.5, // likely important if app uses foreground service
};

export type UnusedApp = {
  packageName: string;
  name: string;
  icon?: string;
  version?: string;
  lastUsed: number | null;
  totalForegroundTime: number | null;
  notificationInteractions: number | null;
  cacheSize: number | null;
  installTime: number | null;
  lastUpdateTime: number | null;
  dataUsageBytes: number | null;
  batteryUsage: number | null;
  launchCount: number | null;
  permissionCount: number | null;
  foregroundServicePresent?: boolean | null;
  appSizeBytes?: number | null;
  unusedScore: number;
  isSystemApp?: boolean;
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
  firstInstallTime?: number | null;
  installTime?: number | null;
  lastUpdateTime?: number | null;
  dataUsage?: number | null;
  mobileData?: number | null;
  wifiData?: number | null;
  batteryUsage?: number | null;
  launchCount?: number | null;
  runCount?: number | null;
  permissionCount?: number | null;
  usesForegroundService?: boolean | null;
  appSize?: number | null;
};

const installedAppsCache: {
  snapshot: InstalledAppInfo[] | null;
  promise: Promise<InstalledAppInfo[]> | null;
} = {
  snapshot: null,
  promise: null,
};

export async function scanUnusedApps(): Promise<UnusedApp[]> {
  const installedApps = await fetchInstalledApps(true);
  // filter out obvious system apps unless explicitly considered
  const userInstalledApps = installedApps.filter((app) => app.isSystemApp !== true);

  const now = Date.now();

  const scoredApps: UnusedApp[] = userInstalledApps.map((app) => {
    const lastUsed = normalizeNumber(app.lastUsed);
    const totalForegroundTime = normalizeNumber(app.totalForegroundTime);
    const notificationInteractions = normalizeNumber(app.notificationInteractions);
    const cacheSize = normalizeNumber(app.cacheSize);
    const installTime = normalizeNumber(app.installTime ?? app.firstInstallTime);
    const lastUpdateTime = normalizeNumber(app.lastUpdateTime);
    const dataUsage =
      normalizeNumber(app.dataUsage) ?? (normalizeNumber(app.mobileData) ?? normalizeNumber(app.wifiData));
    const batteryUsage = normalizeNumber(app.batteryUsage);
    const launchCount = normalizeNumber(app.launchCount ?? app.runCount);
    const permissionCount = normalizeNumber(app.permissionCount);
    const foregroundServicePresent = typeof app.usesForegroundService === "boolean" ? app.usesForegroundService : null;
    const appSizeBytes = normalizeNumber(app.appSize);

    const unusedScore = computeUnusedScoreV2({
      lastUsed,
      now,
      totalForegroundTime,
      notificationInteractions,
      cacheSize,
      installTime,
      lastUpdateTime,
      dataUsage,
      batteryUsage,
      launchCount,
      permissionCount,
      foregroundServicePresent,
      appSizeBytes,
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
      installTime,
      lastUpdateTime,
      dataUsageBytes: dataUsage,
      batteryUsage,
      launchCount,
      permissionCount,
      foregroundServicePresent,
      appSizeBytes,
      unusedScore,
      isSystemApp: app.isSystemApp,
    };
  });

  // sort by highest score first, and then by oldest lastUsed
  return scoredApps
    .filter((a) => a.unusedScore >= UNUSED_SCORE_THRESHOLD)
    .sort((a, b) => {
      if (b.unusedScore !== a.unusedScore) return b.unusedScore - a.unusedScore;
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
      if (!packageName) continue;
      if (seen.has(packageName)) continue;

      seen.set(packageName, {
        packageName,
        name: extractAppName(app, packageName),
        icon: extractIcon(app),
        version: typeof app.version === "string" ? app.version : undefined,
        lastUsed: extractNumericField(app, ["lastUsedTime", "lastTimeUsed", "lastUsed"]),
        totalForegroundTime: extractNumericField(app, ["totalTimeForeground", "totalTimeInForeground", "foregroundTime", "usageTime"]),
        notificationInteractions: extractNumericField(app, ["notificationInteractions", "notifCount", "notificationCount"]),
        cacheSize: extractNumericField(app, ["cacheSize", "appCache", "appSize", "size", "storageSize"]),
        isSystemApp: extractBooleanField(app, ["isSystemApp", "systemApp", "isSystem", "system"]),
        firstInstallTime: extractNumericField(app, ["firstInstallTime", "firstInstalled", "installTime", "installedAt"]),
        installTime: extractNumericField(app, ["installTime", "firstInstallTime", "installedAt"]),
        lastUpdateTime: extractNumericField(app, ["lastUpdateTime", "lastUpdated", "updateTime"]),
        dataUsage: extractNumericField(app, ["dataUsage", "networkBytes", "rxBytes", "txBytes", "mobileData", "wifiData"]),
        mobileData: extractNumericField(app, ["mobileData", "mobileBytes", "rxMobile", "txMobile"]),
        wifiData: extractNumericField(app, ["wifiData", "wifiBytes", "rxWifi", "txWifi"]),
        batteryUsage: extractNumericField(app, ["batteryUsage", "batteryPercent", "batteryMah"]),
        launchCount: extractNumericField(app, ["launchCount", "openCount", "runCount", "usageCount"]),
        runCount: extractNumericField(app, ["runCount", "runTimes"]),
        permissionCount: extractNumericField(app, ["permissionCount", "permissionsCount", "permCount"]),
        usesForegroundService: extractBooleanField(app, ["usesForegroundService", "foregroundService", "hasForegroundService"]),
        appSize: extractNumericField(app, ["appSize", "packageSize", "apkSize", "size", "storageSize"]),
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

/* -------------------------
   Scoring: computeUnusedScoreV2
   Combines many signals. Tunable weights.
   ------------------------- */
function computeUnusedScoreV2({
  lastUsed,
  now,
  totalForegroundTime,
  notificationInteractions,
  cacheSize,
  installTime,
  lastUpdateTime,
  dataUsage,
  batteryUsage,
  launchCount,
  permissionCount,
  foregroundServicePresent,
  appSizeBytes,
  isSystemApp,
}: {
  lastUsed: number | null;
  now: number;
  totalForegroundTime: number | null;
  notificationInteractions: number | null;
  cacheSize: number | null;
  installTime: number | null;
  lastUpdateTime: number | null;
  dataUsage: number | null;
  batteryUsage: number | null;
  launchCount: number | null;
  permissionCount: number | null;
  foregroundServicePresent?: boolean | null;
  appSizeBytes?: number | null;
  isSystemApp?: boolean;
}): number {
  let score = 0;
  // Never opened (explicit 0 meaning never) gets big boost (but ignore for system apps)
  if (!isSystemApp && lastUsed === 0) {
    score += WEIGHTS.neverOpened;
  }

  // Days since last used: linear contribution
  if (typeof lastUsed === "number" && lastUsed > 0) {
    const days = (now - lastUsed) / MILLIS_PER_DAY;
    if (days > UNUSED_DAY_THRESHOLD) {
      // baseline boost for being older than threshold
      score += WEIGHTS.daysSinceLastUsedPerDay * days;
    }
  } else if (lastUsed === null) {
    // if lastUsed is missing but we have other signals, give some small boost for uncertainty
    score += 0.25;
  }

  // Foreground time: if recorded and very low -> likely unused
  if (typeof totalForegroundTime === "number") {
    if (totalForegroundTime < FOREGROUND_THRESHOLD_MS) {
      score += WEIGHTS.lowForegroundTime;
    } else {
      // long-used apps reduce score a bit (they're used a lot)
      score -= Math.min(1.0, (totalForegroundTime / (60 * 60 * 1000)) * 0.1); // reduce per hour of use
    }
  }

  // Notifications: zero notifications indicates low engagement
  if (typeof notificationInteractions === "number") {
    if (notificationInteractions === 0) score += WEIGHTS.zeroNotifications;
    else score -= Math.min(0.5, notificationInteractions * 0.01);
  }

  // Cache size: very small cache indicates low activity, but tiny effect
  if (typeof cacheSize === "number") {
    if (cacheSize <= SMALL_CACHE_THRESHOLD_BYTES) score += WEIGHTS.smallCache;
    else score -= 0.1; // app that actively uses cache likely used
  }

  // App size: surprisingly, large apps (games etc) that were never used might be uninstall candidates
  if (typeof appSizeBytes === "number") {
    if (appSizeBytes > 100 * 1024 * 1024) score += WEIGHTS.largeAppSize; // >100MB
  }

  // Install age: old installs that haven't been used recently are suspicious
  if (typeof installTime === "number") {
    const daysInstalled = (now - installTime) / MILLIS_PER_DAY;
    score += WEIGHTS.oldInstallDaysPerDay * Math.min(daysInstalled, 3650); // cap
  }

  // Last update time: if never updated for a long time, small boost (not decisive)
  if (typeof lastUpdateTime === "number") {
    const daysSinceUpdate = (now - lastUpdateTime) / MILLIS_PER_DAY;
    if (daysSinceUpdate > 365) score += WEIGHTS.neverUpdated;
  }

  // Launch count: if recorded and zero, big boost
  if (typeof launchCount === "number") {
    if (launchCount === 0) score += WEIGHTS.zeroLaunchCount;
    else score -= Math.min(2.0, launchCount * 0.05);
  } else {
    // unknown launchCount -> small uncertainty boost
    score += 0.2;
  }

  // Data usage & battery usage: low usage -> boost, high usage -> penalty
  if (typeof dataUsage === "number") {
    if (dataUsage < 1024 * 1024) score += WEIGHTS.lowDataUsage; // <1MB
    else score -= Math.min(0.5, dataUsage / (1024 * 1024 * 500)); // penalize heavy network activity
  }

  if (typeof batteryUsage === "number") {
    if (batteryUsage < 1) score += WEIGHTS.lowBatteryUsage; // very low battery impact
    else score -= Math.min(0.5, batteryUsage * 0.01);
  }

  // Permissions: more permissions implies app may be important -> reduce unused score
  if (typeof permissionCount === "number") {
    score += WEIGHTS.manyPermissions * Math.min(permissionCount / 10, 1);
  }

  // Foreground service presence: apps that run foreground service are important e.g., music/fitness/tracker
  if (typeof foregroundServicePresent === "boolean") {
    if (foregroundServicePresent) score += WEIGHTS.foregroundServicePresent;
  }

  // System apps should be penalized from being marked unused unless other signals strongly indicate
  if (isSystemApp) {
    score = Math.max(0, score - 2.0);
  }

  // round to 2 decimals
  return Math.round(score * 100) / 100;
}

/* -------------------------
   Utility helpers
   ------------------------- */
function normalizeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return null;
}

function extractPackageName(app: Record<string, unknown>): string | null {
  const candidates = [
    (app as any).packageName,
    (app as any).bundleIdentifier,
    (app as any).id,
    (app as any).appId,
    (app as any).appName,
    (app as any).name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function extractAppName(app: Record<string, unknown>, fallback: string): string {
  const candidates = [(app as any).appName, (app as any).name, (app as any).label, (app as any).displayName];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return fallback;
}

function extractIcon(app: Record<string, unknown>): string | undefined {
  const possibleIcon = (app as any).icon || (app as any).iconBase64 || (app as any).iconUri || (app as any).iconPath || (app as any).iconUrl;
  if (!possibleIcon) return undefined;
  if (typeof possibleIcon === "string") {
    const trimmed = possibleIcon.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("file://") || trimmed.startsWith("content://") || trimmed.startsWith("http")) return trimmed;
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(trimmed)) return `data:image/png;base64,${trimmed}`;
  }
  if (typeof possibleIcon === "object" && possibleIcon !== null) {
    const uri = (possibleIcon as any).uri;
    if (typeof uri === "string") return uri;
  }
  return undefined;
}

function extractNumericField(app: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = (app as any)[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function extractBooleanField(app: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = (app as any)[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
  }
  return undefined;
}
