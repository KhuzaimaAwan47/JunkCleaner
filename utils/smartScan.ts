import { scanForDuplicatesFromImages } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import { scanWhatsApp } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';
import { scanCaches } from '../app/(Screens)/CachesScreen/CachesScanner';
import { unifiedFileScan } from './unifiedFileScanner';
import {
  initDatabase,
  saveDuplicateGroups,
  saveLargeFileResults,
  saveOldFileResults,
  saveSmartScanStatus,
  saveWhatsAppResults,
  saveVideosResults,
  saveImagesResults,
  saveAudiosResults,
  saveDocumentsResults,
  saveAPKResults,
  saveCachesResults,
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

export type ScannerType = 'whatsapp' | 'duplicates' | 'largeFiles' | 'oldFiles' | 'apk' | 'caches' | 'videos' | 'images' | 'audios' | 'documents';

export type SmartScanResultsUpdate = {
  scannerType: ScannerType;
  scannerName: string;
  results: {
    whatsappResults?: any[];
    duplicateResults?: any[];
    largeFileResults?: any[];
    oldFileResults?: any[];
    apkResults?: any[];
    cachesResults?: any[];
    videosResults?: any[];
    imagesResults?: any[];
    audiosResults?: any[];
    documentsResults?: any[];
  };
};

export type SmartScanResultsCallback = (update: SmartScanResultsUpdate) => void;

const SCANNER_NAMES = [
  'WhatsApp Files',
  'Duplicate Images',
  'Large Files',
  'Old Files',
  'APK Files',
  'Caches',
  'Videos',
  'Images',
  'Audios',
  'Documents',
] as const;

/**
 * Run Smart Scan - executes all scanners sequentially
 * @param onProgress Callback for progress updates
 * @param onResultsUpdate Optional callback for results updates as each scanner completes
 * @returns Promise that resolves when all scans complete
 */
export async function runSmartScan(
  onProgress?: SmartScanProgressCallback,
  onResultsUpdate?: SmartScanResultsCallback
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
      apk: false,
      caches: false,
      videos: false,
      images: false,
      audios: false,
      documents: false,
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
    // Run scanners in parallel groups for maximum speed
    // Group 1: Fast scanners that can run in parallel (different directories)
    await Promise.all([
      (async () => {
        updateProgress(0, SCANNER_NAMES[0], 0, 'scanning WhatsApp files...');
        const results = await scanWhatsApp();
        await saveWhatsAppResults(results);
        status.scannerProgress.whatsapp = true;
        await persistStatus();
        updateProgress(0, SCANNER_NAMES[0], 1, `found ${results.length} WhatsApp files`);
        onResultsUpdate?.({ scannerType: 'whatsapp', scannerName: SCANNER_NAMES[0], results: { whatsappResults: results } });
        return results;
      })(),
      (async () => {
        updateProgress(5, SCANNER_NAMES[5], 0, 'scanning for cache files...');
        const results = await scanCaches();
        await saveCachesResults(results);
        status.scannerProgress.caches = true;
        await persistStatus();
        updateProgress(5, SCANNER_NAMES[5], 1, `found ${results.length} cache items`);
        onResultsUpdate?.({ scannerType: 'caches', scannerName: SCANNER_NAMES[5], results: { cachesResults: results } });
        return results;
      })(),
    ]);

    // Group 2: Unified scan - ONE filesystem walk for media, large files, and old files
    // This is MUCH faster than 3 separate scans hitting the same storage
    updateProgress(6, 'Unified Scan', 0, 'scanning all files...');
    const unifiedResults = await unifiedFileScan(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(6, 'Unified Scan', ratio, progress.currentFile || 'scanning...');
      }
    );

    await saveAPKResults(unifiedResults.apkFiles);
    status.scannerProgress.apk = true;
    updateProgress(4, SCANNER_NAMES[4], 1, `found ${unifiedResults.apkFiles.length} APK files`);
    onResultsUpdate?.({ scannerType: 'apk', scannerName: SCANNER_NAMES[4], results: { apkResults: unifiedResults.apkFiles } });

    // Save all results
    await saveVideosResults(unifiedResults.videos);
    status.scannerProgress.videos = true;
    updateProgress(6, SCANNER_NAMES[6], 1, `found ${unifiedResults.videos.length} video files`);
    onResultsUpdate?.({ scannerType: 'videos', scannerName: SCANNER_NAMES[6], results: { videosResults: unifiedResults.videos } });

    await saveImagesResults(unifiedResults.images);
    status.scannerProgress.images = true;
    updateProgress(7, SCANNER_NAMES[7], 1, `found ${unifiedResults.images.length} image files`);
    onResultsUpdate?.({ scannerType: 'images', scannerName: SCANNER_NAMES[7], results: { imagesResults: unifiedResults.images } });

    await saveAudiosResults(unifiedResults.audios);
    status.scannerProgress.audios = true;
    updateProgress(8, SCANNER_NAMES[8], 1, `found ${unifiedResults.audios.length} audio files`);
    onResultsUpdate?.({ scannerType: 'audios', scannerName: SCANNER_NAMES[8], results: { audiosResults: unifiedResults.audios } });

    await saveDocumentsResults(unifiedResults.documents);
    status.scannerProgress.documents = true;
    updateProgress(9, SCANNER_NAMES[9], 1, `found ${unifiedResults.documents.length} document files`);
    onResultsUpdate?.({ scannerType: 'documents', scannerName: SCANNER_NAMES[9], results: { documentsResults: unifiedResults.documents } });

    await saveLargeFileResults(unifiedResults.largeFiles);
    status.scannerProgress.largeFiles = true;
    updateProgress(2, SCANNER_NAMES[2], 1, `found ${unifiedResults.largeFiles.length} large files`);
    onResultsUpdate?.({ scannerType: 'largeFiles', scannerName: SCANNER_NAMES[2], results: { largeFileResults: unifiedResults.largeFiles } });

    await saveOldFileResults(unifiedResults.oldFiles);
    status.scannerProgress.oldFiles = true;
    updateProgress(3, SCANNER_NAMES[3], 1, `found ${unifiedResults.oldFiles.length} old files`);
    onResultsUpdate?.({ scannerType: 'oldFiles', scannerName: SCANNER_NAMES[3], results: { oldFileResults: unifiedResults.oldFiles } });

    await persistStatus();

    // Duplicate scanner - use images from unified scan (no need to scan again!)
    updateProgress(1, SCANNER_NAMES[1], 0, 'scanning for duplicate images...');
    const duplicateResults = await scanForDuplicatesFromImages(
      unifiedResults.images.map(img => ({ path: img.path, size: img.size, modifiedDate: img.modified })),
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
    onResultsUpdate?.({
      scannerType: 'duplicates',
      scannerName: SCANNER_NAMES[1],
      results: { duplicateResults: duplicateResults || [] },
    });

    // Mark as completed
    status.completed = true;
    status.completedAt = Date.now();
    await saveSmartScanStatus(status);

    updateProgress(10, 'Complete', 1, 'smart scan completed');
  } catch (error) {
    console.error('Smart scan error:', error);
    // Save partial status
    await saveSmartScanStatus(status);
    throw error;
  }
}

