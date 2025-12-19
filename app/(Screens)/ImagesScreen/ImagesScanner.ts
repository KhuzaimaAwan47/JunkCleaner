import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

export interface ScanProgress {
  total: number;
  current: number;
  scannedFiles?: number;
  currentFile?: string;
  stage?: string;
}

const BATCH_SIZE = 20;
const PROGRESS_THROTTLE_MS = 120;
const MIN_IMAGE_SIZE_BYTES = 10 * 1024; // Skip tiny thumbnails
const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
  '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf',
  '.sr2', '.arw', '.dng', '.psd', '.ai', '.eps', '.pcx', '.tga', '.bpg',
];

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
  /\/Android\/data(\/|$)/i,
  /\/Android\/obb(\/|$)/i,
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

export const scanImages = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const emitProgress = createThrottledProgress(onProgress);
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildImageRootPaths();
  const results: CategoryFile[] = [];
  const queue = [...rootPaths];
  const visited = new Set<string>();
  let processed = 0;

  emitProgress({ total: 0, current: 0, stage: 'scanning', currentFile: 'initializing' });

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

            // Filter out very small files (thumbnails)
            if (size > MIN_IMAGE_SIZE_BYTES) {
              results.push({
                path: entry.path,
                size,
                modified: modifiedDate,
                category: 'Images',
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
      stage: 'scanning',
      currentFile: currentDir.split('/').pop() || currentDir,
    });
  }

  const finishedAt = Date.now();
  console.log(
    `[ImagesScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function ImagesScannerRoute(): null {
  return null;
}

