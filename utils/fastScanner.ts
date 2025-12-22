import RNFS from 'react-native-fs';

export interface ScanProgress {
  total: number;
  current: number;
  scannedFiles?: number;
  currentFile?: string;
  stage?: string;
}

export interface FastScanOptions<T = RNFS.ReadDirItem> {
  rootPaths: string[];
  fileFilter?: (entry: RNFS.ReadDirItem) => boolean;
  skipPatterns?: RegExp[];
  maxConcurrentDirs?: number; // 4-8 based on device
  batchSize?: number; // 50-100
  onProgress?: (progress: ScanProgress) => void;
  cancelRef?: { current: boolean };
  transform?: (entry: RNFS.ReadDirItem) => T | null;
}

const DEFAULT_BATCH_SIZE = 150;
const DEFAULT_MAX_CONCURRENT = 15;
const PROGRESS_THROTTLE_MS = 200;

// Default skip patterns for system directories
const DEFAULT_SKIP_PATTERNS = [
  /\/\.thumbnails(\/|$)/i,
  /\/\.cache(\/|$)/i,
  /\/\.trash(\/|$)/i,
  /\/proc(\/|$)/i,
  /\/system(\/|$)/i,
  /\/dev(\/|$)/i,
  /\/Android\/data(\/|$)/i,
  /\/Android\/obb(\/|$)/i,
];

const shouldSkipPath = (path: string, patterns: RegExp[]): boolean => {
  return patterns.some((pattern) => pattern.test(path));
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

/**
 * Fast parallel directory scanner with configurable concurrency and batching
 */
export async function fastScan<T = RNFS.ReadDirItem>(
  options: FastScanOptions<T>,
): Promise<T[]> {
  const {
    rootPaths,
    fileFilter,
    skipPatterns = DEFAULT_SKIP_PATTERNS,
    maxConcurrentDirs = DEFAULT_MAX_CONCURRENT,
    batchSize = DEFAULT_BATCH_SIZE,
    onProgress,
    cancelRef,
    transform,
  } = options;

  const emitProgress = createThrottledProgress(onProgress);
  const results: T[] = [];
  const queue: string[] = [...rootPaths];
  const visited = new Set<string>();
  let processed = 0;
  let scannedFiles = 0;

  emitProgress({ total: 0, current: 0, stage: 'scanning', currentFile: 'initializing' });

  // Process directories in parallel with worker pool
  const processDirectory = async (dir: string): Promise<void> => {
    if (cancelRef?.current || visited.has(dir) || shouldSkipPath(dir, skipPatterns)) {
      return;
    }

    visited.add(dir);

    const entries = await safeReadDir(dir);
    processed += 1;

    // Process entries in batches
    for (let i = 0; i < entries.length; i += batchSize) {
      if (cancelRef?.current) {
        break;
      }

      const batch = entries.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (entry) => {
          if (cancelRef?.current) {
            return;
          }

          // Early skip pattern check
          if (shouldSkipPath(entry.path, skipPatterns)) {
            return;
          }

          if (entry.isDirectory()) {
            // Add to queue if not visited
            if (!visited.has(entry.path)) {
              queue.push(entry.path);
            }
            return;
          }

          if (entry.isFile()) {
            // Apply file filter if provided
            if (fileFilter && !fileFilter(entry)) {
              return;
            }

            // Transform or use entry directly
            const transformed = transform ? transform(entry) : (entry as T);
            if (transformed !== null && transformed !== undefined) {
              results.push(transformed);
              scannedFiles += 1;
            }
          }
        }),
      );
    }

    // Emit progress
    const total = processed + queue.length || 1;
    emitProgress({
      total,
      current: processed,
      scannedFiles,
      stage: 'scanning',
      currentFile: dir.split('/').pop() || dir,
    });
  };

  // Worker pool: process multiple directories concurrently
  const workers: Set<Promise<void>> = new Set();
  let activeWorkers = 0;

  while (queue.length > 0 || activeWorkers > 0) {
    if (cancelRef?.current) {
      break;
    }

    // Start new workers up to max concurrent
    while (queue.length > 0 && activeWorkers < maxConcurrentDirs) {
      const dir = queue.shift();
      if (!dir) {
        break;
      }

      activeWorkers += 1;
      const worker = processDirectory(dir).finally(() => {
        activeWorkers -= 1;
        workers.delete(worker);
      });
      workers.add(worker);
    }

    // Wait for at least one worker to complete before starting more
    if (activeWorkers >= maxConcurrentDirs && queue.length > 0 && workers.size > 0) {
      await Promise.race(Array.from(workers));
    }

    // Small delay to prevent tight loop when queue is empty but workers are active
    if (queue.length === 0 && activeWorkers > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  // Wait for all remaining workers
  await Promise.allSettled(Array.from(workers));

  emitProgress({
    total: processed,
    current: processed,
    scannedFiles,
    stage: 'complete',
  });

  return results;
}

/**
 * Helper to create extension-based file filter
 */
export function createExtensionFilter(extensions: string[]): (entry: RNFS.ReadDirItem) => boolean {
  const lowerExtensions = extensions.map((ext) => ext.toLowerCase());
  return (entry: RNFS.ReadDirItem) => {
    if (!entry.isFile()) {
      return false;
    }
    const lower = entry.name.toLowerCase();
    return lowerExtensions.some((ext) => lower.endsWith(ext));
  };
}

/**
 * Helper to create size-based file filter
 */
export function createSizeFilter(minSize: number): (entry: RNFS.ReadDirItem) => boolean {
  return (entry: RNFS.ReadDirItem) => {
    if (!entry.isFile()) {
      return false;
    }
    const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
    return size >= minSize;
  };
}

/**
 * Helper to create date-based file filter
 */
export function createDateFilter(maxAgeMs: number): (entry: RNFS.ReadDirItem) => boolean {
  const now = Date.now();
  return (entry: RNFS.ReadDirItem) => {
    if (!entry.isFile()) {
      return false;
    }
    const modifiedDate = entry.mtime ? entry.mtime.getTime() : now;
    const ageMs = now - modifiedDate;
    return ageMs >= maxAgeMs;
  };
}

