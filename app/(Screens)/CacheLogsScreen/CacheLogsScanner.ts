import RNFS from "react-native-fs";

export type ScanResultType = "cache" | "log";

export interface ScanResult {
  path: string;
  size: number;
  type: ScanResultType;
}

const TARGET_DIRECTORIES = [
  RNFS.ExternalStorageDirectoryPath
    ? `${RNFS.ExternalStorageDirectoryPath}/Android/data`
    : null,
  RNFS.ExternalStorageDirectoryPath
    ? `${RNFS.ExternalStorageDirectoryPath}/Android/obb`
    : null,
  RNFS.CachesDirectoryPath ?? null,
].filter(Boolean) as string[];

const EXTENSION_MAP: Record<string, ScanResultType> = {
  ".log": "log",
  ".trace": "log",
  ".tmp": "cache",
  ".bak": "cache",
};

const getMatchType = (name: string): ScanResultType | null => {
  const lower = name.toLowerCase();
  if (lower.includes("cache")) {
    return "cache";
  }

  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex >= 0) {
    const ext = lower.substring(dotIndex);
    if (EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext];
    }
  }

  return null;
};

const safeReadDir = async (path: string): Promise<RNFS.ReadDirItem[]> => {
  try {
    return await RNFS.readDir(path);
  } catch {
    return [];
  }
};

const ensureStatSize = async (entry: RNFS.ReadDirItem): Promise<number> => {
  if (typeof entry.size === "number" && !Number.isNaN(entry.size)) {
    return entry.size;
  }
  try {
    const info = await RNFS.stat(entry.path);
    return info.size ?? 0;
  } catch {
    return 0;
  }
};

export const scanCachesAndLogs = async (): Promise<ScanResult[]> => {
  const queue = [...new Set(TARGET_DIRECTORIES)];
  const results: ScanResult[] = [];

  while (queue.length) {
    const current = queue.pop();
    if (!current) continue;

    const entries = await safeReadDir(current);

    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory()) {
          queue.push(entry.path);
          return;
        }

        if (!entry.isFile()) {
          return;
        }

        const matchType = getMatchType(entry.name);
        if (!matchType) {
          return;
        }

        const size = await ensureStatSize(entry);
        results.push({
          path: entry.path,
          size,
          type: matchType,
        });
      })
    );
  }

  return results.sort((a, b) => b.size - a.size);
};

export const deleteFile = async (path: string) => {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) return;
    await RNFS.unlink(path);
  } catch {
    // Ignore permission errors per requirements.
  }
};

export const clearAll = async (items: ScanResult[]) => {
  await Promise.allSettled(items.map((item) => deleteFile(item.path)));
};

export default scanCachesAndLogs;

