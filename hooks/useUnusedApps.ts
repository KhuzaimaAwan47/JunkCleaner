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
      return {
        packageName,
        appName: app.appName || app.name || app.label || packageName,
        firstInstallTime: app.firstInstallTime || app.installTime || 0,
        lastTimeUsed: app.lastUsedTime || app.lastTimeUsed || 0,
        icon: app.icon || app.iconBase64 || app.iconUri || app.iconPath || app.iconUrl || undefined,
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

const NotificationStatsModule = {
  getNotificationStats: async (): Promise<{ packageName: string; notifCount: number }[]> => {
    // TODO: Replace with actual NotificationStatsModule implementation
    return [];
  },
};

const StorageStatsModule = {
  getAppStorageInfo: async (): Promise<{ packageName: string; lastModified: number }[]> => {
    // TODO: Replace with actual StorageStatsModule implementation
    return [];
  },
};

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

        const baseApps: InstalledApp[] = Array.from(uniqueApps.values())
          .map((app) => {
            const appId = app.packageName;
            const appName = app.appName;
            const icon = app.icon;

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
          .sort((a, b) => a.name.localeCompare(b.name));

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

