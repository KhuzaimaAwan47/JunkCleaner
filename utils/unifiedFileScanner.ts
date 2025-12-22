import RNFS from 'react-native-fs';
import { fastScan, type ScanProgress } from './fastScanner';
import type { CategoryFile } from './fileCategoryCalculator';
import type { LargeFileResult } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import type { OldFileInfo } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.3gp', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts', '.vob', '.asf', '.rm', '.rmvb', '.divx', '.xvid', '.mp4v', '.m4p', '.m4b', '.f4v', '.f4p', '.f4a', '.f4b'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.psd', '.ai', '.eps', '.pcx', '.tga', '.bpg'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.opus', '.amr', '.3gp', '.aa', '.aax', '.act', '.aiff', '.alac', '.ape', '.au', '.awb', '.dct', '.dss', '.dvf', '.flv', '.gsm', '.iklax', '.ivs', '.m4b', '.m4p', '.mmf', '.mpc', '.msv', '.nmf', '.ogg', '.oga', '.mogg', '.ra', '.rm', '.raw', '.rf64', '.sln', '.tta', '.voc', '.vox', '.wv', '.wav', '.webm'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.csv', '.pages', '.numbers', '.key', '.epub', '.mobi', '.azw', '.azw3', '.fb2', '.djvu', '.xps', '.oxps', '.ps', '.ai', '.indd', '.pub', '.vsd', '.vsdx', '.vdx', '.one', '.msg', '.eml', '.html', '.htm', '.xml', '.json', '.yaml', '.yml', '.log', '.md', '.tex'];

const MIN_IMAGE_SIZE_BYTES = 10 * 1024;
const LARGE_FILE_THRESHOLD = 512 * 1024 * 1024; // 512 MB
const OLD_FILE_THRESHOLD_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const buildRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/DCIM`,
    `${base}/Pictures`,
    `${base}/Movies`,
    `${base}/Videos`,
    `${base}/Music`,
    `${base}/Audio`,
    `${base}/Documents`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Images`,
    `${base}/WhatsApp/Media/WhatsApp Video`,
    `${base}/WhatsApp/Media/WhatsApp Audio`,
    `${base}/WhatsApp/Media/WhatsApp Voice Notes`,
    `${base}/WhatsApp/Media/WhatsApp Documents`,
    `${base}/Android/media`,
  ].filter(Boolean);
};

export interface UnifiedScanResults {
  videos: CategoryFile[];
  images: CategoryFile[];
  audios: CategoryFile[];
  documents: CategoryFile[];
  largeFiles: LargeFileResult[];
  oldFiles: OldFileInfo[];
}

/**
 * Single filesystem walk that categorizes files for all scanners at once
 * This is MUCH faster than multiple separate scans
 */
