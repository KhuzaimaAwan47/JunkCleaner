import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { getInstalledApps } from "@zecky-dev/react-native-app-list";

export type InstalledApp = {
  id: string;
  name: string;
  packageName: string;
  lastUsed?: number | null;
  icon?: string;
  requiresPermission?: boolean;
  daysIdle?: number | null;
  score?: number;
};

type UseUnusedAppsResult = {
  apps: InstalledApp[];
  unusedApps: InstalledApp[];
  isLoading: boolean;
  refresh: () => void;
  hasUsageStats: boolean;
};

// Placeholder modules - replace with actual native modules when available
const UsageStatsModule = {
  getUsageStats: async (): Promise<{ packageName: string; lastTimeUsed: number }[]> => {
    // TODO: Replace with actual UsageStatsModule implementation
    const installedApps = await getInstalledApps();
    return installedApps
      .map((app: any) => ({
        packageName: app.bundleIdentifier || app.packageName || app.id || app.appName || app.label,
        lastTimeUsed: app.lastUsedTime || app.lastTimeUsed || 0,
      }))
      .filter((app) => app.lastTimeUsed > 0);
  },
};

const AppInfoModule = {
  getInstalledApps: async () => {
    const installedApps = await getInstalledApps();
    return installedApps.map((app: any) => {
      const packageName = app.bundleIdentifier || app.packageName || app.id || app.appName || app.label;
      const iconSource =
        app.icon ||
        app.iconBase64 ||
        app.iconUri ||
        app.iconPath ||
        app.iconUrl ||
        (typeof app.icon === "object" && app.icon !== null ? app.icon?.uri : undefined);
      return {
        packageName,
        appName: app.appName || app.name || app.label || packageName,
        firstInstallTime: app.firstInstallTime || app.installTime || 0,
        lastTimeUsed: app.lastUsedTime || app.lastTimeUsed || 0,
        icon: normalizeIconValue(iconSource),
      };
    });
  },
};

