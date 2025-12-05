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
  totalSize: number; // in bytes
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

/**
 * Calculate system health based on all scanner results
 * @param results Scanner results from all scanners
 * @returns System health score, status, and message
 */
export function calculateSystemHealth(results: ScannerResults): SystemHealthResult {
  // Handle nullable conditions - default to empty arrays
  const apkResults = results.apkResults ?? [];
  // WhatsApp, Large files, Old files, and Unused apps are excluded from health calculation
  const duplicateResults = results.duplicateResults ?? [];
  const junkFileResults = results.junkFileResults ?? [];
  const cacheLogsResults = results.cacheLogsResults ?? [];

  // Calculate total items and sizes (excluding certain categories from health calculation)
  // Excluded: Large files, WhatsApp files, Old files, Unused apps
  // These are not necessarily junk - they might be important files/apps
  let totalItems = 0;
  let totalSize = 0;

  // APK files
  totalItems += apkResults.length;
  totalSize += apkResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // WhatsApp files - EXCLUDE from health calculation (might be important media)
  // const whatsappResults = results.whatsappResults ?? [];
  // totalItems += whatsappResults.length;
  // totalSize += whatsappResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Duplicate images (count files in groups, not groups themselves)
  const duplicateFileCount = duplicateResults.reduce(
    (sum, group) => sum + (group.files?.length ?? 0),
    0
  );
  totalItems += duplicateFileCount;
  totalSize += duplicateResults.reduce((sum, group) => sum + (group.totalSize ?? 0), 0);

  // Large files - EXCLUDE from health calculation as they're not necessarily junk
  // const largeFileResults = results.largeFileResults ?? [];
  // totalItems += largeFileResults.length;
  // totalSize += largeFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Junk files
  totalItems += junkFileResults.length;
  totalSize += junkFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Old files - EXCLUDE from health calculation (might be important old files)
  // const oldFileResults = results.oldFileResults ?? [];
  // totalItems += oldFileResults.length;
  // totalSize += oldFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Cache & logs
  totalItems += cacheLogsResults.length;
  totalSize += cacheLogsResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Unused apps - EXCLUDE from health calculation (user might want to keep them)
  // const unusedAppsResults = results.unusedAppsResults ?? [];
  // const unusedAppsCount = unusedAppsResults.filter(
  //   (app) => app.category === 'UNUSED' || app.category === 'LOW_USAGE'
  // ).length;
  // totalItems += unusedAppsCount;

  // Calculate health score (0-100)
  // Lower items and size = higher score
  // Very lenient thresholds for realistic scoring:
  // - Item count (max 10000 items = 0 points, 0 items = 50 points)
  // - Total size (max 100GB = 0 points, 0 bytes = 50 points)
  const itemScore = Math.max(0, 50 - (totalItems / 10000) * 50);
  const sizeScore = Math.max(0, 50 - (totalSize / (100 * 1024 * 1024 * 1024)) * 50);
  const score = Math.round(itemScore + sizeScore);

  // Determine status and message with more lenient thresholds
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  let message: string;

  if (score >= 75) {
    status = 'excellent';
    message = 'Excellent Condition';
  } else if (score >= 50) {
    status = 'good';
    message = 'Good Condition';
  } else if (score >= 30) {
    status = 'fair';
    message = 'Needs Attention';
  } else {
    status = 'poor';
    message = 'Needs Cleanup';
  }

  return {
    score,
    status,
    message,
    totalItems,
    totalSize,
  };
}

