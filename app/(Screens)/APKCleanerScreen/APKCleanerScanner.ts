import RNFS from "react-native-fs";
import { createExtensionFilter, fastScan } from '../../../utils/fastScanner';

export interface APKFileInfo {
  path: string;
  size: number;
  modifiedDate: number;
  ageDays: number;
  packageName?: string;
}

const APK_EXTENSIONS = ['.apk', '.apks', '.xapk'];

const buildRootDirectories = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  const directories = [
    RNFS.ExternalStorageDirectoryPath,
    RNFS.DownloadDirectoryPath,
    RNFS.ExternalDirectoryPath,
    RNFS.DocumentDirectoryPath,
  ];

  // Add WhatsApp Documents directories if base path is available
  if (base) {
    // Android 11+ (scoped storage) paths
    directories.push(`${base}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents`);
    directories.push(`${base}/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/WhatsApp Documents`);
    // Legacy path (Android 10 and below or devices with broad storage access)
    directories.push(`${base}/WhatsApp/Media/WhatsApp Documents`);
  }

  return directories.filter(Boolean) as string[];
};

export const scanAPKFiles = async (): Promise<APKFileInfo[]> => {
  const startedAt = Date.now();
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const rootPaths = buildRootDirectories();
  const apkFilter = createExtensionFilter(APK_EXTENSIONS);
  const seenPaths = new Set<string>();

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths,
    fileFilter: apkFilter,
    maxConcurrentDirs: 10,
    batchSize: 100,
  });

  const results: APKFileInfo[] = [];
  for (const entry of entries) {
    // Deduplicate by path to avoid duplicate entries
    if (seenPaths.has(entry.path)) {
      continue;
    }
    seenPaths.add(entry.path);

    const modifiedMs = entry.mtime ? entry.mtime.getTime() : now;
    const ageMs = now - modifiedMs;
    results.push({
      path: entry.path,
      size: entry.size,
      modifiedDate: modifiedMs,
      ageDays: Math.floor(ageMs / MS_PER_DAY),
    });
  }

  const finishedAt = Date.now();
  console.log(
    `[APKScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  return results.sort((a, b) => b.size - a.size);
};

export const deleteAPKFiles = async (files: APKFileInfo[]): Promise<void> => {
  await Promise.allSettled(
    files.map(async (file) => {
      try {
        await RNFS.unlink(file.path);
      } catch (error) {
        console.warn(`Failed to delete ${file.path}:`, error);
        throw error;
      }
    })
  );
};

export default scanAPKFiles;

