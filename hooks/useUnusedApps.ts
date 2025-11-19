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

async function detectUnusedApps(): Promise<{ packageName: string; score: number }[]> {
  const now = Date.now();
  const usage = await UsageStatsModule.getUsageStats();
  const foreground = await UsageStatsModuleWithDuration.getUsageStatsWithDuration();
  const installs = await AppInfoModule.getInstalledApps();
  const notifs = await NotificationStatsModule.getNotificationStats();
  const storage = await StorageStatsModule.getAppStorageInfo();

  const scoreMap: Record<string, { packageName: string; score: number }> = {};

  // Initialize mapping
  installs.forEach((app) => {
    scoreMap[app.packageName] = { packageName: app.packageName, score: 0 };
  });

  // 1. last-time-used
  usage.forEach((app) => {
    const days = (now - app.lastTimeUsed) / 86400000;
    if (days > 30 && scoreMap[app.packageName]) {
      scoreMap[app.packageName].score += 20;
    }
  });

  // 2. foreground duration
  foreground.forEach((app) => {
    if (app.totalTimeForeground < 60 * 1000 && scoreMap[app.packageName]) {
      scoreMap[app.packageName].score += 20;
    }
  });

  // 3. install date heuristic
  installs.forEach((app) => {
    const days = (now - app.firstInstallTime) / 86400000;
    if (days > 30 && (!app.lastTimeUsed || app.lastTimeUsed === 0) && scoreMap[app.packageName]) {
      scoreMap[app.packageName].score += 20;
    }
  });

  // 4. notification activity
  notifs.forEach((app) => {
    if (app.notifCount === 0 && scoreMap[app.packageName]) {
      scoreMap[app.packageName].score += 20;
    }
  });

  // 5. storage changes
  storage.forEach((app) => {
    const days = (now - app.lastModified) / 86400000;
    if (days > 60 && scoreMap[app.packageName]) {
      scoreMap[app.packageName].score += 20;
    }
  });

  // Return apps that seem unused (score >= 60)
  return Object.values(scoreMap).filter((a) => a.score >= 60);
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
        const [installedApps, unusedAppScores] = await Promise.all([
          AppInfoModule.getInstalledApps(),
          detectUnusedApps(),
        ]);

        const scoreMap = new Map<string, number>();
        unusedAppScores.forEach((app) => {
          scoreMap.set(app.packageName, app.score);
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

            const score = scoreMap.get(app.packageName);

            return {
              id: appId,
              name: appName,
              packageName: appId,
              lastUsed,
              daysIdle,
              icon,
              requiresPermission: false,
              score,
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

