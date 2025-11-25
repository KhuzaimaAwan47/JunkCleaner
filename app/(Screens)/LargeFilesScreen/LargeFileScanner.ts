import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';

export type LargeFileSource = 'recursive' | 'media' | 'extension' | 'old-large';

export interface LargeFileResult {
  path: string;
  size: number;
  modified: number | null;
  category: string;
  source: LargeFileSource;
}

export type ScanPhase = 'permissions' | 'media' | 'directories' | 'extensions' | 'finalizing';

export interface ScanProgressSnapshot {
  phase: ScanPhase;
  ratio: number;
  detail?: string;
}

const PHASE_WEIGHTS: Record<ScanPhase, number> = {
  permissions: 0.05,
  media: 0.45,
  directories: 0.3,
  extensions: 0.15,
  finalizing: 0.05,
};
const PHASE_ORDER: ScanPhase[] = ['permissions', 'media', 'directories', 'extensions', 'finalizing'];
const PHASE_OFFSETS = PHASE_ORDER.reduce<Record<ScanPhase, number>>((acc, phase, index) => {
  if (index === 0) {
    acc[phase] = 0;
    return acc;
  }
  const prevPhase = PHASE_ORDER[index - 1];
  acc[phase] = acc[prevPhase] + PHASE_WEIGHTS[prevPhase];
  return acc;
}, {} as Record<ScanPhase, number>);

const ROOTS = [
  'file:///storage/emulated/0/Downloads',
  'file:///storage/emulated/0/DCIM',
  'file:///storage/emulated/0/Movies',
  'file:///storage/emulated/0/Pictures',
  'file:///storage/emulated/0/WhatsApp/Media',
];
const EXT_TARGETS = ['.mp4', '.mkv', '.zip', '.rar', '.obb', '.apk', '.pdf'];
const MAX_DIRECTORY_DEPTH = 2;
const OLD_FILE_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type FastInfo = {
  exists: boolean;
  size: number;
  isDirectory: boolean;
  modificationTime: number | null;
};

const DEFAULT_THRESHOLD = 10 * 1024 * 1024; // 10 MB
const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

export const scanLargeFiles = async (
  threshold: number = DEFAULT_THRESHOLD,
  onProgress?: (snapshot: ScanProgressSnapshot) => void,
): Promise<LargeFileResult[]> => {
  const emit = (phase: ScanPhase, localRatio: number, detail?: string) => {
    const start = PHASE_OFFSETS[phase] ?? 0;
    const ratio = clamp(start + PHASE_WEIGHTS[phase] * clamp(localRatio));
    onProgress?.({ phase, ratio, detail });
  };

  emit('permissions', 0, 'requesting storage access');
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    emit('permissions', 1, 'permission denied');
    return [];
  }
  emit('permissions', 1, 'permission granted');

  const media = await scanMedia(threshold, (progress, detail) => emit('media', progress, detail));
  emit('media', 1, 'media library indexed');
  const dirs = await scanDirectories(threshold, (progress, detail) => emit('directories', progress, detail));
  emit('directories', 1, 'priority folders scanned');
  const extFiles = await scanByExtension(threshold, (progress, detail) => emit('extensions', progress, detail));
  emit('extensions', 1, 'extension targets scanned');

  const merged = mergeResults([...media, ...dirs, ...extFiles]);
  const withOldFlag = detectOldLargeFiles(merged, threshold);
  emit('finalizing', 1, 'compiling results');
  return withOldFlag.sort((a, b) => b.size - a.size);
};

const scanMedia = async (
  threshold: number,
  reportProgress?: (progress: number, detail?: string) => void,
): Promise<LargeFileResult[]> => {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    reportProgress?.(1, 'media permission denied');
    return [];
  }

  const collected: LargeFileResult[] = [];
  let after: string | undefined;
  let hasNextPage = true;
  let batches = 0;
  const MAX_HINT_BATCHES = 8;

  while (hasNextPage) {
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        first: 2000,
        after,
        sortBy: MediaLibrary.SortBy.modificationTime,
      });

      batches += 1;
      hasNextPage = page.hasNextPage;
      after = page.endCursor ?? undefined;
      const progress = hasNextPage ? Math.min(batches / MAX_HINT_BATCHES, 0.95) : 1;
      reportProgress?.(progress, `processed ${collected.length} assets`);

      for (const asset of page.assets) {
        const assetInfo = (await MediaLibrary.getAssetInfoAsync(asset)) as MediaLibrary.AssetInfo & {
          size?: number;
        };
        const uri = assetInfo.localUri ?? asset.uri;
        const size = assetInfo.size ?? 0;
        if (size <= threshold) {
          continue;
        }
        collected.push({
          path: uri,
          size,
          modified: asset.modificationTime ?? null,
          category: inferCategory(uri),
          source: 'media',
        });
      }
    } catch {
      break;
    }
  }

  return collected;
};

