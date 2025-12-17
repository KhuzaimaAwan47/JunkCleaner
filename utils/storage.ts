import RNFS from 'react-native-fs';

export interface StorageInfo {
  total: number; // Total storage in GB
  free: number; // Free storage in GB
  used: number; // Used storage in GB
}

export interface StorageCategoryBreakdown {
  Images: number;
  Videos: number;
  Audio: number;
  Documents: number;
  Apps: number;
  Archives: number;
  System: number;
  Other: number;
}

export interface DetailedStorageInfo extends StorageInfo {
  breakdown: StorageCategoryBreakdown;
}

const BYTES_TO_GB = 1024 * 1024 * 1024;
const BATCH_SIZE = 24;

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

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.raw', '.cr2', '.nef', '.dng', '.heic', '.heif'];
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts', '.mpg', '.mpeg'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.txt', '.rtf'];
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.obb'];
const APK_EXTENSIONS = ['.apk', '.apks', '.xapk'];

const categorizeFile = (path: string): keyof StorageCategoryBreakdown => {
  const lower = path.toLowerCase();
  
  // Check for APK files first
  for (const ext of APK_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Apps';
  }
  
  // Check for images
  for (const ext of IMAGE_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Images';
  }
  
  // Check for videos
  for (const ext of VIDEO_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Videos';
  }
  
  // Check for audio
  for (const ext of AUDIO_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Audio';
  }
  
  // Check for documents
  for (const ext of DOCUMENT_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Documents';
  }
  
  // Check for archives
  for (const ext of ARCHIVE_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'Archives';
  }
  
  // Check for system directories
  if (lower.includes('/android/data') || lower.includes('/android/obb') || lower.includes('/system')) {
    return 'System';
  }
  
  return 'Other';
};

const shouldSkipPath = (path: string): boolean => SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));

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

/**
 * Get real device storage information
 * Returns total, free, and used storage in GB
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const fsInfo = await RNFS.getFSInfo();
    
    // Convert bytes to GB (1 GB = 1024^3 bytes)
    const total = (fsInfo.totalSpace || 0) / BYTES_TO_GB;
    const free = (fsInfo.freeSpace || 0) / BYTES_TO_GB;
    const used = total - free;
    
    return {
      total: Math.round(total * 10) / 10, // Round to 1 decimal
      free: Math.round(free * 10) / 10,
      used: Math.round(used * 10) / 10,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    // Return default values if storage info cannot be retrieved
    return {
      total: 0,
      free: 0,
      used: 0,
    };
  }
}

/**
 * Get detailed storage information with category breakdown
 * Scans common directories to calculate storage usage by file type
 */
export async function getDetailedStorageInfo(): Promise<DetailedStorageInfo> {
  const basicInfo = await getStorageInfo();
  
  const breakdown: StorageCategoryBreakdown = {
    Images: 0,
    Videos: 0,
    Audio: 0,
    Documents: 0,
    Apps: 0,
    Archives: 0,
    System: 0,
    Other: 0,
  };
  
  try {
    const queue = [...new Set(ROOT_DIRECTORIES)];
    const visited = new Set<string>();
    let processed = 0;
    const maxDirectories = 500; // Limit scanning to avoid performance issues
    
    while (queue.length > 0 && processed < maxDirectories) {
      const currentDir = queue.shift();
      if (!currentDir || visited.has(currentDir) || shouldSkipPath(currentDir)) {
        continue;
      }
      visited.add(currentDir);
      
      const entries = await readDirSafe(currentDir);
      processed += 1;
      
      const batches = chunkArray(entries, BATCH_SIZE);
      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(async (entry) => {
            if (shouldSkipPath(entry.path)) {
              return;
            }
            
            if (entry.isFile()) {
              const category = categorizeFile(entry.path);
              const sizeGB = (entry.size || 0) / BYTES_TO_GB;
              breakdown[category] += sizeGB;
              return;
            }
            
            if (entry.isDirectory() && !visited.has(entry.path)) {
              queue.push(entry.path);
            }
          })
        );
      }
    }
    
    // Round each category to 2 decimal places
    Object.keys(breakdown).forEach((key) => {
      const category = key as keyof StorageCategoryBreakdown;
      breakdown[category] = Math.round(breakdown[category] * 100) / 100;
    });
  } catch (error) {
    console.error('Failed to calculate storage breakdown:', error);
    // Return breakdown with zeros if calculation fails
  }
  
  return {
    ...basicInfo,
    breakdown,
  };
}

