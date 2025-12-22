import CryptoJS from 'crypto-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { getCachedFile, initDatabase, loadDuplicateGroups, saveDuplicateGroups, saveFileCache } from '../../../utils/db';
import { fastScan, createExtensionFilter, createSizeFilter, type ScanProgress } from '../../../utils/fastScanner';

export interface ImageFile {
  path: string;
  size: number;
  modifiedDate: number;
}

export interface DuplicateGroup {
  hash: string;
  files: ImageFile[];
}

const HASH_BATCH_SIZE = 50; // Increased for parallel hashing
const MIN_IMAGE_SIZE_BYTES = 10 * 1024; // Skip tiny thumbnails to cut scan time
const QUICK_HASH_SIZE = 2 * 1024; // Use first 2KB for quick hash (reduced for speed)
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
  '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf',
  '.sr2', '.arw', '.dng', '.psd', '.ai', '.eps', '.pcx', '.tga'];

const buildImageRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/DCIM`,
    `${base}/Pictures`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Images`,
    `${base}/WhatsApp/Media/WhatsApp Video`,
    `${base}/Android/media`,
  ].filter(Boolean);
};

const ensurePerms = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
  const needsLegacyPermissions = version < 33;

  const permissionCandidates: (Permission | undefined)[] = needsLegacyPermissions
    ? [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]
    : [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

const collectImageFiles = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<ImageFile[]> => {
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildImageRootPaths();
  const imageFilter = createExtensionFilter(IMAGE_EXTENSIONS);
  const sizeFilter = createSizeFilter(MIN_IMAGE_SIZE_BYTES);
  
  const combinedFilter = (entry: RNFS.ReadDirItem) => {
    return imageFilter(entry) && sizeFilter(entry);
  };

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    fileFilter: combinedFilter,
    maxConcurrentDirs: 10,
    batchSize: 100,
    onProgress: (progress) => {
      onProgress?.({
        ...progress,
        stage: 'collecting',
      });
    },
    cancelRef,
  });

  return entries.map((entry) => {
    const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
    const modifiedDate = entry.mtime ? entry.mtime.getTime() : Date.now();
    return {
      path: entry.path,
      size,
      modifiedDate,
    };
  });
};

// Optimized quick hash: Use first 2KB + middle 2KB + size for better accuracy without reading whole file
const computeQuickHash = async (filePath: string, fileSize: number): Promise<string> => {
  try {
    // For small files, hash the entire file (fast)
    if (fileSize <= QUICK_HASH_SIZE) {
      const content = await RNFS.readFile(filePath, 'base64');
      const wordArray = CryptoJS.enc.Base64.parse(content);
      return CryptoJS.MD5(wordArray).toString();
    } else {
      // For larger files, use size-based identifier (very fast, no I/O)
      // Only compute hash for files with matching sizes (done in findDuplicates)
      // This avoids reading files unnecessarily
      return `size_${fileSize}`;
    }
  } catch {
    return '';
  }
};

const computeMD5Hash = async (filePath: string): Promise<string> => {
  // Always try native hash first (much faster)
  try {
    if (typeof (RNFS as any).hash === 'function') {
      const hash = await (RNFS as any).hash(filePath, 'md5');
      if (hash && hash.length > 0) {
        return hash;
      }
    }
  } catch (error) {
    // If native hash fails, fall through to manual hashing
    console.warn(`[DuplicateScan] Native hash failed for ${filePath}, using manual hash:`, error);
  }

  // Fallback to manual hashing (slower but works)
  try {
    const content = await RNFS.readFile(filePath, 'base64');
    const wordArray = CryptoJS.enc.Base64.parse(content);
    return CryptoJS.MD5(wordArray).toString();
  } catch {
    return '';
  }
};

const getOrComputeHash = async (file: ImageFile, useQuickHash: boolean = false): Promise<string> => {
  try {
    const cached = await getCachedFile(file.path);
    if (
      cached &&
      cached.size === file.size &&
      cached.modifiedDate === file.modifiedDate
    ) {
      // Return quick hash if available and requested
      if (useQuickHash && cached.partialHash) {
        // For old size-based quick hash, regenerate with new format
        if (cached.partialHash.startsWith('size_')) {
          // Recompute with new 4KB hash format
          return await computeQuickHash(file.path, file.size);
        }
        return cached.partialHash;
      }
      if (cached.fullHash) {
        return cached.fullHash;
      }
      // If we have partial but need full, compute full hash
      if (cached.partialHash && !useQuickHash) {
        const fullHash = await computeMD5Hash(file.path);
        if (fullHash) {
          try {
            await saveFileCache({
              path: file.path,
              size: file.size,
              partialHash: cached.partialHash,
              fullHash,
              modifiedDate: file.modifiedDate,
            });
          } catch {
            // Cache failures should not break scanning
          }
        }
        return fullHash;
      }
    }
  } catch {
    // ignore cache errors, fall back to hashing
  }

  // Compute hash based on type requested
  const hash = useQuickHash 
    ? await computeQuickHash(file.path, file.size)
    : await computeMD5Hash(file.path);

  if (hash) {
    // Persist hash so future scans can skip hashing unchanged files
    try {
      const fullHash = useQuickHash ? null : hash;
      const partialHash = useQuickHash ? hash : hash.slice(0, 12) || hash;
      
      await saveFileCache({
        path: file.path,
        size: file.size,
        partialHash,
        fullHash,
        modifiedDate: file.modifiedDate,
      });
    } catch {
      // Cache failures should not break scanning
    }
  }

  return hash;
};

