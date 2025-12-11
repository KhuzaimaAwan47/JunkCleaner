import type { ApkFile } from '../app/(Screens)/APKRemoverScreen/APKScanner';
import type { ScanResult } from '../app/(Screens)/CacheLogsScreen/CacheLogsScanner';
import type { DuplicateGroup } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import type { JunkFileItem } from '../app/(Screens)/JunkFileScannerScreen/JunkFileScanner';
import type { LargeFileResult } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import type { OldFileInfo } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import type { UnusedAppInfo } from '../app/(Screens)/UnusedAppsScreen/UnusedAppsScanner';
import type { WhatsAppScanResult } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';

export interface SystemHealthResult {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  totalItems: number;
  totalSize: number; // in bytes (junk + cache/logs)
  storageUsage?: number; // 0-1 ratio
  memoryUsage?: number; // 0-1 ratio
}

export interface ScannerResults {
  apkResults?: ApkFile[] | null;
  whatsappResults?: WhatsAppScanResult[] | null;
  duplicateResults?: DuplicateGroup[] | null;
  largeFileResults?: LargeFileResult[] | null;
  junkFileResults?: JunkFileItem[] | null;
  oldFileResults?: OldFileInfo[] | null;
  cacheLogsResults?: ScanResult[] | null;
  unusedAppsResults?: UnusedAppInfo[] | null;
}

export interface SystemResourceInfo {
  storageUsage?: number; // ratio 0-1
  memoryUsage?: number; // ratio 0-1
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Calculate system health based on junk/cache findings plus resource usage.
 * @param results Scanner results from all scanners
 * @param resources Optional real-time resource usage (storage + memory) as ratios
 * @returns System health score, status, and message
 */
export function calculateSystemHealth(
  results: ScannerResults,
  resources: SystemResourceInfo = {}
): SystemHealthResult {
  // Handle nullable conditions - default to empty arrays
  const junkFileResults = results.junkFileResults ?? [];
  const cacheLogsResults = results.cacheLogsResults ?? [];
  // Other scanners are excluded from health calculation (APK, duplicates, large files, WhatsApp, old files, unused apps)
  // because they may contain important or user-intended content.

  // Calculate total items and sizes using junk files and cache/logs only
  let totalItems = 0;
  let totalSize = 0;

  // Junk files
  totalItems += junkFileResults.length;
  totalSize += junkFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Cache & logs
  totalItems += cacheLogsResults.length;
  totalSize += cacheLogsResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Unused apps - EXCLUDE from health calculation (user might want to keep them)
  // const unusedAppsResults = results.unusedAppsResults ?? [];
  // const unusedAppsCount = unusedAppsResults.filter(
  //   (app) => app.category === 'UNUSED' || app.category === 'LOW_USAGE'
  // ).length;
  // totalItems += unusedAppsCount;

  // Resource usage ratios (0-1). Defaults assume healthy mid-range usage.
  const storageUsage = clamp(resources.storageUsage ?? 0.5);
  const memoryUsage = clamp(resources.memoryUsage ?? 0.5);

  // Calculate health score (0-100)
  // Weighted components:
  // - Junk/cache size impact (max 45 points lost at ~10GB)
  // - Junk/cache item count impact (max 20 points lost at ~2000 items)
  // - Storage usage impact (max 25 points lost as storage approaches 100% full)
  // - Memory usage impact (max 10 points lost as memory approaches 100% used)
  const junkSizeGb = totalSize / (1024 * 1024 * 1024);
  const junkSizePenalty = clamp(junkSizeGb / 10); // 10GB => full penalty
  const junkSizeScore = 45 * (1 - junkSizePenalty);

  const itemPenalty = clamp(totalItems / 2000); // 2000 items => full penalty
  const itemScore = 20 * (1 - itemPenalty);

  const storageScore = 25 * (1 - storageUsage);
  const memoryScore = 10 * (1 - memoryUsage);

  const score = Math.round(junkSizeScore + itemScore + storageScore + memoryScore);

  // Determine status and message with more lenient thresholds
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  let message: string;

  if (score >= 75) {
    status = 'excellent';
    message = 'Excellent condition';
  } else if (score >= 50) {
    status = 'good';
    message = 'Good condition';
  } else if (score >= 30) {
    status = 'fair';
    message = 'Needs attention';
  } else {
    status = 'poor';
    message = 'Needs cleanup';
  }

  // Tailor message based on top issues
  const issues: string[] = [];
  if (storageUsage >= 0.85) {
    issues.push('Low storage');
  } else if (storageUsage >= 0.7) {
    issues.push('High storage use');
  }
  if (memoryUsage >= 0.85) {
    issues.push('High memory use');
  }
  if (junkSizeGb >= 5) {
    issues.push('Large junk/cache');
  } else if (totalItems >= 1000) {
    issues.push('Lots of junk items');
  }
  if (issues.length > 0) {
    message = issues.join(' • ');
  }

  return {
    score,
    status,
    message,
    totalItems,
    totalSize,
    storageUsage,
    memoryUsage,
  };
}

