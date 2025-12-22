import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { createExtensionFilter, createSizeFilter, fastScan, type ScanProgress } from '../../../utils/fastScanner';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

const MIN_IMAGE_SIZE_BYTES = 10 * 1024; // Skip tiny thumbnails
const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
  '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf',
  '.sr2', '.arw', '.dng', '.psd', '.ai', '.eps', '.pcx', '.tga', '.bpg',
];

const buildImageRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/DCIM`,
    `${base}/Pictures`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Images`,
    `${base}/WhatsApp/Media/WhatsApp Video`,
    `${base}/Android/media`,
  ].filter(Boolean);
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
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const scanImages = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildImageRootPaths();
  const imageFilter = createExtensionFilter(IMAGE_EXTENSIONS);
  const sizeFilter = createSizeFilter(MIN_IMAGE_SIZE_BYTES);
  
  // Combine filters: must be image extension AND meet size requirement
  const combinedFilter = (entry: RNFS.ReadDirItem) => {
    return imageFilter(entry) && sizeFilter(entry);
  };

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    fileFilter: combinedFilter,
    maxConcurrentDirs: 10,
    batchSize: 100,
    onProgress,
    cancelRef,
  });

  const results: CategoryFile[] = entries.map((entry) => {
    const size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;
    const modifiedDate = entry.mtime ? entry.mtime.getTime() : Date.now();

    return {
      path: entry.path,
      size,
      modified: modifiedDate,
      category: 'Images',
    };
  });

  const finishedAt = Date.now();
  console.log(
    `[ImagesScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function ImagesScannerRoute(): null {
  return null;
}

