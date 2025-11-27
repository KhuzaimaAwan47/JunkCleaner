import RNFS from "react-native-fs";

export interface OldFileInfo {
  path: string;
  size: number;
  modifiedDate: number;
  ageDays: number;
}

const DEFAULT_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
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

const shouldSkipPath = (path: string) => SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));

export const scanOldFiles = async (thresholdDays = DEFAULT_THRESHOLD_DAYS): Promise<OldFileInfo[]> => {
  const thresholdMs = thresholdDays * MS_PER_DAY;
  const now = Date.now();
  const results: OldFileInfo[] = [];
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

          if (entry.isFile()) {
            const modifiedMs = entry.mtime ? entry.mtime.getTime() : now;
            const ageMs = now - modifiedMs;
            if (ageMs >= thresholdMs) {
              results.push({
                path: entry.path,
                size: entry.size,
                modifiedDate: modifiedMs,
                ageDays: Math.floor(ageMs / MS_PER_DAY),
              });
            }
            return;
          }

          if (entry.isDirectory()) {
            queue.push(entry.path);
          }
        })
      );
    }
  }

  return results.sort((a, b) => b.ageDays - a.ageDays);
};

export default scanOldFiles;



