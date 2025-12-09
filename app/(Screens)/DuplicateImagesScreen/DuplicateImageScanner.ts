import CryptoJS from 'crypto-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initDatabase, loadDuplicateGroups, saveDuplicateGroups } from '../../../utils/db';

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
  const results: ImageFile[] = [];
  const queue = [...rootPaths];
  const visited = new Set<string>();
  let processed = 0;

  onProgress?.({ total: 0, current: 0, stage: 'collecting', currentFile: 'initializing' });

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

            if (size > 0) {
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
    onProgress?.({
      total,
      current: processed,
      scannedFiles: results.length,
      stage: 'collecting',
      currentFile: currentDir.split('/').pop() || currentDir,
    });
  }

  return results;
};

const computeMD5Hash = async (filePath: string): Promise<string> => {
  try {
    const content = await RNFS.readFile(filePath, 'base64');
    const wordArray = CryptoJS.enc.Base64.parse(content);
    return CryptoJS.MD5(wordArray).toString();
  } catch {
    return '';
  }
};

const findDuplicates = async (
  files: ImageFile[],
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<DuplicateGroup[]> => {
  if (files.length === 0) {
    return [];
  }

  onProgress?.({ total: files.length, current: 0, stage: 'grouping', currentFile: 'analyzing sizes' });

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

  onProgress?.({ total: candidates.length, current: 0, stage: 'hashing', currentFile: 'computing hashes' });

  const hashGroups = new Map<string, ImageFile[]>();
  let hashed = 0;

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

        const hash = await computeMD5Hash(file.path);
        if (hash) {
          const existing = hashGroups.get(hash) || [];
          hashGroups.set(hash, [...existing, file]);
        }

        hashed += 1;
        onProgress?.({
          total: candidates.length,
          current: hashed,
          scannedFiles: hashed,
          stage: 'hashing',
          currentFile: file.path.split('/').pop() || file.path,
        });
      }),
    );
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [hash, group] of hashGroups) {
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
  const files = await collectImageFiles(onProgress, cancelRef);
  if (cancelRef?.current || files.length === 0) {
    return [];
  }

  const duplicates = await findDuplicates(files, onProgress, cancelRef);
  onProgress?.({ total: files.length, current: files.length, scannedFiles: files.length, stage: 'complete' });

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