const createThrottledProgress = (onProgress?: (progress: ScanProgress) => void) => {
  let lastEmit = 0;
  const PROGRESS_THROTTLE_MS = 200;
  return (progress: ScanProgress) => {
    const now = Date.now();
    if (now - lastEmit >= PROGRESS_THROTTLE_MS) {
      lastEmit = now;
      onProgress?.(progress);
    }
  };
};

const findDuplicates = async (
  files: ImageFile[],
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<DuplicateGroup[]> => {
  const emitProgress = createThrottledProgress(onProgress);
  if (files.length === 0) {
    return [];
  }

  emitProgress({ total: files.length, current: 0, stage: 'grouping', currentFile: 'analyzing sizes' });

  // Phase 1: Group by size (fast, no I/O)
  const sizeGroups = new Map<number, ImageFile[]>();
  for (const file of files) {
    const existing = sizeGroups.get(file.size) || [];
    sizeGroups.set(file.size, [...existing, file]);
  }

  const candidates: ImageFile[] = [];
  for (const [, group] of sizeGroups) {
    if (group.length > 1) {
      candidates.push(...group);
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  emitProgress({ total: candidates.length, current: 0, stage: 'quick-hashing', currentFile: 'computing quick hashes' });

  // Phase 2: Quick hash (first 4KB + size) for fast filtering with parallel processing
  const quickHashGroups = new Map<string, ImageFile[]>();
  let quickHashed = 0;

  const batches: ImageFile[][] = [];
  for (let i = 0; i < candidates.length; i += HASH_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + HASH_BATCH_SIZE));
  }

  // Process batches in parallel with higher concurrency
  const processBatch = async (batch: ImageFile[]) => {
    await Promise.allSettled(
      batch.map(async (file) => {
        if (cancelRef?.current) {
          return;
        }

        // Use size as quick hash (very fast, no I/O)
        // Only files with matching sizes need full hash
        const quickHash = `size_${file.size}`;
        const existing = quickHashGroups.get(quickHash) || [];
        quickHashGroups.set(quickHash, [...existing, file]);

        quickHashed += 1;
        emitProgress({
          total: candidates.length,
          current: quickHashed,
          scannedFiles: quickHashed,
          stage: 'quick-hashing',
          currentFile: file.path.split('/').pop() || file.path,
        });
      }),
    );
  };

  // Process multiple batches concurrently (up to 8 at a time for hashing)
  const maxConcurrentBatches = 8;
  for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
    if (cancelRef?.current) {
      break;
    }
    const batchGroup = batches.slice(i, i + maxConcurrentBatches);
    await Promise.all(batchGroup.map(processBatch));
  }

  // Phase 3: Full hash only for files with matching quick hashes
  emitProgress({ total: candidates.length, current: quickHashed, stage: 'full-hashing', currentFile: 'computing full hashes' });

  const fullHashGroups = new Map<string, ImageFile[]>();
  let fullHashed = 0;
  let totalToFullHash = 0;

  // Count files that need full hashing (groups with >1 file)
  for (const [, group] of quickHashGroups) {
    if (group.length > 1) {
      totalToFullHash += group.length;
    }
  }

  // Process full hash groups in parallel
  const fullHashBatches: ImageFile[][] = [];
  for (const [, group] of quickHashGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i += HASH_BATCH_SIZE) {
        fullHashBatches.push(group.slice(i, i + HASH_BATCH_SIZE));
      }
    }
  }

  const processFullHashBatch = async (batch: ImageFile[]) => {
    await Promise.allSettled(
      batch.map(async (file) => {
        if (cancelRef?.current) {
          return;
        }

        const fullHash = await getOrComputeHash(file, false);
        if (fullHash) {
          const existing = fullHashGroups.get(fullHash) || [];
          fullHashGroups.set(fullHash, [...existing, file]);
        }

        fullHashed += 1;
        emitProgress({
          total: totalToFullHash || candidates.length,
          current: fullHashed,
          scannedFiles: fullHashed,
          stage: 'full-hashing',
          currentFile: file.path.split('/').pop() || file.path,
        });
      }),
    );
  };

  // Process full hash batches with higher concurrency (up to 10 at a time)
  for (let i = 0; i < fullHashBatches.length; i += 10) {
    if (cancelRef?.current) {
      break;
    }
    const batchGroup = fullHashBatches.slice(i, i + 10);
    await Promise.all(batchGroup.map(processFullHashBatch));
  }

  // Build final duplicate groups
  const duplicates: DuplicateGroup[] = [];
  for (const [hash, group] of fullHashGroups) {
    if (group.length > 1) {
      duplicates.push({ hash, files: group });
    }
  }

  return duplicates;
};

