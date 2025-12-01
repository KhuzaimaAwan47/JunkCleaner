import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

export type JunkFileType = 'cache' | 'temp' | 'log' | 'apk' | 'large' | 'other';

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

const JUNK_EXTENSIONS = ['.tmp', '.log', '.cache', '.bak', '.old', '.temp', '.download'];
const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.flac'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];

const buildJunkRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];
  
  return [
    `${base}/Android/data`,
    `${base}/Android/media`,
    `${base}/Android/obb`,
    `${base}/Download`,
    `${base}/cache`,
    `${base}/tmp`,
    `${base}/WhatsApp/.Statuses`,
    `${base}/WhatsApp/Media/.Statuses`,
    `${base}/Telegram/.cache`,
    `${base}/DCIM/.thumbnails`,
    `${base}/Pictures/.thumbnails`,
  ].filter(Boolean);
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
  
  // Files starting with ~
  if (lowerName.startsWith('~')) {
    return true;
  }
  
  // Files ending with .0
  if (lowerName.endsWith('.0')) {
    return true;
  }
  
  // Check extensions
  const dotIndex = lowerName.lastIndexOf('.');
  if (dotIndex >= 0) {
    const ext = lowerName.substring(dotIndex);
    if (JUNK_EXTENSIONS.includes(ext)) {
      return true;
    }
    if (ext === '.apk') {
      return true;
    }
  }
  
  // Check path for cache indicators
  if (lowerPath.includes('/cache') || lowerPath.includes('/temp') || lowerPath.includes('/tmp')) {
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
  
  if (lowerName.endsWith('.apk')) {
    return 'apk';
  }
  
  if (lowerName.endsWith('.log') || lowerName.endsWith('.trace')) {
    return 'log';
  }
  
  if (lowerName.endsWith('.tmp') || lowerName.endsWith('.temp') || lowerName.startsWith('~')) {
    return 'temp';
  }
  
  if (lowerPath.includes('/cache') || lowerName.endsWith('.cache')) {
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

  onProgress?.(0, 'initializing scan');

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
    onProgress?.(progress, detail);

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

          // Check if it's junk
          if (!isJunkFile(entry.name, entry.path)) {
            // Also check if it's old or in cache directory
            const isOld = Date.now() - modified > OLD_FILE_MS;
            const isInCache = entry.path.toLowerCase().includes('/cache');
            if (!isOld && !isInCache) {
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

  onProgress?.(1, 'scan complete');

  const totalSize = results.reduce((sum, item) => sum + item.size, 0);
  const sortedResults = results.sort((a, b) => b.size - a.size);

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

