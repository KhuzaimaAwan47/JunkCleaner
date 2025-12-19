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
const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.opus', '.amr',
  '.3gp', '.aa', '.aax', '.act', '.aiff', '.alac', '.ape', '.au', '.awb',
  '.dct', '.dss', '.dvf', '.flv', '.gsm', '.iklax', '.ivs', '.m4b', '.m4p',
  '.mmf', '.mpc', '.msv', '.nmf', '.ogg', '.oga', '.mogg', '.ra', '.rm',
  '.raw', '.rf64', '.sln', '.tta', '.voc', '.vox', '.wv', '.wav', '.webm',
];

const buildAudioRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/Music`,
    `${base}/Audio`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Audio`,
    `${base}/WhatsApp/Media/WhatsApp Voice Notes`,
    `${base}/Android/media`,
    `${base}/DCIM`,
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

const isAudioFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
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
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const scanAudios = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const emitProgress = createThrottledProgress(onProgress);
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildAudioRootPaths();
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

          if (entry.isFile() && isAudioFile(entry.name)) {
            const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
            const modifiedDate = entry.mtime ? entry.mtime.getTime() : Date.now();

            results.push({
              path: entry.path,
              size,
              modified: modifiedDate,
              category: 'Audio',
            });
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
    `[AudiosScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function AudiosScannerRoute(): null {
  return null;
}

