import RNFS from "react-native-fs";
import { fastScan, createDateFilter } from '../../../utils/fastScanner';

export interface OldFileInfo {
  path: string;
  size: number;
  modifiedDate: number;
  ageDays: number;
}

const DEFAULT_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROOT_DIRECTORIES = [
  RNFS.ExternalStorageDirectoryPath,
  RNFS.DownloadDirectoryPath,
  RNFS.ExternalDirectoryPath,
  RNFS.DocumentDirectoryPath,
].filter(Boolean) as string[];

export const scanOldFiles = async (thresholdDays = DEFAULT_THRESHOLD_DAYS): Promise<OldFileInfo[]> => {
  const startedAt = Date.now();
  const thresholdMs = thresholdDays * MS_PER_DAY;
  const now = Date.now();
  const dateFilter = createDateFilter(thresholdMs);

  const entries = await fastScan<RNFS.ReadDirItem>({
    rootPaths: ROOT_DIRECTORIES,
    fileFilter: dateFilter,
    maxConcurrentDirs: 10,
    batchSize: 100,
  });

  const results: OldFileInfo[] = entries.map((entry) => {
    const modifiedMs = entry.mtime ? entry.mtime.getTime() : now;
    const ageMs = now - modifiedMs;
    return {
      path: entry.path,
      size: entry.size,
      modifiedDate: modifiedMs,
      ageDays: Math.floor(ageMs / MS_PER_DAY),
    };
  });

  const finishedAt = Date.now();
  console.log(
    `[OldFilesScan] files=${results.length} durationMs=${finishedAt - startedAt}`,
  );

  return results.sort((a, b) => b.ageDays - a.ageDays);
};

export const deleteOldFiles = async (files: OldFileInfo[]): Promise<void> => {
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

export default scanOldFiles;