export const scanDuplicateImages = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<DuplicateGroup[]> => {
  const startedAt = Date.now();
  const files = await collectImageFiles(onProgress, cancelRef);
  const collectedAt = Date.now();
  if (cancelRef?.current || files.length === 0) {
    console.log('[DuplicateScan] skipped - no files or cancelled');
    return [];
  }

  await initDatabase();
  const duplicates = await findDuplicates(files, onProgress, cancelRef);
  onProgress?.({ total: files.length, current: files.length, scannedFiles: files.length, stage: 'complete' });
  const finishedAt = Date.now();

  console.log(
    `[DuplicateScan] files=${files.length} groups=${duplicates.length} collectMs=${collectedAt - startedAt} ` +
      `hashMs=${finishedAt - collectedAt} totalMs=${finishedAt - startedAt}`,
  );

  return duplicates;
};

/**
 * Scan duplicates from pre-collected image files (faster - skips file collection)
 */
export const scanForDuplicatesFromImages = async (
  imageFiles: ImageFile[],
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<DuplicateGroup[]> => {
  const startedAt = Date.now();
  if (cancelRef?.current || imageFiles.length === 0) {
    console.log('[DuplicateScan] skipped - no files or cancelled');
    return [];
  }

  await initDatabase();
  const duplicates = await findDuplicates(imageFiles, onProgress, cancelRef);
  onProgress?.({ total: imageFiles.length, current: imageFiles.length, scannedFiles: imageFiles.length, stage: 'complete' });
  const finishedAt = Date.now();

  console.log(
    `[DuplicateScan] files=${imageFiles.length} groups=${duplicates.length} hashMs=${finishedAt - startedAt} totalMs=${finishedAt - startedAt}`,
  );

  return duplicates;
};

export const scanForDuplicates = scanDuplicateImages;

export const useScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [progress, setProgress] = useState<ScanProgress>({ total: 0, current: 0 });
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Load saved results on mount so UI can render immediately with prior scan data
  useEffect(() => {
    let isMounted = true;

    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadDuplicateGroups();
        if (isMounted && savedResults.length > 0) {
          setDuplicates(savedResults);
          // Mark progress as complete so summary / rescan logic behaves like other screens
          setProgress((prev) => ({
            ...prev,
            total: savedResults.length,
            current: savedResults.length,
            stage: 'restored',
          }));
        }
      } catch (error) {
        console.error('Failed to load saved duplicate groups:', error);
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    loadSavedResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const startScan = useCallback(async () => {
    if (isScanning) {
      return;
    }

    setIsScanning(true);
    setProgress({ total: 0, current: 0 });
    setDuplicates([]);
    setError(null);
    cancelRef.current = false;

    try {
      const results = await scanDuplicateImages(
        (prog) => {
          if (!cancelRef.current) {
            setProgress(prog);
          }
        },
        cancelRef,
      );

      if (!cancelRef.current) {
        setDuplicates(results);
        setProgress((prev) => ({ ...prev, stage: 'complete' }));
        
        // Save results to database
        if (results.length > 0) {
          try {
            await initDatabase();
            await saveDuplicateGroups(results);
            console.log(`Saved ${results.length} duplicate groups to database`);
          } catch (dbError) {
            console.error('Failed to save duplicate groups to database:', dbError);
            // Don't throw - allow scan to complete even if save fails
          }
        } else {
          // Even if no duplicates, clear old results
          try {
            await initDatabase();
            await saveDuplicateGroups([]);
          } catch (dbError) {
            console.error('Failed to clear duplicate groups in database:', dbError);
          }
        }
      } else {
        setProgress((prev) => ({ ...prev, stage: 'cancelled', currentFile: 'Cancelled' }));
      }
    } catch (err) {
      if (!cancelRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to scan for duplicate images';
        setError(message);
      }
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  const stopScan = useCallback(() => {
    cancelRef.current = true;
    setIsScanning(false);
    setProgress((prev) => ({ ...prev, currentFile: 'Cancelled' }));
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return {
    isScanning,
    isRestoring,
    progress,
    duplicates,
    error,
    startScan,
    stopScan,
  };
};

export const ScannerProvider = ({ children }: { children: ReactNode }): ReactNode => {
  return children;
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function DuplicateImagesScannerRoute(): null {
  return null;
}