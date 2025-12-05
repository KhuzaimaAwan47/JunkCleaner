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
  const whatsappResults = results.whatsappResults ?? [];
  const duplicateResults = results.duplicateResults ?? [];
  const largeFileResults = results.largeFileResults ?? [];
  const junkFileResults = results.junkFileResults ?? [];
  const oldFileResults = results.oldFileResults ?? [];
  const cacheLogsResults = results.cacheLogsResults ?? [];
  const unusedAppsResults = results.unusedAppsResults ?? [];

  // Calculate total items and sizes
  let totalItems = 0;
  let totalSize = 0;

  // APK files
  totalItems += apkResults.length;
  totalSize += apkResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // WhatsApp files
  totalItems += whatsappResults.length;
  totalSize += whatsappResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Duplicate images (count files in groups, not groups themselves)
  const duplicateFileCount = duplicateResults.reduce(
    (sum, group) => sum + (group.files?.length ?? 0),
    0
  );
  totalItems += duplicateFileCount;
  totalSize += duplicateResults.reduce((sum, group) => sum + (group.totalSize ?? 0), 0);

  // Large files
  totalItems += largeFileResults.length;
  totalSize += largeFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Junk files
  totalItems += junkFileResults.length;
  totalSize += junkFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Old files
  totalItems += oldFileResults.length;
  totalSize += oldFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Cache & logs
  totalItems += cacheLogsResults.length;
  totalSize += cacheLogsResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Unused apps (count only unused/low usage)
  const unusedAppsCount = unusedAppsResults.filter(
    (app) => app.category === 'UNUSED' || app.category === 'LOW_USAGE'
  ).length;
  totalItems += unusedAppsCount;

  // Calculate health score (0-100)
  // Lower items and size = higher score
  // Score is based on:
  // - Item count (max 1000 items = 0 points, 0 items = 50 points)
  // - Total size (max 10GB = 0 points, 0 bytes = 50 points)
  const itemScore = Math.max(0, 50 - (totalItems / 1000) * 50);
  const sizeScore = Math.max(0, 50 - (totalSize / (10 * 1024 * 1024 * 1024)) * 50);
  const score = Math.round(itemScore + sizeScore);

  // Determine status and message
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  let message: string;

  if (score >= 80) {
    status = 'excellent';
    message = 'Excellent Condition';
  } else if (score >= 60) {
    status = 'good';
    message = 'Good Condition';
  } else if (score >= 40) {
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

