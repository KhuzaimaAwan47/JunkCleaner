import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import type { CategoryFile } from '../../../utils/fileCategoryCalculator';
import { fastScan, createExtensionFilter, type ScanProgress } from '../../../utils/fastScanner';

const DOCUMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf',
  '.odt', '.ods', '.odp', '.csv', '.pages', '.numbers', '.key', '.epub',
  '.mobi', '.azw', '.azw3', '.fb2', '.djvu', '.xps', '.oxps', '.ps', '.ai',
  '.indd', '.pub', '.vsd', '.vsdx', '.vdx', '.one', '.msg', '.eml', '.html',
  '.htm', '.xml', '.json', '.yaml', '.yml', '.log', '.md', '.tex', '.tex',
];

const buildDocumentRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  return [
    base,
    `${base}/Documents`,
    `${base}/Download`,
    `${base}/Downloads`,
    `${base}/WhatsApp/Media/WhatsApp Documents`,
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

export const scanDocuments = async (
  onProgress?: (progress: ScanProgress) => void,
  cancelRef?: { current: boolean },
): Promise<CategoryFile[]> => {
  const startedAt = Date.now();
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildDocumentRootPaths();
  const documentFilter = createExtensionFilter(DOCUMENT_EXTENSIONS);
  
  // Exclude APK files (handled by APK scanner)
  const combinedFilter = (entry: RNFS.ReadDirItem) => {
    if (!documentFilter(entry)) {
      return false;
    }
    const lower = entry.name.toLowerCase();
    // Exclude APK files
    if (lower.endsWith('.apk') || lower.endsWith('.apks') || lower.endsWith('.xapk')) {
      return false;
    }
    return true;
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
      category: 'Documents',
    };
  });

  const finishedAt = Date.now();
  console.log(
    `[DocumentsScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function DocumentsScannerRoute(): null {
  return null;
}