const UsageStatsModuleWithDuration = {
  getUsageStatsWithDuration: async (): Promise<{ packageName: string; totalTimeForeground: number }[]> => {
    // TODO: Replace with actual UsageStatsModule.getUsageStatsWithDuration implementation
    return [];
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NotificationStatsModule = {
  getNotificationStats: async (): Promise<{ packageName: string; notifCount: number }[]> => {
    // TODO: Replace with actual NotificationStatsModule implementation
    return [];
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StorageStatsModule = {
  getAppStorageInfo: async (): Promise<{ packageName: string; lastModified: number }[]> => {
    // TODO: Replace with actual StorageStatsModule implementation
    return [];
  },
};

const ICON_CACHE_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}app-icons/` : null;
let didEnsureIconDir = false;

async function ensureIconCacheDir() {
  if (!ICON_CACHE_DIR || didEnsureIconDir) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(ICON_CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(ICON_CACHE_DIR, { intermediates: true });
    }
    didEnsureIconDir = true;
  } catch (error) {
    console.warn("failed to prepare icon cache directory", error);
  }
}

function sanitizePackageForFilename(packageName: string) {
  return packageName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function cacheDataUriIcon(dataUri: string, packageName: string) {
  if (!ICON_CACHE_DIR) {
    return dataUri;
  }

  try {
    const [, payload] = dataUri.split(",", 2);
    if (!payload) {
      return dataUri;
    }

    await ensureIconCacheDir();

    const mimeMatch = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const extension = mimeMatch?.[1]?.split("/")?.[1] ?? "png";
    const cachePath = `${ICON_CACHE_DIR}${sanitizePackageForFilename(packageName)}.${extension}`;

    await FileSystem.writeAsStringAsync(cachePath, payload, { encoding: FileSystem.EncodingType.Base64 });
    return cachePath;
  } catch (error) {
    console.warn(`failed to cache icon for ${packageName}`, error);
    return dataUri;
  }
}

async function resolveIconValue(iconValue: unknown, packageName: string) {
  const normalized = normalizeIconValue(iconValue);
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("data:")) {
    return cacheDataUriIcon(normalized, packageName);
  }

  return normalized;
}

function normalizeIconValue(iconValue: unknown): string | undefined {
  if (!iconValue) {
    return undefined;
  }

  if (typeof iconValue === "string") {
    const trimmed = iconValue.trim();

    if (
      trimmed.startsWith("data:") ||
      trimmed.startsWith("file://") ||
      trimmed.startsWith("content://") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(trimmed)) {
      return `data:image/png;base64,${trimmed}`;
    }

    return undefined;
  }

  if (typeof iconValue === "object") {
    const possibleUri = (iconValue as { uri?: string | null })?.uri;
    if (possibleUri) {
      return normalizeIconValue(possibleUri);
    }
  }

  return undefined;
}

async function findUnusedApps() {
  const allApps = await AppInfoModule.getInstalledApps();

  const usage = await UsageStatsModule.getUsageStats();
  const duration = await UsageStatsModuleWithDuration.getUsageStatsWithDuration();

  const used = new Set();

  // Apps opened at least once
  usage.forEach(u => {
    if (u.lastTimeUsed > 0) used.add(u.packageName);
  });

  // Apps used for > 0 seconds
  duration.forEach(f => {
    if (f.totalTimeForeground > 0) used.add(f.packageName);
  });

  // Unused = installed - used
  return allApps.filter(app => !used.has(app.packageName));
}

export function useUnusedApps(): UseUnusedAppsResult {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const previousAppState = useRef<string>(AppState.currentState);

  const { unusedApps, hasUsageStats } = useMemo(() => {
    if (apps.length === 0) {
      return { unusedApps: [], hasUsageStats: false };
    }

    const appsWithScore = apps.filter((app) => app.score !== undefined && app.score >= 60);

    if (appsWithScore.length === 0) {
      // No usage metadata available yet – fall back to returning the raw list so the UI can still render apps
      return {
        unusedApps: [...apps],
        hasUsageStats: false,
      };
    }

    const rankedApps = appsWithScore.sort((a, b) => {
      const aScore = a.score ?? 0;
      const bScore = b.score ?? 0;
      return bScore - aScore;
    });

    return {
      unusedApps: rankedApps,
      hasUsageStats: true,
    };
  }, [apps]);

  const loadApps = useCallback(() => {
    let cancelled = false;

    const fetchApps = async () => {
      setIsLoading(true);

      try {
        const [installedApps, unusedApps] = await Promise.all([
          AppInfoModule.getInstalledApps(),
          findUnusedApps(),
        ]);

        const unusedPackageNames = new Set<string>();
        unusedApps.forEach((app) => {
          unusedPackageNames.add(app.packageName);
        });

        const uniqueApps = new Map<string, typeof installedApps[0]>();

        for (const app of installedApps) {
          if (!uniqueApps.has(app.packageName)) {
            uniqueApps.set(app.packageName, app);
          }
        }

        const appsWithIcons = await Promise.all(
          Array.from(uniqueApps.values()).map(async (app) => {
            const appId = app.packageName;
            const appName = app.appName;
            const icon = await resolveIconValue(app.icon, app.packageName);

            // Try to get lastUsed timestamp if available
            let lastUsed: number | null = null;
            let daysIdle: number | null = null;

            if (Platform.OS === "android") {
              // For Android, check if usage stats data is available
              if (app.lastTimeUsed && app.lastTimeUsed > 0) {
                const usedTime = app.lastTimeUsed;
                lastUsed = usedTime;
                const now = Date.now();
                const daysDiff = Math.floor((now - usedTime) / (1000 * 60 * 60 * 24));
                daysIdle = daysDiff;
              }
            } else {
              lastUsed = null;
              daysIdle = null;
            }

            // Mark as unused if in the unused set
            const isUnused = unusedPackageNames.has(app.packageName);

            return {
              id: appId,
              name: appName,
              packageName: appId,
              lastUsed,
              daysIdle,
              icon,
              requiresPermission: false,
              score: isUnused ? 100 : undefined,
            } satisfies InstalledApp;
          })
        );

        const baseApps: InstalledApp[] = appsWithIcons.sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) {
          setApps(baseApps);
        }
      } catch (error) {
        console.warn("failed to load installed apps", error);
        if (!cancelled) {
          setApps([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchApps();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadApps();
    return cleanup;
  }, [loadApps]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = previousAppState.current;
      previousAppState.current = nextState;

      const wasBackground = prevState === "inactive" || prevState === "background";
      if (wasBackground && nextState === "active") {
        loadApps();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadApps]);

  const refresh = useCallback(() => {
    loadApps();
  }, [loadApps]);

  return {
    apps,
    unusedApps,
    hasUsageStats,
    isLoading,
    refresh,
  };
}

