import { scanForAPKs } from '../app/(Screens)/APKRemoverScreen/APKScanner';
import { scanCachesAndLogs } from '../app/(Screens)/CacheLogsScreen/CacheLogsScanner';
import { scanForDuplicates } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import { scanJunkFiles } from '../app/(Screens)/JunkFileScannerScreen/JunkFileScanner';
import { scanLargeFiles } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import { scanOldFiles } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import { scanUnusedApps } from '../app/(Screens)/UnusedAppsScreen/UnusedAppsScanner';
import { scanWhatsApp } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';
import {
  initDatabase,
  saveApkScanResults,
  saveCacheLogsResults,
  saveDuplicateGroups,
  saveJunkFileResults,
  saveLargeFileResults,
  saveOldFileResults,
  saveSmartScanStatus,
  saveUnusedAppsResults,
  saveWhatsAppResults,
  type SmartScanStatus,
} from './db';

export interface SmartScanProgress {
  current: number; // Current scanner index (0-7)
  total: number; // Total scanners (8)
  scannerName: string; // Name of current scanner
  scannerProgress?: number; // Progress within current scanner (0-1)
  scannerDetail?: string; // Detail message from current scanner
}

export type SmartScanProgressCallback = (progress: SmartScanProgress) => void;

const SCANNER_NAMES = [
  'APK Files',
  'WhatsApp Files',
  'Duplicate Images',
  'Large Files',
  'Junk Files',
  'Old Files',
  'Cache & Logs',
  'Unused Apps',
] as const;

/**
 * Run Smart Scan - executes all scanners sequentially
 * @param onProgress Callback for progress updates
 * @returns Promise that resolves when all scans complete
 */
export async function runSmartScan(
  onProgress?: SmartScanProgressCallback
): Promise<void> {
  await initDatabase();

  const status: SmartScanStatus = {
    completed: false,
    completedAt: null,
    scannerProgress: {
      apk: false,
      whatsapp: false,
      duplicates: false,
      largeFiles: false,
      junkFiles: false,
      oldFiles: false,
      cacheLogs: false,
      unusedApps: false,
    },
  };

  const persistStatus = async () => {
    try {
      await saveSmartScanStatus(status);
    } catch (error) {
      console.warn('Failed to persist smart scan status snapshot:', error);
    }
  };

  const updateProgress = (current: number, scannerName: string, scannerProgress?: number, scannerDetail?: string) => {
    onProgress?.({
      current,
      total: SCANNER_NAMES.length,
      scannerName,
      scannerProgress,
      scannerDetail,
    });
  };

  try {
    // 1. APK Scanner
    updateProgress(0, SCANNER_NAMES[0], 0, 'scanning for APK files...');
    const apkResults = await scanForAPKs();
    await saveApkScanResults(apkResults);
    status.scannerProgress.apk = true;
    await persistStatus();
    updateProgress(0, SCANNER_NAMES[0], 1, `found ${apkResults.length} APK files`);

    // 2. WhatsApp Scanner
    updateProgress(1, SCANNER_NAMES[1], 0, 'scanning WhatsApp files...');
    const whatsappResults = await scanWhatsApp();
    await saveWhatsAppResults(whatsappResults);
    status.scannerProgress.whatsapp = true;
    await persistStatus();
    updateProgress(1, SCANNER_NAMES[1], 1, `found ${whatsappResults.length} WhatsApp files`);

    // 3. Duplicate Images Scanner
    updateProgress(2, SCANNER_NAMES[2], 0, 'scanning for duplicate images...');
    const duplicateResults = await scanForDuplicates(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(2, SCANNER_NAMES[2], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveDuplicateGroups(duplicateResults || []);
    status.scannerProgress.duplicates = true;
    await persistStatus();
    const duplicateCount = duplicateResults.reduce((sum, group) => sum + group.files.length, 0);
    updateProgress(2, SCANNER_NAMES[2], 1, `found ${duplicateCount} duplicate images`);

    // 4. Large Files Scanner
    updateProgress(3, SCANNER_NAMES[3], 0, 'scanning for large files...');
    const largeFileResults = await scanLargeFiles(
      512 * 1024 * 1024, // 512 MB threshold
      (snapshot) => {
        updateProgress(3, SCANNER_NAMES[3], snapshot.ratio, snapshot.detail);
      }
    );
    await saveLargeFileResults(largeFileResults);
    status.scannerProgress.largeFiles = true;
    await persistStatus();
    updateProgress(3, SCANNER_NAMES[3], 1, `found ${largeFileResults.length} large files`);

    // 5. Junk Files Scanner
    updateProgress(4, SCANNER_NAMES[4], 0, 'scanning for junk files...');
    const junkFileResults = await scanJunkFiles(
      (progress, detail) => {
        updateProgress(4, SCANNER_NAMES[4], progress, detail);
      }
    );
    await saveJunkFileResults(junkFileResults.items);
    status.scannerProgress.junkFiles = true;
    await persistStatus();
    updateProgress(4, SCANNER_NAMES[4], 1, `found ${junkFileResults.totalFiles} junk files`);

    // 6. Old Files Scanner
    updateProgress(5, SCANNER_NAMES[5], 0, 'scanning for old files...');
    const oldFileResults = await scanOldFiles(90); // 90 days threshold
    await saveOldFileResults(oldFileResults);
    status.scannerProgress.oldFiles = true;
    await persistStatus();
    updateProgress(5, SCANNER_NAMES[5], 1, `found ${oldFileResults.length} old files`);

    // 7. Cache & Logs Scanner
    updateProgress(6, SCANNER_NAMES[6], 0, 'scanning cache and logs...');
    const cacheLogsResults = await scanCachesAndLogs();
    await saveCacheLogsResults(cacheLogsResults);
    status.scannerProgress.cacheLogs = true;
    await persistStatus();
    updateProgress(6, SCANNER_NAMES[6], 1, `found ${cacheLogsResults.length} cache/log files`);

    // 8. Unused Apps Scanner
    updateProgress(7, SCANNER_NAMES[7], 0, 'scanning for unused apps...');
    const unusedAppsResults = await scanUnusedApps();
    await saveUnusedAppsResults(unusedAppsResults);
    status.scannerProgress.unusedApps = true;
    await persistStatus();
    updateProgress(7, SCANNER_NAMES[7], 1, `found ${unusedAppsResults.length} unused apps`);

    // Mark as completed
    status.completed = true;
    status.completedAt = Date.now();
    await saveSmartScanStatus(status);

    updateProgress(8, 'Complete', 1, 'smart scan completed');
  } catch (error) {
    console.error('Smart scan error:', error);
    // Save partial status
    await saveSmartScanStatus(status);
    throw error;
  }
}

