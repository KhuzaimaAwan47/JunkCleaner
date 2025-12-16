import CryptoJS from 'crypto-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { getCachedFile, initDatabase, loadDuplicateGroups, saveDuplicateGroups, saveFileCache } from '../../../utils/db';

export interface ImageFile {
  path: string;
  size: number;
  modifiedDate: number;
}

export interface DuplicateGroup {
  hash: string;
  files: ImageFile[];
}

export interface ScanProgress {
  total: number;
  current: number;
  scannedFiles?: number;
  totalFiles?: number;
  currentFile?: string;
  stage?: string;
}

const BATCH_SIZE = 20;
const HASH_BATCH_SIZE = 10;
const MIN_IMAGE_SIZE_BYTES = 10 * 1024; // Skip tiny thumbnails to cut scan time
const PROGRESS_THROTTLE_MS = 120;
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

const SKIP_PATH_PATTERNS = [
  /\/\.thumbnails(\/|$)/i,
  /\/\.cache(\/|$)/i,
  /\/\.trash(\/|$)/i,
  /\/proc(\/|$)/i,
  /\/system(\/|$)/i,
  /\/dev(\/|$)/i,
];

const shouldSkipPath = (path: string): boolean => {
  return SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));
};

const isImageFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const safeReadDir = async (directory: string): Promise<RNFS.ReadDirItem[]> => {
  try {
    return await RNFS.readDir(directory);
  } catch {
    return [];
  }
};

const createThrottledProgress = (onProgress?: (progress: ScanProgress) => void) => {
  let lastEmit = 0;
  return (progress: ScanProgress) => {
    const now = Date.now();
    if (now - lastEmit >= PROGRESS_THROTTLE_MS) {
      lastEmit = now;
      onProgress?.(progress);
    }
  };
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
  const emitProgress = createThrottledProgress(onProgress);
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildImageRootPaths();
  const results: ImageFile[] = [];
  const queue = [...rootPaths];
  const visited = new Set<string>();
  let processed = 0;

  emitProgress({ total: 0, current: 0, stage: 'collecting', currentFile: 'initializing' });

  while (queue.length > 0) {
    if (cancelRef?.current) {
      break;
    }

    const currentDir = queue.shift();
    if (!currentDir || visited.has(currentDir) || shouldSkipPath(currentDir)) {
      continue;
    }
    visited.add(currentDir);

    const entries = await safeReadDir(currentDir);
    processed += 1;

    const batches: RNFS.ReadDirItem[][] = [];
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      batches.push(entries.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      if (cancelRef?.current) {
        break;
      }

      await Promise.allSettled(
        batch.map(async (entry) => {
          if (shouldSkipPath(entry.path)) {
            return;
          }

          if (entry.isDirectory()) {
            if (!visited.has(entry.path)) {
              queue.push(entry.path);
            }
            return;
          }

          if (entry.isFile() && isImageFile(entry.name)) {
            const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
            const modifiedDate = entry.mtime ? entry.mtime.getTime() : Date.now();

            if (size > MIN_IMAGE_SIZE_BYTES) {
              results.push({
                path: entry.path,
                size,
                modifiedDate,
              });
            }
          }
        }),
      );
    }

    const total = processed + queue.length || 1;
    emitProgress({
      total,
      current: processed,
      scannedFiles: results.length,
      stage: 'collecting',
      currentFile: currentDir.split('/').pop() || currentDir,
    });
  }

  return results;
};

// Quick hash: For files <= 1KB, hash the whole file. For larger files, use size-based identifier
const QUICK_HASH_SIZE = 1024; // 1KB threshold

const computeQuickHash = async (filePath: string, fileSize: number): Promise<string> => {
  try {
    // For small files, hash the entire file (fast)
    if (fileSize <= QUICK_HASH_SIZE) {
      const content = await RNFS.readFile(filePath, 'base64');
      const wordArray = CryptoJS.enc.Base64.parse(content);
      return CryptoJS.MD5(wordArray).toString();
    } else {
      // For larger files, create a size-based quick identifier
      // This will be refined with full hash later if quick hashes match
      // Use a combination that's unique enough for quick filtering
      return `size_${fileSize}`;
    }
  } catch {
    return '';
  }
};

const computeMD5Hash = async (filePath: string): Promise<string> => {
  try {
    if (typeof (RNFS as any).hash === 'function') {
      const hash = await (RNFS as any).hash(filePath, 'md5');
      if (hash) {
        return hash;
      }
    }
  } catch {
    // Fall through to manual hashing
  }

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
      // Return quick hash if available and requested, otherwise full hash
      if (useQuickHash && cached.partialHash) {
        // For size-based quick hash, regenerate it (it's deterministic)
        if (cached.partialHash.startsWith('size_')) {
          return `size_${file.size}`;
        }
        return cached.partialHash;
      }
      if (cached.fullHash) {
        return cached.fullHash;
      }
      // If we have partial but need full, compute full hash
      if (cached.partialHash && !useQuickHash && !cached.partialHash.startsWith('size_')) {
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
      
      // If we computed quick hash, we still need to save it
      // Full hash will be computed later if needed
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

  // Phase 1: Quick hash (first 1KB) for fast filtering
  const quickHashGroups = new Map<string, ImageFile[]>();
  let quickHashed = 0;

  const batches: ImageFile[][] = [];
  for (let i = 0; i < candidates.length; i += HASH_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + HASH_BATCH_SIZE));
  }

  for (const batch of batches) {
    if (cancelRef?.current) {
      break;
    }

    await Promise.allSettled(
      batch.map(async (file) => {
        if (cancelRef?.current) {
          return;
        }

        if (file.size < MIN_IMAGE_SIZE_BYTES) {
          quickHashed += 1;
          emitProgress({
            total: candidates.length,
            current: quickHashed,
            scannedFiles: quickHashed,
            stage: 'quick-hashing',
            currentFile: file.path.split('/').pop() || file.path,
          });
          return;
        }

        // Use quick hash for initial grouping
        // For files with same size, use quick hash; otherwise skip to full hash
        const quickHash = file.size <= QUICK_HASH_SIZE 
          ? await getOrComputeHash(file, true)
          : `size_${file.size}`;
        if (quickHash) {
          const existing = quickHashGroups.get(quickHash) || [];
          quickHashGroups.set(quickHash, [...existing, file]);
        }

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
  }

  // Phase 2: Full hash only for files with matching quick hashes
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

  for (const [, group] of quickHashGroups) {
    if (cancelRef?.current) {
      break;
    }

    // Only compute full hash if quick hash matched (potential duplicates)
    if (group.length > 1) {
      await Promise.allSettled(
        group.map(async (file) => {
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
    }
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