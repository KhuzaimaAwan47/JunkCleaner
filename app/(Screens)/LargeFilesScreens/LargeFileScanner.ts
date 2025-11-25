import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import React from 'react';

const ROOT_DIRECTORIES = ['file:///storage/emulated/0', 'file:///storage/self/primary'];
const EXT_PRIORITY_DIRECTORIES = [
  'Downloads',
  'Download',
  'DCIM',
  'Movies',
  'WhatsApp',
  'Android/data',
];
const DUPLICATE_PROBE_DIRECTORIES = [
  'DCIM',
  'Downloads',
  'Movies',
  'Android/obb',
];
const SPARSE_SCAN_DIRECTORIES = ['Android/data', 'Android/obb', 'Android/media', 'WhatsApp/.Shared'];

const LARGE_EXTENSIONS = ['.mp4', '.mkv', '.zip', '.rar', '.obb', '.apk', '.iso', '.mov', '.avi', '.pdf'];
const CATEGORY_MAP: Record<string, LargeFileCategory> = {
  '.mp4': 'video',
  '.mkv': 'video',
  '.mov': 'video',
  '.avi': 'video',
  '.mp3': 'audio',
  '.wav': 'audio',
  '.aac': 'audio',
  '.ogg': 'audio',
  '.zip': 'archive',
  '.rar': 'archive',
  '.obb': 'archive',
  '.apk': 'archive',
  '.iso': 'archive',
  '.pdf': 'document',
};

const DEFAULT_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_RECURSION_DEPTH = 5;
const MAX_FILES_PER_DIR = 500;
const MEDIA_PAGE_SIZE = 500;
const DUPLICATE_HASH_SAMPLE = 64 * 1024; // 64KB
const SPARSE_FILE_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type AlgorithmSource = 'recursive' | 'media' | 'ext-priority' | 'duplicate-hash' | 'sparse-block';
type LargeFileCategory = 'video' | 'audio' | 'archive' | 'document' | 'cache' | 'unknown';

export interface LargeFileInfo {
  path: string;
  size: number;
  modified: number | null;
  category: LargeFileCategory;
  algorithmSource: AlgorithmSource;
  possibleDuplicate?: boolean;
}

export async function scanLargeFiles(threshold: number = DEFAULT_THRESHOLD_BYTES): Promise<LargeFileInfo[]> {
  const lists = await Promise.all([
    scanRecursiveDirectories(threshold),
    scanMediaBuckets(threshold),
    scanExtensionPriorityDirs(threshold),
    scanDuplicateCandidates(threshold),
    scanSparseWaste(threshold),
  ]);

  const merged = mergeLargeFileLists(lists.flat());
  merged.sort((a, b) => b.size - a.size);
  return merged;
}

async function scanRecursiveDirectories(threshold: number): Promise<LargeFileInfo[]> {
  const results: LargeFileInfo[] = [];
  for (const root of ROOT_DIRECTORIES) {
    await walkDirectory(root, threshold, 0, results);
  }
  return results;
}

async function walkDirectory(path: string, threshold: number, depth: number, accumulator: LargeFileInfo[]): Promise<void> {
  if (depth > MAX_RECURSION_DEPTH) {
    return;
  }
  try {
    const normalizedPath = ensureTrailingSlash(path);
    const entries = await FileSystem.readDirectoryAsync(normalizedPath);
    const limitedEntries = entries.slice(0, MAX_FILES_PER_DIR);
    for (const entry of limitedEntries) {
      const fullPath = normalizedPath + entry;
      try {
        const info = await FileSystem.getInfoAsync(fullPath);
        if (!info.exists) {
          continue;
        }
        if (info.isDirectory) {
          await walkDirectory(fullPath, threshold, depth + 1, accumulator);
        } else if ((info.size ?? 0) > threshold) {
          accumulator.push(
            createLargeFileInfo(fullPath, info.size ?? 0, info.modificationTime ?? null, 'recursive'),
          );
        }
      } catch {
        // ignore file level errors
      }
    }
  } catch {
    // ignore directory level errors
  }
}

async function scanMediaBuckets(threshold: number): Promise<LargeFileInfo[]> {
  const results: LargeFileInfo[] = [];
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    return results;
  }

  let hasNextPage = true;
  let after: string | undefined;
  while (hasNextPage) {
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: MEDIA_PAGE_SIZE,
        after,
        mediaType: ['photo', 'video', 'audio'],
        sortBy: MediaLibrary.SortBy.default,
      });
      after = page.endCursor ?? undefined;
      hasNextPage = !!page.hasNextPage;
      for (const asset of page.assets) {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          const localUri = assetInfo.localUri || asset.uri;
          let size = (assetInfo as any).size ?? 0;
          
          if (!size && localUri) {
            try {
              const info = await FileSystem.getInfoAsync(localUri);
              size = info.exists && !info.isDirectory ? info.size || 0 : 0;
            } catch {
              // ignore file system errors
            }
          }
          
          if (size > threshold) {
            results.push({
              path: localUri,
              size,
              modified: asset.modificationTime ?? null,
              category: inferCategoryFromExtension(localUri),
              algorithmSource: 'media',
            });
          }
        } catch {
          // ignore asset errors
        }
      }
    } catch {
      break;
    }
  }
  return results;
}

