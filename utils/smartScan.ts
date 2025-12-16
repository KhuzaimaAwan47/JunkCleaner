import { scanForDuplicates } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import { scanLargeFiles } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import { scanOldFiles } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import { scanWhatsApp } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';
import {
  initDatabase,
  saveDuplicateGroups,
  saveLargeFileResults,
  saveOldFileResults,
  saveSmartScanStatus,
  saveWhatsAppResults,
  type SmartScanStatus,
} from './db';

export interface SmartScanProgress {
  current: number; // Current scanner index (0-3)
  total: number; // Total scanners (4)
  scannerName: string; // Name of current scanner
  scannerProgress?: number; // Progress within current scanner (0-1)
  scannerDetail?: string; // Detail message from current scanner
}

export type SmartScanProgressCallback = (progress: SmartScanProgress) => void;

const SCANNER_NAMES = [
  'WhatsApp Files',
  'Duplicate Images',
  'Large Files',
  'Old Files',
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
      whatsapp: false,
      duplicates: false,
      largeFiles: false,
      oldFiles: false,
    },
  };

  const persistStatus = async () => {
    try {
      await saveSmartScanStatus(status);
    } catch (error) {
      console.warn('Failed to persist smart scan status snapshot:', error);
    }
  };

  const updateProgress = (
    current: number, 
    scannerName: string, 
    scannerProgress?: number, 
    scannerDetail?: string,
  ) => {
    // Ensure scannerProgress is always between 0-1 for smooth calculation
    const normalizedScannerProgress = scannerProgress !== undefined 
      ? Math.max(0, Math.min(1, scannerProgress))
      : undefined;
    
    onProgress?.({
      current,
      total: SCANNER_NAMES.length,
      scannerName,
      scannerProgress: normalizedScannerProgress,
      scannerDetail,
    });
  };

  try {
    // 1. WhatsApp Scanner
    updateProgress(0, SCANNER_NAMES[0], 0, 'scanning WhatsApp files...');
    const whatsappResults = await scanWhatsApp();
    await saveWhatsAppResults(whatsappResults);
    status.scannerProgress.whatsapp = true;
    await persistStatus();
    updateProgress(0, SCANNER_NAMES[0], 1, `found ${whatsappResults.length} WhatsApp files`);

    // 2. Duplicate Images Scanner
    updateProgress(1, SCANNER_NAMES[1], 0, 'scanning for duplicate images...');
    const duplicateResults = await scanForDuplicates(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(1, SCANNER_NAMES[1], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveDuplicateGroups(duplicateResults || []);
    status.scannerProgress.duplicates = true;
    await persistStatus();
    const duplicateCount = duplicateResults.reduce((sum, group) => sum + group.files.length, 0);
    updateProgress(1, SCANNER_NAMES[1], 1, `found ${duplicateCount} duplicate images`);

    // 3. Large Files Scanner
    updateProgress(2, SCANNER_NAMES[2], 0, 'scanning for large files...');
    const largeFileResults = await scanLargeFiles(
      512 * 1024 * 1024, // 512 MB threshold
      (snapshot) => {
        updateProgress(2, SCANNER_NAMES[2], snapshot.ratio, snapshot.detail);
      }
    );
    await saveLargeFileResults(largeFileResults);
    status.scannerProgress.largeFiles = true;
    await persistStatus();
    updateProgress(2, SCANNER_NAMES[2], 1, `found ${largeFileResults.length} large files`);

    // 4. Old Files Scanner
    updateProgress(3, SCANNER_NAMES[3], 0, 'scanning for old files...');
    const oldFileResults = await scanOldFiles(90); // 90 days threshold
    await saveOldFileResults(oldFileResults);
    status.scannerProgress.oldFiles = true;
    await persistStatus();
    updateProgress(3, SCANNER_NAMES[3], 1, `found ${oldFileResults.length} old files`);

    // Mark as completed
    status.completed = true;
    status.completedAt = Date.now();
    await saveSmartScanStatus(status);

    updateProgress(4, 'Complete', 1, 'smart scan completed');
  } catch (error) {
    console.error('Smart scan error:', error);
    // Save partial status
    await saveSmartScanStatus(status);
    throw error;
  }
}

