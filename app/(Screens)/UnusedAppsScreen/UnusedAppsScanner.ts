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
  totalTimeInForeground: number,
): number => {
  let daysUnusedWeight = 0;
  let launchCountWeight = 0;
  let installAgeWeight = 0;
  let usageTimeWeight = 0;
  let notificationWeight = 0;

  // Days unused weight (primary factor)
  if (lastUsedDays === Infinity || lastUsedDays >= 90) {
    daysUnusedWeight = 60; // Very high confidence for 90+ days unused
  } else if (lastUsedDays >= 60) {
    daysUnusedWeight = 50;
  } else if (lastUsedDays >= 30) {
    daysUnusedWeight = 40;
  } else if (lastUsedDays >= 14) {
    daysUnusedWeight = 25;
  } else if (lastUsedDays >= 7) {
    daysUnusedWeight = 15;
  } else if (lastUsedDays > 0) {
    daysUnusedWeight = 5;
  }

  // Launch count weight (considering install age)
  if (daysSinceInstall >= 60 && launchCount === 0) {
    launchCountWeight = 35; // Never launched after 60 days
  } else if (daysSinceInstall >= 45 && launchCount < 2) {
    launchCountWeight = 30;
  } else if (daysSinceInstall >= 30 && launchCount < 5) {
    launchCountWeight = 20;
  } else if (daysSinceInstall >= 14 && launchCount < 3) {
    launchCountWeight = 15;
  } else if (launchCount === 0 && daysSinceInstall >= 7) {
    launchCountWeight = 10; // Never launched after a week
  }

  // Install age weight (newly installed apps get lower confidence)
  if (daysSinceInstall < 7) {
    installAgeWeight = -30; // Very new, don't recommend removal
  } else if (daysSinceInstall < 14) {
    installAgeWeight = -20;
  } else if (daysSinceInstall < 30) {
    installAgeWeight = -10;
  } else if (daysSinceInstall >= 90 && launchCount === 0) {
    installAgeWeight = 15; // Old and never used
  }

  // Usage time weight (apps with very low usage time)
  const hoursInForeground = totalTimeInForeground / (1000 * 60 * 60);
  if (daysSinceInstall >= 30 && hoursInForeground < 0.5) {
    usageTimeWeight = 15; // Less than 30 minutes total usage
  } else if (daysSinceInstall >= 60 && hoursInForeground < 1) {
    usageTimeWeight = 10;
  }

  // Notification weight (negative if has notifications - likely important)
  if (hasNotifications) {
    notificationWeight = -25; // Apps with notifications are likely important
  }

  // Calculate final score
  const score = Math.min(100, Math.max(0, 
    daysUnusedWeight + 
    launchCountWeight + 
    installAgeWeight + 
    usageTimeWeight + 
    notificationWeight
  ));
  
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
      const hasUsageData = Boolean(stat30 || stat7);

      // If we have no usage data at all, skip to avoid false positives.
      if (!hasUsageData) {
        continue;
      }

      const lastTimeUsed = stat30?.lastTimeUsed || stat7?.lastTimeUsed || 0;
      const launchCount = stat30?.launchCount || stat7?.launchCount || 0;
      const totalTimeInForeground = stat30?.totalTimeInForeground || stat7?.totalTimeInForeground || 0;
      const installDate = app.firstInstallTime || app.lastUpdateTime || currentTime;
      const daysSinceInstall = Math.floor((currentTime - installDate) / (1000 * 60 * 60 * 24));

      // Handle apps with zero launches - check if they're newly installed
      let lastUsedDays: number;
      if (!lastTimeUsed || lastTimeUsed <= 0) {
        // No usage data - if app is old enough, consider it unused
        if (daysSinceInstall >= 7) {
          lastUsedDays = daysSinceInstall; // Treat as unused since install
        } else {
          continue; // Too new, skip to avoid false positives
        }
      } else {
        lastUsedDays = Math.floor((currentTime - lastTimeUsed) / (1000 * 60 * 60 * 24));
      }

      // Check for notifications (would need additional permission/API)
      const hasNotifications = false;
      
      const confidenceScore = calculateConfidenceScore(
        lastUsedDays,
        launchCount,
        daysSinceInstall,
        hasNotifications,
        totalTimeInForeground,
      );

      // Treat apps unused for 30+ days as UNUSED, 7-29 days as LOW_USAGE.
      let category: 'UNUSED' | 'LOW_USAGE' | 'ACTIVE';
      if (lastUsedDays >= 30) {
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
        lastUsedDays,
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

