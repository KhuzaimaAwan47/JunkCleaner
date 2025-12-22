import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { createExtensionFilter, fastScan, type ScanProgress } from '../../../utils/fastScanner';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

const VIDEO_EXTENSIONS = [
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.3gp', '.m4v',
  '.mpg', '.mpeg', '.ts', '.m2ts', '.vob', '.asf', '.rm', '.rmvb', '.divx',
  '.xvid', '.mp4v', '.m4p', '.m4b', '.f4v', '.f4p', '.f4a', '.f4b',
];

const buildVideoRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/DCIM`,
    `${base}/Movies`,
    `${base}/Videos`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Video`,
    `${base}/WhatsApp/Media/WhatsApp Images`,
    `${base}/Android/media`,
    `${base}/Pictures`,
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
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const scanVideos = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildVideoRootPaths();
  const videoFilter = createExtensionFilter(VIDEO_EXTENSIONS);

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    fileFilter: videoFilter,
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
      category: 'Videos',
    };
  });

  const finishedAt = Date.now();
  console.log(
    `[VideosScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function VideosScannerRoute(): null {
  return null;
}

