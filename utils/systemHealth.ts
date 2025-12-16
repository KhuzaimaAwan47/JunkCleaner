import type { DuplicateGroup } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import type { LargeFileResult } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import type { OldFileInfo } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import type { WhatsAppScanResult } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';

export interface SystemHealthResult {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  totalItems: number;
  totalSize: number; // in bytes (large files + old files as indicators)
  storageUsage?: number; // 0-1 ratio
  memoryUsage?: number; // 0-1 ratio
}

export interface ScannerResults {
  whatsappResults?: WhatsAppScanResult[] | null;
  duplicateResults?: DuplicateGroup[] | null;
  largeFileResults?: LargeFileResult[] | null;
  oldFileResults?: OldFileInfo[] | null;
}

export interface SystemResourceInfo {
  storageUsage?: number; // ratio 0-1
  memoryUsage?: number; // ratio 0-1
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Calculate system health based on large/old files as indicators plus resource usage.
 * @param results Scanner results from all scanners
 * @param resources Optional real-time resource usage (storage + memory) as ratios
 * @returns System health score, status, and message
 */
export function calculateSystemHealth(
  results: ScannerResults,
  resources: SystemResourceInfo = {}
): SystemHealthResult {
  // Handle nullable conditions - default to empty arrays
  const largeFileResults = results.largeFileResults ?? [];
  const oldFileResults = results.oldFileResults ?? [];
  // Use large files and old files as indicators of storage health
  // Other scanners (duplicates, WhatsApp) are excluded as they may contain important user content

  // Calculate total items and sizes using large files and old files as indicators
  let totalItems = 0;
  let totalSize = 0;

  // Large files (as indicator of storage bloat)
  totalItems += largeFileResults.length;
  totalSize += largeFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Old files (as indicator of unused content)
  totalItems += oldFileResults.length;
  totalSize += oldFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Resource usage ratios (0-1). Defaults assume healthy mid-range usage.
  const storageUsage = clamp(resources.storageUsage ?? 0.5);
  const memoryUsage = clamp(resources.memoryUsage ?? 0.5);

  // Calculate health score (0-100)
  // Weighted components:
  // - Large/old file size impact (max 35 points lost at ~20GB)
  // - Large/old file item count impact (max 15 points lost at ~1000 items)
  // - Storage usage impact (max 35 points lost as storage approaches 100% full)
  // - Memory usage impact (max 15 points lost as memory approaches 100% used)
  const fileSizeGb = totalSize / (1024 * 1024 * 1024);
  const fileSizePenalty = clamp(fileSizeGb / 20); // 20GB => full penalty
  const fileSizeScore = 35 * (1 - fileSizePenalty);

  const itemPenalty = clamp(totalItems / 1000); // 1000 items => full penalty
  const itemScore = 15 * (1 - itemPenalty);

  const storageScore = 35 * (1 - storageUsage);
  const memoryScore = 15 * (1 - memoryUsage);

  const score = Math.round(fileSizeScore + itemScore + storageScore + memoryScore);

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
    issues.push('Storage low');
  } else if (storageUsage >= 0.7) {
    issues.push('Storage high');
  }
  if (memoryUsage >= 0.85) {
    issues.push('Memory high');
  }
  if (fileSizeGb >= 10) {
    issues.push('Large files');
  } else if (totalItems >= 500) {
    issues.push('Many files');
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

