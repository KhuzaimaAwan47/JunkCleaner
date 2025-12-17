import type { DuplicateGroup } from "../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner";
import type { LargeFileResult } from "../app/(Screens)/LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import type { WhatsAppScanResult } from "../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner";
import type { APKFileInfo } from "../app/(Screens)/APKCleanerScreen/APKCleanerScanner";

type ScanResults = {
  whatsappResults?: WhatsAppScanResult[];
  duplicateResults?: DuplicateGroup[];
  largeFileResults?: LargeFileResult[];
  oldFileResults?: OldFileInfo[];
  apkResults?: APKFileInfo[];
};

export type FeatureStats = {
  size: number;
  count: number;
};

export type FeatureStatsMap = Record<string, FeatureStats>;

/**
 * Calculate size and file count for each feature type from scan results
 */
export function calculateFeatureStats(scanResults: ScanResults): FeatureStatsMap {
  const stats: FeatureStatsMap = {};

  // WhatsApp
  const whatsappCount = scanResults.whatsappResults?.length ?? 0;
  const whatsappSize = scanResults.whatsappResults?.reduce(
    (sum, item) => sum + ((item as any)?.size ?? 0),
    0
  ) ?? 0;
  stats.whatsapp = { size: whatsappSize, count: whatsappCount };

  // Duplicates
  const duplicateFileCount =
    scanResults.duplicateResults?.reduce(
      (sum, group) => sum + (group.files?.length ?? 0),
      0
    ) ?? 0;
  const duplicateSize =
    scanResults.duplicateResults?.reduce(
      (sum, group) =>
        sum +
        (group.files?.reduce((fileSum, file) => fileSum + (file.size ?? 0), 0) ?? 0),
      0
    ) ?? 0;
  stats.duplicate = { size: duplicateSize, count: duplicateFileCount };

  // Large Files
  const largeFileCount = scanResults.largeFileResults?.length ?? 0;
  const largeFileSize =
    scanResults.largeFileResults?.reduce((sum, item) => sum + (item.size ?? 0), 0) ?? 0;
  stats.large = { size: largeFileSize, count: largeFileCount };

  // Old Files
  const oldCount = scanResults.oldFileResults?.length ?? 0;
  const oldSize =
    scanResults.oldFileResults?.reduce((sum, item) => sum + (item.size ?? 0), 0) ?? 0;
  stats.old = { size: oldSize, count: oldCount };

  // APK Files
  const apkCount = scanResults.apkResults?.length ?? 0;
  const apkSize =
    scanResults.apkResults?.reduce((sum, item) => sum + (item.size ?? 0), 0) ?? 0;
  stats.apk = { size: apkSize, count: apkCount };

  return stats;
}

/**
 * Format feature subtitle as "X.X GB • Y files" (matching Audio card format)
 */
export function formatFeatureSubtitle(size: number, count: number): string {
  const sizeGB = (size / (1024 * 1024 * 1024)).toFixed(1);
  if (count > 0) {
    return `${sizeGB} GB • ${count} files`;
  }
  return `${sizeGB} GB`;
}