async function scanExtensionPriorityDirs(threshold: number): Promise<LargeFileInfo[]> {
  const results: LargeFileInfo[] = [];
  for (const root of ROOT_DIRECTORIES) {
    for (const relative of EXT_PRIORITY_DIRECTORIES) {
      const target = joinPath(root, relative);
      await scanDirectoryForExtensions(target, threshold, results);
    }
  }
  return results;
}

async function scanDirectoryForExtensions(path: string, threshold: number, accumulator: LargeFileInfo[]): Promise<void> {
  try {
    const normalizedPath = ensureTrailingSlash(path);
    const entries = await FileSystem.readDirectoryAsync(normalizedPath);
    const limitedEntries = entries.slice(0, MAX_FILES_PER_DIR);
    for (const entry of limitedEntries) {
      const fullPath = normalizedPath + entry;
      try {
        const info = await FileSystem.getInfoAsync(fullPath);
        if (!info.exists || info.isDirectory) {
          continue;
        }
        if (matchesLargeExtension(fullPath) && (info.size ?? 0) > threshold) {
          accumulator.push(
            createLargeFileInfo(fullPath, info.size ?? 0, info.modificationTime ?? null, 'ext-priority'),
          );
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore directories we cannot read
  }
}

async function scanDuplicateCandidates(threshold: number): Promise<LargeFileInfo[]> {
  const results: LargeFileInfo[] = [];
  const hashBuckets: Record<string, LargeFileInfo[]> = {};
  for (const root of ROOT_DIRECTORIES) {
    for (const relative of DUPLICATE_PROBE_DIRECTORIES) {
      const target = joinPath(root, relative);
      const files = await safeReadDir(target);
      for (const file of files.slice(0, MAX_FILES_PER_DIR)) {
        const fullPath = ensureTrailingSlash(target) + file;
        try {
          const info = await FileSystem.getInfoAsync(fullPath);
          if (!info.exists || info.isDirectory) {
            continue;
          }
          const size = info.size ?? 0;
          if (size <= threshold) {
            continue;
          }
          const partialHash = await computePartialHash(fullPath);
          const bucketKey = `${size}:${partialHash}`;
          const candidate = createLargeFileInfo(
            fullPath,
            size,
            info.modificationTime ?? null,
            'duplicate-hash',
          );
          candidate.possibleDuplicate = true;
          if (!hashBuckets[bucketKey]) {
            hashBuckets[bucketKey] = [];
          }
          hashBuckets[bucketKey].push(candidate);
        } catch {
          continue;
        }
      }
    }
  }

  for (const bucket of Object.values(hashBuckets)) {
    if (bucket.length > 1) {
      results.push(...bucket);
    }
  }
  return results;
}

async function computePartialHash(path: string): Promise<string> {
  try {
    const contents = await FileSystem.readAsStringAsync(path, { encoding: 'base64' });
    const truncated = contents.slice(0, DUPLICATE_HASH_SAMPLE);
    return simpleHash(truncated);
  } catch {
    return 'NA';
  }
}

async function scanSparseWaste(threshold: number): Promise<LargeFileInfo[]> {
  const results: LargeFileInfo[] = [];
  const cutoff = Date.now() - SPARSE_FILE_AGE_MS;
  for (const root of ROOT_DIRECTORIES) {
    for (const relative of SPARSE_SCAN_DIRECTORIES) {
      const target = joinPath(root, relative);
      const entries = await safeReadDir(target);
      for (const entry of entries.slice(0, MAX_FILES_PER_DIR)) {
        const fullPath = ensureTrailingSlash(target) + entry;
        try {
          const info = await FileSystem.getInfoAsync(fullPath);
          if (!info.exists || info.isDirectory) {
            continue;
          }
          const size = info.size ?? 0;
          const modified = info.modificationTime ?? null;
          if (size > threshold && modified !== null && modified * 1000 < cutoff) {
            results.push({
              path: fullPath,
              size,
              modified,
              category: 'cache',
              algorithmSource: 'sparse-block',
            });
          }
        } catch {
          continue;
        }
      }
    }
  }
  return results;
}

function mergeLargeFileLists(items: LargeFileInfo[]): LargeFileInfo[] {
  const map = new Map<string, LargeFileInfo>();
  for (const info of items) {
    if (map.has(info.path)) {
      const existing = map.get(info.path)!;
      existing.category = existing.category === 'unknown' ? info.category : existing.category;
      existing.possibleDuplicate = existing.possibleDuplicate || info.possibleDuplicate;
    } else {
      map.set(info.path, info);
    }
  }
  return Array.from(map.values());
}

function createLargeFileInfo(path: string, size: number, modified: number | null, algorithmSource: AlgorithmSource): LargeFileInfo {
  return {
    path,
    size,
    modified,
    category: inferCategoryFromExtension(path),
    algorithmSource,
  };
}

function inferCategoryFromExtension(path: string): LargeFileCategory {
  const ext = extractExtension(path);
  return CATEGORY_MAP[ext] ?? 'unknown';
}

function extractExtension(path: string): string {
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function matchesLargeExtension(path: string): boolean {
  const ext = extractExtension(path);
  return LARGE_EXTENSIONS.includes(ext);
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function joinPath(base: string, relative: string): string {
  return ensureTrailingSlash(base) + relative.replace(/^\/+/, '');
}

async function safeReadDir(path: string): Promise<string[]> {
  try {
    return await FileSystem.readDirectoryAsync(ensureTrailingSlash(path));
  } catch {
    return [];
  }
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

const LargeFileScannerRoutePlaceholder: React.FC = () => null;

export default LargeFileScannerRoutePlaceholder;

