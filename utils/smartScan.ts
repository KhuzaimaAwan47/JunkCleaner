import { scanForDuplicates } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import { scanLargeFiles } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import { scanOldFiles } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import { scanWhatsApp } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';
import { scanAPKFiles } from '../app/(Screens)/APKCleanerScreen/APKCleanerScanner';
import { scanCaches } from '../app/(Screens)/CachesScreen/CachesScanner';
import { scanVideos } from '../app/(Screens)/VideosScreen/VideosScanner';
import { scanImages } from '../app/(Screens)/ImagesScreen/ImagesScanner';
import { scanAudios } from '../app/(Screens)/AudiosScreen/AudiosScanner';
import { scanDocuments } from '../app/(Screens)/DocumentsScreen/DocumentsScanner';
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
    // 1. WhatsApp Scanner
    updateProgress(0, SCANNER_NAMES[0], 0, 'scanning WhatsApp files...');
    const whatsappResults = await scanWhatsApp();
    await saveWhatsAppResults(whatsappResults);
    status.scannerProgress.whatsapp = true;
    await persistStatus();
    updateProgress(0, SCANNER_NAMES[0], 1, `found ${whatsappResults.length} WhatsApp files`);
    onResultsUpdate?.({
      scannerType: 'whatsapp',
      scannerName: SCANNER_NAMES[0],
      results: { whatsappResults },
    });

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
    onResultsUpdate?.({
      scannerType: 'duplicates',
      scannerName: SCANNER_NAMES[1],
      results: { duplicateResults: duplicateResults || [] },
    });

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
    onResultsUpdate?.({
      scannerType: 'largeFiles',
      scannerName: SCANNER_NAMES[2],
      results: { largeFileResults },
    });

    // 4. Old Files Scanner
    updateProgress(3, SCANNER_NAMES[3], 0, 'scanning for old files...');
    const oldFileResults = await scanOldFiles(90); // 90 days threshold
    await saveOldFileResults(oldFileResults);
    status.scannerProgress.oldFiles = true;
    await persistStatus();
    updateProgress(3, SCANNER_NAMES[3], 1, `found ${oldFileResults.length} old files`);
    onResultsUpdate?.({
      scannerType: 'oldFiles',
      scannerName: SCANNER_NAMES[3],
      results: { oldFileResults },
    });

    // 5. APK Files Scanner
    updateProgress(4, SCANNER_NAMES[4], 0, 'scanning for APK files...');
    const apkResults = await scanAPKFiles();
    await saveAPKResults(apkResults);
    status.scannerProgress.apk = true;
    await persistStatus();
    updateProgress(4, SCANNER_NAMES[4], 1, `found ${apkResults.length} APK files`);
    onResultsUpdate?.({
      scannerType: 'apk',
      scannerName: SCANNER_NAMES[4],
      results: { apkResults },
    });

    // 6. Caches Scanner
    updateProgress(5, SCANNER_NAMES[5], 0, 'scanning for cache files...');
    const cachesResults = await scanCaches();
    await saveCachesResults(cachesResults);
    status.scannerProgress.caches = true;
    await persistStatus();
    updateProgress(5, SCANNER_NAMES[5], 1, `found ${cachesResults.length} cache items`);
    onResultsUpdate?.({
      scannerType: 'caches',
      scannerName: SCANNER_NAMES[5],
      results: { cachesResults },
    });

    // 7. Videos Scanner
    updateProgress(6, SCANNER_NAMES[6], 0, 'scanning for video files...');
    const videosResults = await scanVideos(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(6, SCANNER_NAMES[6], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveVideosResults(videosResults);
    status.scannerProgress.videos = true;
    await persistStatus();
    updateProgress(6, SCANNER_NAMES[6], 1, `found ${videosResults.length} video files`);
    onResultsUpdate?.({
      scannerType: 'videos',
      scannerName: SCANNER_NAMES[6],
      results: { videosResults },
    });

    // 8. Images Scanner
    updateProgress(7, SCANNER_NAMES[7], 0, 'scanning for image files...');
    const imagesResults = await scanImages(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(7, SCANNER_NAMES[7], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveImagesResults(imagesResults);
    status.scannerProgress.images = true;
    await persistStatus();
    updateProgress(7, SCANNER_NAMES[7], 1, `found ${imagesResults.length} image files`);
    onResultsUpdate?.({
      scannerType: 'images',
      scannerName: SCANNER_NAMES[7],
      results: { imagesResults },
    });

    // 9. Audios Scanner
    updateProgress(8, SCANNER_NAMES[8], 0, 'scanning for audio files...');
    const audiosResults = await scanAudios(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(8, SCANNER_NAMES[8], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveAudiosResults(audiosResults);
    status.scannerProgress.audios = true;
    await persistStatus();
    updateProgress(8, SCANNER_NAMES[8], 1, `found ${audiosResults.length} audio files`);
    onResultsUpdate?.({
      scannerType: 'audios',
      scannerName: SCANNER_NAMES[8],
      results: { audiosResults },
    });

    // 10. Documents Scanner
    updateProgress(9, SCANNER_NAMES[9], 0, 'scanning for document files...');
    const documentsResults = await scanDocuments(
      (progress) => {
        const ratio = progress.total > 0 ? progress.current / progress.total : 0;
        updateProgress(9, SCANNER_NAMES[9], ratio, progress.currentFile || 'scanning...');
      }
    );
    await saveDocumentsResults(documentsResults);
    status.scannerProgress.documents = true;
    await persistStatus();
    updateProgress(9, SCANNER_NAMES[9], 1, `found ${documentsResults.length} document files`);
    onResultsUpdate?.({
      scannerType: 'documents',
      scannerName: SCANNER_NAMES[9],
      results: { documentsResults },
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

