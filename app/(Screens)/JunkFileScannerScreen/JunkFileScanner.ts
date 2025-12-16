import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

export type JunkFileType = 'cache' | 'temp' | 'log' | 'large' | 'other';

export interface JunkFileItem {
  path: string;
  size: number;
  modified: number;
  type: JunkFileType;
}

export interface JunkFileScanResult {
  totalFiles: number;
  totalSize: number;
  items: JunkFileItem[];
}

const BATCH_SIZE = 32;
const MIN_FILE_SIZE = 1024; // 1KB
const LARGE_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const OLD_FILE_DAYS = 45;
const OLD_FILE_MS = OLD_FILE_DAYS * 24 * 60 * 60 * 1000;

// Enhanced junk file patterns from both repos
const JUNK_EXTENSIONS = [
  '.tmp', '.log', '.cache', '.bak', '.old', '.temp', '.download',
  '.trace', '.crash', '.error', '.dump', '.lock', '.pid', '.swp',
  '.part', '.partial', '.crdownload', '.!qB', '.download', '.downloads',
  '.nomedia', '.thumbdata', '.thumbdata3', '.thumbdata4', '.thumbdata5',
  '.thumbdata6', '.thumbdata7', '.thumbdata8', '.thumbdata9',
];
const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.flac'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
const PROGRESS_THROTTLE_MS = 120;

// Log rotation patterns (.log.1, .log.2, etc.)
const LOG_ROTATION_PATTERN = /\.log\.\d+$/i;

// App-specific cache directory patterns
const APP_CACHE_PATTERNS = [
  /\/cache$/i,
  /\/\.cache$/i,
  /\/tmp$/i,
  /\/temp$/i,
  /\/logs$/i,
  /\/log$/i,
  /\/\.thumbnails$/i,
  /\/thumbnails$/i,
  /\/\.thumb$/i,
];

const buildJunkRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];
  
  return [
    `${base}/Android/data`,
    `${base}/Android/media`,
    `${base}/Android/obb`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/cache`,
    `${base}/tmp`,
    `${base}/temp`,
    `${base}/WhatsApp/.Statuses`,
    `${base}/WhatsApp/Media/.Statuses`,
    `${base}/Telegram/.cache`,
    `${base}/DCIM/.thumbnails`,
    `${base}/Pictures/.thumbnails`,
    RNFS.CachesDirectoryPath || null,
  ].filter(Boolean) as string[];
};

const SKIP_PATH_PATTERNS = [
  /\/proc(\/|$)/i,
  /\/system(\/|$)/i,
  /\/dev(\/|$)/i,
  /\/DCIM\/[^/]+$/i,
  /\/Movies(\/|$)/i,
  /\/Music(\/|$)/i,
  /\/Pictures\/[^/]+$/i,
];

const shouldSkipPath = (path: string): boolean => {
  const lower = path.toLowerCase();
  return SKIP_PATH_PATTERNS.some((pattern) => pattern.test(lower));
};

const isMediaOrDocument = (path: string): boolean => {
  const lower = path.toLowerCase();
  return [...MEDIA_EXTENSIONS, ...DOCUMENT_EXTENSIONS].some((ext) => lower.endsWith(ext));
};

const isJunkFile = (name: string, path: string): boolean => {
  const lowerName = name.toLowerCase();
  const lowerPath = path.toLowerCase();
  
  // Files starting with ~ (temp files)
  if (lowerName.startsWith('~') || lowerName.startsWith('.')) {
    return true;
  }
  
  // Files ending with .0, .part, .partial (incomplete downloads)
  if (lowerName.endsWith('.0') || lowerName.endsWith('.part') || lowerName.endsWith('.partial')) {
    return true;
  }
  
  // Log rotation files (.log.1, .log.2, etc.)
  if (LOG_ROTATION_PATTERN.test(lowerName)) {
    return true;
  }
  
  // Check extensions
  const dotIndex = lowerName.lastIndexOf('.');
  if (dotIndex >= 0) {
    const ext = lowerName.substring(dotIndex);
    if (JUNK_EXTENSIONS.includes(ext)) {
      return true;
    }
  }
  
  // Check path for cache/temp indicators (enhanced patterns)
  if (APP_CACHE_PATTERNS.some(pattern => pattern.test(lowerPath))) {
    return true;
  }
  
  // Orphaned .nomedia files (should be in directories, not standalone)
  if (lowerName === '.nomedia' && !lowerPath.includes('/android/data/')) {
    return true;
  }
  
  // Temporary download files
  if (lowerPath.includes('/download') && (
    lowerName.includes('.tmp') || 
    lowerName.includes('.temp') ||
    lowerName.endsWith('.crdownload') ||
    lowerName.endsWith('.!qB')
  )) {
    return true;
  }
  
  return false;
};

const detectJunkType = (name: string, path: string, size: number): JunkFileType => {
  const lowerName = name.toLowerCase();
  const lowerPath = path.toLowerCase();
  
  if (size > LARGE_FILE_SIZE) {
    return 'large';
  }
  
  // Log files (including rotated logs)
  if (lowerName.endsWith('.log') || lowerName.endsWith('.trace') || 
      lowerName.endsWith('.crash') || lowerName.endsWith('.error') ||
      LOG_ROTATION_PATTERN.test(lowerName)) {
    return 'log';
  }
  
  // Temporary files
  if (lowerName.endsWith('.tmp') || lowerName.endsWith('.temp') || 
      lowerName.startsWith('~') || lowerName.endsWith('.part') ||
      lowerName.endsWith('.partial') || lowerName.endsWith('.crdownload') ||
      lowerName.endsWith('.!qB')) {
    return 'temp';
  }
  
  // Cache files (including app-specific cache directories)
  if (lowerPath.includes('/cache') || lowerName.endsWith('.cache') ||
      APP_CACHE_PATTERNS.some(pattern => pattern.test(lowerPath)) ||
      lowerName.includes('thumbdata') || lowerName.includes('thumbnail')) {
    return 'cache';
  }
  
  return 'other';
};

const safeReadDir = async (directory: string): Promise<RNFS.ReadDirItem[]> => {
  try {
    return await RNFS.readDir(directory);
  } catch {
    return [];
  }
};

const ensureStatInfo = async (entry: RNFS.ReadDirItem): Promise<{ size: number; modified: number }> => {
  let size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
  let modified = entry.mtime ? entry.mtime.getTime() : Date.now();
  
  if (!size) {
    try {
      const info = await RNFS.stat(entry.path);
      size = info.size ?? size;
    } catch {
      // Use defaults
    }
  }
  
  return { size, modified };
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const createThrottledReporter = (report?: (progress: number, detail?: string) => void) => {
  let lastEmit = 0;
  return (progress: number, detail?: string) => {
    const now = Date.now();
    if (now - lastEmit >= PROGRESS_THROTTLE_MS) {
      lastEmit = now;
      report?.(progress, detail);
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
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const scanJunkFiles = async (
  onProgress?: (progress: number, detail?: string) => void,
): Promise<JunkFileScanResult> => {
  const emitProgress = createThrottledReporter(onProgress);
  const startedAt = Date.now();
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return { totalFiles: 0, totalSize: 0, items: [] };
  }

  const rootPaths = buildJunkRootPaths();
  const results: JunkFileItem[] = [];
  const queue = [...rootPaths];
  const visited = new Set<string>();
  let processed = 0;
  const totalDirs = new Set<string>(rootPaths);

  emitProgress(0, 'initializing scan');

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir || visited.has(currentDir) || shouldSkipPath(currentDir)) {
      continue;
    }
    visited.add(currentDir);

    const entries = await safeReadDir(currentDir);
    processed += 1;
    
    const detail = currentDir.split('/').pop() ?? currentDir;
    const total = processed + queue.length || 1;
    const progress = Math.min(processed / total, 0.99);
    emitProgress(progress, detail);

    const batches = chunkArray(entries, BATCH_SIZE);
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (entry) => {
          if (shouldSkipPath(entry.path)) {
            return;
          }

          if (entry.isDirectory()) {
            if (!visited.has(entry.path)) {
              queue.push(entry.path);
              totalDirs.add(entry.path);
            }
            return;
          }

          if (!entry.isFile()) {
            return;
          }

          const { size, modified } = await ensureStatInfo(entry);
          
          // Skip files < 1KB
          if (size < MIN_FILE_SIZE) {
            return;
          }

          // Skip media and documents
          if (isMediaOrDocument(entry.path)) {
            return;
          }

          // Skip APK files - they should be handled by APK remover
          if (entry.name.toLowerCase().endsWith('.apk')) {
            return;
          }

          // Check if it's junk
          if (!isJunkFile(entry.name, entry.path)) {
            // Also check if it's old or in cache/temp directory (merged from Cache & Logs scanner)
            const isOld = Date.now() - modified > OLD_FILE_MS;
            const lowerPath = entry.path.toLowerCase();
            const isInCache = APP_CACHE_PATTERNS.some(pattern => pattern.test(lowerPath)) ||
                             lowerPath.includes('/cache') || 
                             lowerPath.includes('/temp') ||
                             lowerPath.includes('/tmp') ||
                             lowerPath.includes('/logs') ||
                             lowerPath.includes('/log');
            
            // Check for cache/log extensions even if not in cache directory
            const lowerName = entry.name.toLowerCase();
            const isCacheExtension = lowerName.endsWith('.log') || 
                                    lowerName.endsWith('.trace') ||
                                    lowerName.endsWith('.tmp') ||
                                    lowerName.endsWith('.bak') ||
                                    LOG_ROTATION_PATTERN.test(lowerName);
            
            if (!isOld && !isInCache && !isCacheExtension) {
              return;
            }
          }

          const type = detectJunkType(entry.name, entry.path, size);
          results.push({
            path: entry.path,
            size,
            modified,
            type,
          });
        }),
      );
    }
  }

  emitProgress(1, 'scan complete');

  const totalSize = results.reduce((sum, item) => sum + item.size, 0);
  const sortedResults = results.sort((a, b) => b.size - a.size);
  const finishedAt = Date.now();
  console.log(
    `[JunkScan] files=${sortedResults.length} totalSize=${totalSize} durationMs=${finishedAt - startedAt}`,
  );

  return {
    totalFiles: sortedResults.length,
    totalSize,
    items: sortedResults,
  };
};

export const deleteJunkFiles = async (items: JunkFileItem[]): Promise<void> => {
  await Promise.allSettled(
    items.map(async (item) => {
      try {
        const exists = await RNFS.exists(item.path);
        if (!exists) return;
        await RNFS.unlink(item.path);
      } catch {
        // Ignore permission errors
      }
    }),
  );
};

export default { scanJunkFiles, deleteJunkFiles };

