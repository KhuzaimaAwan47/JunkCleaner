import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

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
  permissions: 0.1,
  media: 0,
  directories: 0.8,
  extensions: 0,
  finalizing: 0.1,
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

const DEFAULT_THRESHOLD = 10 * 1024 * 1024; // 10 MB
const BATCH_SIZE = 24;
const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const ROOT_DIRECTORIES = [
  RNFS.ExternalStorageDirectoryPath,
  RNFS.DownloadDirectoryPath,
  RNFS.ExternalDirectoryPath,
  RNFS.DocumentDirectoryPath,
].filter(Boolean) as string[];

const SKIP_PATH_PATTERNS = [
  /\/Android(\/|$)/i,
  /\/DCIM\/\.thumbnails(\/|$)/i,
  /\/WhatsApp\/\.Shared(\/|$)/i,
  /\/\.Trash(\/|$)/i,
  /\/\.RecycleBin(\/|$)/i,
];

export const scanLargeFiles = async (
  threshold: number = DEFAULT_THRESHOLD,
  onProgress?: (snapshot: ScanProgressSnapshot) => void,
): Promise<LargeFileResult[]> => {
  const startedAt = Date.now();
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

  emit('directories', 0, 'initializing storage sweep');
  const files = await scanFileSystem(threshold, (progress, detail) => emit('directories', progress, detail));
  emit('directories', 1, 'file system traversal complete');

  emit('finalizing', 1, 'compiling results');
  const results = dedupeResults(files).sort((a, b) => b.size - a.size);
  console.log(
    `[LargeFileScan] files=${results.length} threshold=${threshold} durationMs=${Date.now() - startedAt}`,
  );
  return results;
};

const scanFileSystem = async (
  threshold: number,
  reportProgress?: (progress: number, detail?: string) => void,
): Promise<LargeFileResult[]> => {
  const results: LargeFileResult[] = [];
  const queue = [...new Set(ROOT_DIRECTORIES)];
  const visited = new Set<string>();
  let processed = 0;

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir || visited.has(currentDir) || shouldSkipPath(currentDir)) {
      continue;
    }
    visited.add(currentDir);

    const entries = await readDirSafe(currentDir);
    processed += 1;
    const detail = currentDir.split('/').pop() ?? currentDir;
    const total = processed + queue.length || 1;
    reportProgress?.(Math.min(processed / total, 0.99), detail);

    const batches = chunkArray(entries, BATCH_SIZE);
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (entry) => {
          if (shouldSkipPath(entry.path)) {
            return;
          }

          if (entry.isFile() && entry.size >= threshold) {
            results.push(createResult(entry.path, entry.size, entry.mtime ? entry.mtime.getTime() / 1000 : null));
            return;
          }

          if (entry.isDirectory()) {
            queue.push(entry.path);
          }
        }),
      );
    }
  }

  return results;
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const readDirSafe = async (directory: string): Promise<RNFS.ReadDirItem[]> => {
  try {
    return await RNFS.readDir(directory);
  } catch {
    return [];
  }
};

const shouldSkipPath = (path: string): boolean => SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));

const dedupeResults = (items: LargeFileResult[]): LargeFileResult[] => {
  const seen = new Map<string, LargeFileResult>();
  for (const item of items) {
    const existing = seen.get(item.path);
    if (!existing || existing.size < item.size) {
      seen.set(item.path, item);
    }
  }
  return Array.from(seen.values());
};

// Enhanced category detection with path-based and extension-based categorization
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts', '.mpg', '.mpeg'];
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.obb', '.apk', '.apks', '.xapk'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.raw', '.cr2', '.nef', '.dng'];
const DATABASE_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.db-shm', '.db-wal'];

const inferCategory = (path: string): string => {
  const lower = path.toLowerCase();
  
  // Path-based categorization (more reliable)
  if (lower.includes('/download') || lower.includes('/downloads')) {
    // Check extension for downloads
    for (const ext of VIDEO_EXTENSIONS) {
      if (lower.endsWith(ext)) return 'video';
    }
    for (const ext of ARCHIVE_EXTENSIONS) {
      if (lower.endsWith(ext)) return 'archive';
    }
    for (const ext of DOCUMENT_EXTENSIONS) {
      if (lower.endsWith(ext)) return 'document';
    }
    return 'download';
  }
  
  if (lower.includes('/whatsapp') || lower.includes('/whatsapp business')) {
    if (lower.includes('/video') || lower.includes('/video')) return 'whatsapp-video';
    if (lower.includes('/image') || lower.includes('/images')) return 'whatsapp-image';
    if (lower.includes('/audio') || lower.includes('/voice')) return 'whatsapp-audio';
    if (lower.includes('/document') || lower.includes('/documents')) return 'whatsapp-document';
    return 'whatsapp';
  }
  
  if (lower.includes('/dcim') || lower.includes('/camera') || lower.includes('/pictures')) {
    for (const ext of VIDEO_EXTENSIONS) {
      if (lower.endsWith(ext)) return 'video';
    }
    for (const ext of IMAGE_EXTENSIONS) {
      if (lower.endsWith(ext)) return 'image';
    }
    return 'media';
  }
  
  if (lower.includes('/android/data') || lower.includes('/android/obb')) {
    if (lower.endsWith('.obb')) return 'game-data';
    return 'app-data';
  }
  
  if (lower.includes('/music') || lower.includes('/audio')) {
    return 'audio';
  }
  
  // Extension-based categorization
  for (const ext of VIDEO_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'video';
  }
  
  for (const ext of ARCHIVE_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'archive';
  }
  
  for (const ext of AUDIO_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'audio';
  }
  
  for (const ext of DOCUMENT_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'document';
  }
  
  for (const ext of IMAGE_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'image';
  }
  
  for (const ext of DATABASE_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'database';
  }
  
  return 'unknown';
};

const createResult = (path: string, size: number, modified: number | null): LargeFileResult => ({
  path,
  size,
  modified,
  category: inferCategory(path),
  source: 'recursive',
});

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

export default function LargeFileScannerPlaceholder() {
  return null;
}