const scanDirectories = async (
  threshold: number,
  reportProgress?: (progress: number, detail?: string) => void,
): Promise<LargeFileResult[]> => {
  const out: LargeFileResult[] = [];
  for (let index = 0; index < ROOTS.length; index += 1) {
    const dir = ROOTS[index];
    await walkDirectory(dir, 0, threshold, out);
    reportProgress?.(((index + 1) / ROOTS.length) || 1, dir.split('/').pop() ?? dir);
  }
  return out;
};

const walkDirectory = async (
  directory: string,
  depth: number,
  threshold: number,
  results: LargeFileResult[],
): Promise<void> => {
  if (depth > MAX_DIRECTORY_DEPTH) {
    return;
  }

  const entries = await safeReadDir(directory);
  for (const entry of entries) {
    const fullPath = joinPath(directory, entry);
    const info = await fastInfo(fullPath);
    if (!info.exists) {
      continue;
    }

    if (info.isDirectory) {
      if (shouldSkipDirectory(fullPath)) {
        continue;
      }
      await walkDirectory(fullPath, depth + 1, threshold, results);
      continue;
    }

    if (info.size > threshold) {
      results.push(createResult(fullPath, info.size, info.modificationTime, 'recursive'));
    }
  }
};

const scanByExtension = async (
  threshold: number,
  reportProgress?: (progress: number, detail?: string) => void,
): Promise<LargeFileResult[]> => {
  const out: LargeFileResult[] = [];

  for (let index = 0; index < ROOTS.length; index += 1) {
    const root = ROOTS[index];
    const entries = await safeReadDir(root);
    for (const entry of entries) {
      const fullPath = joinPath(root, entry);
      if (!matchesLargeExtension(fullPath)) {
        continue;
      }
      const info = await fastInfo(fullPath);
      if (!info.exists || info.isDirectory || info.size <= threshold) {
        continue;
      }
      out.push(createResult(fullPath, info.size, info.modificationTime, 'extension'));
    }
    reportProgress?.(((index + 1) / ROOTS.length) || 1, root.split('/').pop() ?? root);
  }

  return out;
};

const mergeResults = (items: LargeFileResult[]): LargeFileResult[] => {
  const map = new Map<string, LargeFileResult>();
  for (const item of items) {
    const existing = map.get(item.path);
    if (!existing || item.size > existing.size) {
      map.set(item.path, item);
    }
  }
  return Array.from(map.values());
};

const detectOldLargeFiles = (items: LargeFileResult[], threshold: number): LargeFileResult[] => {
  const cutoff = Date.now() - OLD_FILE_AGE_MS;
  return items.map((item) => {
    if (item.size > threshold && item.modified !== null && item.modified * 1000 < cutoff) {
      return { ...item, source: 'old-large' };
    }
    return item;
  });
};

const matchesLargeExtension = (path: string): boolean =>
  EXT_TARGETS.some((ext) => path.toLowerCase().endsWith(ext));

const fastInfo = async (path: string): Promise<FastInfo> => {
  try {
    const info = (await FileSystem.getInfoAsync(path)) as FileSystem.FileInfo & {
      size?: number;
      modificationTime?: number;
    };
    return {
      exists: info.exists ?? false,
      size: info.size ?? 0,
      isDirectory: Boolean((info as Record<string, unknown>).isDirectory),
      modificationTime: info.modificationTime ?? null,
    };
  } catch {
    return {
      exists: false,
      size: 0,
      isDirectory: false,
      modificationTime: null,
    };
  }
};

const safeReadDir = async (directory: string): Promise<string[]> => {
  try {
    const normalized = directory.endsWith('/') ? directory : `${directory}/`;
    return await FileSystem.readDirectoryAsync(normalized);
  } catch {
    return [];
  }
};

const joinPath = (base: string, segment: string): string => {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanedSegment = segment.replace(/^\/+/, '');
  return `${normalizedBase}${cleanedSegment}`;
};

const inferCategory = (path: string): string => {
  const lower = path.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.mkv')) {
    return 'video';
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.obb') || lower.endsWith('.apk')) {
    return 'archive';
  }
  if (lower.endsWith('.pdf')) {
    return 'document';
  }
  return 'unknown';
};

const createResult = (
  path: string,
  size: number,
  modified: number | null,
  source: LargeFileSource,
): LargeFileResult => ({
  path,
  size,
  modified,
  category: inferCategory(path),
  source,
});

const shouldSkipDirectory = (path: string): boolean => path.includes('/Android/');

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
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

