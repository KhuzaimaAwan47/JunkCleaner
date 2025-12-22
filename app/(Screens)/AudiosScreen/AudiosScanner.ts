import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { createExtensionFilter, fastScan, type ScanProgress } from '../../../utils/fastScanner';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';

const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.opus', '.amr',
  '.3gp', '.aa', '.aax', '.act', '.aiff', '.alac', '.ape', '.au', '.awb',
  '.dct', '.dss', '.dvf', '.flv', '.gsm', '.iklax', '.ivs', '.m4b', '.m4p',
  '.mmf', '.mpc', '.msv', '.nmf', '.ogg', '.oga', '.mogg', '.ra', '.rm',
  '.raw', '.rf64', '.sln', '.tta', '.voc', '.vox', '.wv', '.wav', '.webm',
];

const buildAudioRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/Music`,
    `${base}/Audio`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Audio`,
    `${base}/WhatsApp/Media/WhatsApp Voice Notes`,
    `${base}/Android/media`,
    `${base}/DCIM`,
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
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export const scanAudios = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildAudioRootPaths();
  const audioFilter = createExtensionFilter(AUDIO_EXTENSIONS);

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    fileFilter: audioFilter,
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
      category: 'Audio',
    };
  });

  const finishedAt = Date.now();
  console.log(
    `[AudiosScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function AudiosScannerRoute(): null {
  return null;
}

