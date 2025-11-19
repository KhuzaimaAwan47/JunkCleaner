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
};

type UseInstalledAppsResult = {
  apps: InstalledApp[];
  unusedApps: InstalledApp[];
  isLoading: boolean;
  refresh: () => void;
  needsUsagePermission: boolean;
  hasUsageStats: boolean;
};

const DAYS_IDLE_THRESHOLD = 45;

export function useInstalledApps(): UseInstalledAppsResult {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsUsagePermission, setNeedsUsagePermission] = useState(false);

  const previousAppState = useRef<string>(AppState.currentState);

  const { unusedApps, hasUsageStats } = useMemo(() => {
    if (apps.length === 0) {
      return { unusedApps: [], hasUsageStats: false };
    }

    const usableApps = apps.filter((app) => app.daysIdle !== null && app.daysIdle !== undefined);

    if (usableApps.length === 0) {
      // No usage metadata available yet – fall back to returning the raw list so the UI can still render apps
      return {
        unusedApps: [...apps],
        hasUsageStats: false,
      };
    }

    const rankedApps = usableApps
      .filter((app) => {
        const daysIdle = app.daysIdle ?? 0;
        return daysIdle > DAYS_IDLE_THRESHOLD;
      })
      .sort((a, b) => {
        const aDays = a.daysIdle ?? 0;
        const bDays = b.daysIdle ?? 0;
        return bDays - aDays;
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
        const installedApps = await getInstalledApps();
        const uniqueApps = new Map<string, typeof installedApps[0]>();
        
        for (const app of installedApps) {
          const appData = app as any;
          const appId =
            appData.bundleIdentifier || appData.packageName || app.packageName || appData.id || appData.appName || appData.label;
          if (appId && !uniqueApps.has(appId)) {
            uniqueApps.set(appId, app);
          }
        }

        const baseApps: InstalledApp[] = Array.from(uniqueApps.values())
          .map((app) => {
            const appData = app as any;
            const appId =
              appData.bundleIdentifier || appData.packageName || app.packageName || appData.id || appData.appName || appData.label;
            const appName = appData.appName || appData.name || appData.label || appId;
            const icon =
              appData.icon || appData.iconBase64 || appData.iconUri || appData.iconPath || appData.iconUrl || undefined;
            
            // Try to get lastUsed timestamp if available
            let lastUsed: number | null = null;
            let daysIdle: number | null = null;
            
            if (Platform.OS === "android") {
              // For Android, check if usage stats data is available
              if (appData.lastUsedTime || appData.lastTimeUsed) {
                lastUsed = appData.lastUsedTime || appData.lastTimeUsed;
                if (lastUsed) {
                  const now = Date.now();
                  const daysDiff = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));
                  daysIdle = daysDiff;
                }
              }
            }

            return {
              id: appId,
              name: appName,
              packageName: appId,
              lastUsed,
              daysIdle,
              icon,
              requiresPermission: false,
            } satisfies InstalledApp;
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        // Check if we need usage permission (if no apps have lastUsed data on Android)
        const requiresPermission =
          Platform.OS === "android" &&
          baseApps.length > 0 &&
          baseApps.every((app) => app.lastUsed === null);

        if (!cancelled) {
          setApps(baseApps);
          setNeedsUsagePermission(requiresPermission);
        }
      } catch (error) {
        console.warn("failed to load installed apps", error);
        if (!cancelled) {
          setApps([]);
          setNeedsUsagePermission(false);
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
    needsUsagePermission,
  };
}

