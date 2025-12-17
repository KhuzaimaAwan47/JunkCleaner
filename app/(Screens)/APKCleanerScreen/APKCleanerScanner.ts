import RNFS from "react-native-fs";

export interface APKFileInfo {
  path: string;
  size: number;
  modifiedDate: number;
  ageDays: number;
  packageName?: string;
}

const APK_EXTENSIONS = ['.apk', '.apks', '.xapk'];
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

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const shouldSkipPath = (path: string): boolean => SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));

const isAPKFile = (path: string): boolean => {
  const lower = path.toLowerCase();
  return APK_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const scanAPKFiles = async (): Promise<APKFileInfo[]> => {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const results: APKFileInfo[] = [];
  const queue: string[] = [...new Set(ROOT_DIRECTORIES)];

  while (queue.length) {
    const currentDir = queue.shift();
    if (!currentDir || shouldSkipPath(currentDir)) continue;

    let dirEntries: RNFS.ReadDirItem[] = [];
    try {
      dirEntries = await RNFS.readDir(currentDir);
    } catch {
      continue;
    }

    const batches = chunkArray(dirEntries, BATCH_SIZE);
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (entry) => {
          if (shouldSkipPath(entry.path)) return;

          if (entry.isFile() && isAPKFile(entry.path)) {
            const modifiedMs = entry.mtime ? entry.mtime.getTime() : now;
            const ageMs = now - modifiedMs;
            results.push({
              path: entry.path,
              size: entry.size,
              modifiedDate: modifiedMs,
              ageDays: Math.floor(ageMs / MS_PER_DAY),
            });
            return;
          }

          if (entry.isDirectory()) {
            queue.push(entry.path);
          }
        })
      );
    }
  }

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

