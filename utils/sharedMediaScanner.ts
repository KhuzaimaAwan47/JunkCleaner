import RNFS from 'react-native-fs';
import { fastScan, type ScanProgress } from './fastScanner';
import type { CategoryFile } from './fileCategoryCalculator';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.3gp', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts', '.vob', '.asf', '.rm', '.rmvb', '.divx', '.xvid', '.mp4v', '.m4p', '.m4b', '.f4v', '.f4p', '.f4a', '.f4b'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.psd', '.ai', '.eps', '.pcx', '.tga', '.bpg'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.opus', '.amr', '.3gp', '.aa', '.aax', '.act', '.aiff', '.alac', '.ape', '.au', '.awb', '.dct', '.dss', '.dvf', '.flv', '.gsm', '.iklax', '.ivs', '.m4b', '.m4p', '.mmf', '.mpc', '.msv', '.nmf', '.ogg', '.oga', '.mogg', '.ra', '.rm', '.raw', '.rf64', '.sln', '.tta', '.voc', '.vox', '.wv', '.wav', '.webm'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.csv', '.pages', '.numbers', '.key', '.epub', '.mobi', '.azw', '.azw3', '.fb2', '.djvu', '.xps', '.oxps', '.ps', '.ai', '.indd', '.pub', '.vsd', '.vsdx', '.vdx', '.one', '.msg', '.eml', '.html', '.htm', '.xml', '.json', '.yaml', '.yml', '.log', '.md', '.tex'];

const MIN_IMAGE_SIZE_BYTES = 10 * 1024;

const buildMediaRootPaths = (): string[] => {
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

export interface MediaScanResults {
  videos: CategoryFile[];
  images: CategoryFile[];
  audios: CategoryFile[];
  documents: CategoryFile[];
}

/**
 * Scan all media types in a single filesystem pass for maximum efficiency
 */
export async function scanAllMedia(
  onProgress?: (type: 'videos' | 'images' | 'audios' | 'documents', progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<MediaScanResults> {
  const startedAt = Date.now();
  const rootPaths = buildMediaRootPaths();
  
  const videos: CategoryFile[] = [];
  const images: CategoryFile[] = [];
  const audios: CategoryFile[] = [];
  const documents: CategoryFile[] = [];

  // Single filesystem walk, categorize files as we go
  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    maxConcurrentDirs: 10,
    batchSize: 100,
    onProgress: (progress) => {
      // Emit progress for the current type being processed
      // In practice, we process all types together
      onProgress?.('images', progress);
    },
    cancelRef,
    fileFilter: (entry) => {
      if (!entry.isFile()) return false;
      const lower = entry.name.toLowerCase();
      return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext)) ||
             IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext)) ||
             AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext)) ||
             DOCUMENT_EXTENSIONS.some(ext => lower.endsWith(ext));
    },
  });

  // Categorize files
  for (const entry of entries) {
    if (cancelRef?.current) break;
    
    const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
    const modifiedDate = entry.mtime ? entry.mtime.getTime() : Date.now();
    const lower = entry.name.toLowerCase();

    const file: CategoryFile = {
      path: entry.path,
      size,
      modified: modifiedDate,
      category: '',
    };

    // Categorize by extension (check in order of specificity)
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

  // Sort each category by size
  videos.sort((a, b) => b.size - a.size);
  images.sort((a, b) => b.size - a.size);
  audios.sort((a, b) => b.size - a.size);
  documents.sort((a, b) => b.size - a.size);

  const finishedAt = Date.now();
  console.log(
    `[SharedMediaScan] videos=${videos.length} images=${images.length} audios=${audios.length} documents=${documents.length} durationMs=${finishedAt - startedAt}`,
  );

  return { videos, images, audios, documents };
}

