import { getInstalledApps } from '@zecky-dev/react-native-app-list';
import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

export interface UnusedAppInfo {
  packageName: string;
  appName: string;
  icon?: string | null;
  lastUsed: number;
  lastUsedDays: number;
  launchCount: number;
  installDate: number;
  confidenceScore: number;
  category: 'UNUSED' | 'LOW_USAGE' | 'ACTIVE';
}

interface UsageStat {
  packageName: string;
  lastTimeUsed: number;
  totalTimeInForeground: number;
  launchCount: number;
}

interface InstalledApp {
  packageName: string;
  appName: string;
  firstInstallTime?: number;
  lastUpdateTime?: number;
  icon?: string;
}

const SYSTEM_PACKAGE_PREFIXES = [
  'com.android.',
  'android.',
  'com.google.android.gms',
  'com.google.android.apps.',
  'com.google.android.setupwizard',
  'com.qualcomm.',
  'com.samsung.',
  'com.huawei.',
  'com.miui.',
  'com.oneplus.',
  'com.oppo.',
  'com.vivo.',
  'com.realme.',
  'com.xiaomi.',
];

const ESSENTIAL_PACKAGES = [
  'com.android.launcher',
  'com.android.launcher2',
  'com.android.launcher3',
  'com.google.android.launcher',
  'com.samsung.android.launcher',
  'com.huawei.android.launcher',
  'com.miui.home',
  'com.android.settings',
  'com.android.systemui',
  'com.android.phone',
  'com.android.dialer',
  'com.android.mms',
  'com.android.providers.',
  'com.android.keychain',
  'com.android.vending',
];

const isSystemPackage = (packageName: string): boolean => {
  const lower = packageName.toLowerCase();
  
  if (SYSTEM_PACKAGE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }
  
  if (ESSENTIAL_PACKAGES.some((pkg) => lower.startsWith(pkg))) {
    return true;
  }
  
  return false;
};

const fetchUsageStats = async (days: number): Promise<Map<string, UsageStat>> => {
  if (Platform.OS !== 'android' || !UsageStatsModule) {
    return new Map();
  }

  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    
    const stats = await UsageStatsModule.queryUsageStats(startTime, endTime);
    
    if (!Array.isArray(stats)) {
      return new Map();
    }

    const statsMap = new Map<string, UsageStat>();
    
    stats.forEach((stat: any) => {
      if (stat?.packageName) {
        const existing = statsMap.get(stat.packageName);
        if (existing) {
          existing.launchCount = Math.max(existing.launchCount, stat.launchCount || 0);
          existing.lastTimeUsed = Math.max(existing.lastTimeUsed, stat.lastTimeUsed || 0);
          existing.totalTimeInForeground += stat.totalTimeInForeground || 0;
        } else {
          statsMap.set(stat.packageName, {
            packageName: stat.packageName,
            lastTimeUsed: stat.lastTimeUsed || 0,
            totalTimeInForeground: stat.totalTimeInForeground || 0,
            launchCount: stat.launchCount || 0,
          });
        }
      }
    });

    return statsMap;
  } catch (error) {
    console.warn('Failed to fetch usage stats:', error);
    return new Map();
  }
};

const calculateConfidenceScore = (
  lastUsedDays: number,
  launchCount: number,
  daysSinceInstall: number,
  hasNotifications: boolean,
): number => {
  let daysUnusedWeight = 0;
  let launchCountWeight = 0;
  let notificationWeight = 0;

  if (lastUsedDays === Infinity || lastUsedDays > 30) {
    daysUnusedWeight = 50;
  } else if (lastUsedDays > 7) {
    daysUnusedWeight = 25;
  } else if (lastUsedDays > 0) {
    daysUnusedWeight = 10;
  }

  if (daysSinceInstall >= 45 && launchCount < 2) {
    launchCountWeight = 40;
  } else if (daysSinceInstall >= 30 && launchCount < 5) {
    launchCountWeight = 20;
  }

  if (hasNotifications) {
    notificationWeight = -20;
  }

  const score = Math.min(100, Math.max(0, daysUnusedWeight + launchCountWeight + notificationWeight));
  return Math.round(score);
};

export const scanUnusedApps = async (): Promise<UnusedAppInfo[]> => {
  if (Platform.OS !== 'android') {
    return [];
  }

  try {
    const installedApps = await getInstalledApps();
    
    if (!Array.isArray(installedApps) || installedApps.length === 0) {
      return [];
    }

    const [usageStats7Days, usageStats30Days] = await Promise.all([
      fetchUsageStats(7),
      fetchUsageStats(30),
    ]);

    const currentTime = Date.now();
    const results: UnusedAppInfo[] = [];

    for (const app of installedApps as InstalledApp[]) {
      const packageName = app.packageName || '';
      const appName = app.appName || packageName;

      if (isSystemPackage(packageName)) {
        continue;
      }

      const stat30 = usageStats30Days.get(packageName);
      const stat7 = usageStats7Days.get(packageName);

      const lastTimeUsed = stat30?.lastTimeUsed || stat7?.lastTimeUsed || 0;
      const launchCount = stat30?.launchCount || stat7?.launchCount || 0;
      const installDate = app.firstInstallTime || app.lastUpdateTime || currentTime;
      const daysSinceInstall = Math.floor((currentTime - installDate) / (1000 * 60 * 60 * 24));

      let lastUsedDays: number;
      if (lastTimeUsed === 0) {
        lastUsedDays = Infinity;
      } else {
        lastUsedDays = Math.floor((currentTime - lastTimeUsed) / (1000 * 60 * 60 * 24));
      }

      const hasNotifications = false;
      const confidenceScore = calculateConfidenceScore(
        lastUsedDays,
        launchCount,
        daysSinceInstall,
        hasNotifications,
      );

      // Treat apps unused for 30+ days (or never used) as UNUSED, 7-29 days as LOW_USAGE.
      let category: 'UNUSED' | 'LOW_USAGE' | 'ACTIVE';
      if ((lastUsedDays === Infinity && daysSinceInstall < 7)) {
        category = 'LOW_USAGE';
      } else if (lastUsedDays === Infinity || lastUsedDays >= 30) {
        category = 'UNUSED';
      } else if (lastUsedDays >= 7) {
        category = 'LOW_USAGE';
      } else {
        category = 'ACTIVE';
      }

      // Skip clearly active apps to avoid flooding the list.
      if (category === 'ACTIVE') {
        continue;
      }

      results.push({
        packageName,
        appName,
        icon: app.icon,
        lastUsed: lastTimeUsed,
        lastUsedDays: lastUsedDays === Infinity ? -1 : lastUsedDays,
        launchCount,
        installDate,
        confidenceScore,
        category,
      });
    }

    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  } catch (error) {
    console.error('Error scanning unused apps:', error);
    return [];
  }
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function UnusedAppsScannerRoute(): null {
  return null;
}