export async function unifiedFileScan(
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<UnifiedScanResults> {
  const startedAt = Date.now();
  const rootPaths = buildRootPaths();
  
  const videos: CategoryFile[] = [];
  const images: CategoryFile[] = [];
  const audios: CategoryFile[] = [];
  const documents: CategoryFile[] = [];
  const largeFiles: LargeFileResult[] = [];
  const oldFiles: OldFileInfo[] = [];

  const now = Date.now();
  const oldFileThresholdMs = OLD_FILE_THRESHOLD_DAYS * MS_PER_DAY;

  // Single filesystem walk - categorize all files in one pass
  // No file filter - we want ALL files to check for large/old files too
  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    maxConcurrentDirs: 15,
    batchSize: 150,
    onProgress,
    cancelRef,
  });

  // Categorize files in a single pass
  for (const entry of entries) {
    if (cancelRef?.current) break;
    
    const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
    const modifiedDate = entry.mtime ? entry.mtime.getTime() : now;
    const lower = entry.name.toLowerCase();
    const ageMs = now - modifiedDate;
    const ageDays = Math.floor(ageMs / MS_PER_DAY);

    // Check for large files
    if (size >= LARGE_FILE_THRESHOLD) {
      const category = inferCategory(entry.path, lower);
      largeFiles.push({
        path: entry.path,
        size,
        modified: modifiedDate / 1000,
        category,
        source: 'recursive',
      });
    }

    // Check for old files
    if (ageMs >= oldFileThresholdMs) {
      oldFiles.push({
        path: entry.path,
        size,
        modifiedDate,
        ageDays,
      });
    }

    // Categorize by media type
    const file: CategoryFile = {
      path: entry.path,
      size,
      modified: modifiedDate,
      category: '',
    };

    if (VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      file.category = 'Videos';
      videos.push(file);
    } else if (IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      if (size > MIN_IMAGE_SIZE_BYTES) {
        file.category = 'Images';
        images.push(file);
      }
    } else if (AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      file.category = 'Audio';
      audios.push(file);
    } else if (DOCUMENT_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      // Exclude APK files
      if (!lower.endsWith('.apk') && !lower.endsWith('.apks') && !lower.endsWith('.xapk')) {
        file.category = 'Documents';
        documents.push(file);
      }
    }
  }

  // Sort each category
  videos.sort((a, b) => b.size - a.size);
  images.sort((a, b) => b.size - a.size);
  audios.sort((a, b) => b.size - a.size);
  documents.sort((a, b) => b.size - a.size);
  largeFiles.sort((a, b) => b.size - a.size);
  oldFiles.sort((a, b) => b.ageDays - a.ageDays);

  const finishedAt = Date.now();
  console.log(
    `[UnifiedScan] videos=${videos.length} images=${images.length} audios=${audios.length} documents=${documents.length} ` +
    `large=${largeFiles.length} old=${oldFiles.length} durationMs=${finishedAt - startedAt}`,
  );

  return { videos, images, audios, documents, largeFiles, oldFiles };
}

// Category inference for large files
const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts', '.mpg', '.mpeg'];
const ARCHIVE_EXT = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.obb', '.apk', '.apks', '.xapk'];
const AUDIO_EXT = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const DOC_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.raw', '.cr2', '.nef', '.dng'];
const DB_EXT = ['.db', '.sqlite', '.sqlite3', '.db-shm', '.db-wal'];

const inferCategory = (path: string, lower: string): string => {
  if (lower.includes('/download') || lower.includes('/downloads')) {
    for (const ext of VIDEO_EXT) if (lower.endsWith(ext)) return 'video';
    for (const ext of ARCHIVE_EXT) if (lower.endsWith(ext)) return 'archive';
    for (const ext of DOC_EXT) if (lower.endsWith(ext)) return 'document';
    return 'download';
  }
  if (lower.includes('/whatsapp')) {
    if (lower.includes('/video')) return 'whatsapp-video';
    if (lower.includes('/image')) return 'whatsapp-image';
    if (lower.includes('/audio')) return 'whatsapp-audio';
    if (lower.includes('/document')) return 'whatsapp-document';
    return 'whatsapp';
  }
  if (lower.includes('/dcim') || lower.includes('/camera') || lower.includes('/pictures')) {
    for (const ext of VIDEO_EXT) if (lower.endsWith(ext)) return 'video';
    for (const ext of IMAGE_EXT) if (lower.endsWith(ext)) return 'image';
    return 'media';
  }
  if (lower.includes('/android/data') || lower.includes('/android/obb')) {
    if (lower.endsWith('.obb')) return 'game-data';
    return 'app-data';
  }
  if (lower.includes('/music') || lower.includes('/audio')) return 'audio';
  
  for (const ext of VIDEO_EXT) if (lower.endsWith(ext)) return 'video';
  for (const ext of ARCHIVE_EXT) if (lower.endsWith(ext)) return 'archive';
  for (const ext of AUDIO_EXT) if (lower.endsWith(ext)) return 'audio';
  for (const ext of DOC_EXT) if (lower.endsWith(ext)) return 'document';
  for (const ext of IMAGE_EXT) if (lower.endsWith(ext)) return 'image';
  for (const ext of DB_EXT) if (lower.endsWith(ext)) return 'database';
  
  return 'unknown';
};

