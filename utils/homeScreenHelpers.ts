import type { ScanDataSnapshot } from "./db";

export const hasDataInSnapshot = (snapshot: ScanDataSnapshot): boolean => {
  return (
    snapshot.apkResults.length > 0 ||
    snapshot.whatsappResults.length > 0 ||
    snapshot.duplicateResults.length > 0 ||
    snapshot.largeFileResults.length > 0 ||
    snapshot.junkFileResults.length > 0 ||
    snapshot.oldFileResults.length > 0 ||
    snapshot.cacheLogsResults.length > 0 ||
    snapshot.unusedAppsResults.length > 0
  );
};

export const calculateProgressFromSnapshot = (snapshot: ScanDataSnapshot): Record<string, number> => {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const normalize = (value: number, cap: number) => (cap <= 0 ? 0 : clamp(value / cap));
  const toMb = (bytes: number) => bytes / (1024 * 1024);

  const junkCount = snapshot.junkFileResults.length;
  const junkSize = snapshot.junkFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  const cacheCount = snapshot.cacheLogsResults.length;
  const cacheSize = snapshot.cacheLogsResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  const oldCount = snapshot.oldFileResults.length;
  const oldSize = snapshot.oldFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  const duplicateFileCount = snapshot.duplicateResults.reduce(
    (sum, group) => sum + (group.files?.length ?? 0),
    0,
  );
  const duplicateSize = snapshot.duplicateResults.reduce(
    (sum, group) => sum + (group.files?.reduce((fileSum, file) => fileSum + (file.size ?? 0), 0) ?? 0),
    0,
  );

  const largeFileCount = snapshot.largeFileResults.length;
  const apkCount = snapshot.apkResults.length;
  const unusedCount = snapshot.unusedAppsResults.length;
  const whatsappCount = snapshot.whatsappResults.length;
  const whatsappSize = snapshot.whatsappResults.reduce((sum, item) => sum + ((item as any)?.size ?? 0), 0);

  const progress: Record<string, number> = {};

  progress.junk = clamp(0.6 * normalize(junkCount, 200) + 0.4 * normalize(toMb(junkSize), 1500));
  progress.cache = clamp(0.6 * normalize(cacheCount, 180) + 0.4 * normalize(toMb(cacheSize), 1200));
  progress.old = clamp(0.7 * normalize(oldCount, 180) + 0.3 * normalize(toMb(oldSize), 3000));
  progress.duplicate = clamp(
    0.6 * normalize(duplicateFileCount, 180) + 0.4 * normalize(toMb(duplicateSize), 2500),
  );
  progress.large = normalize(largeFileCount, 120);
  progress.apk = normalize(apkCount, 150);
  progress.unused = normalize(unusedCount, 120);
  progress.whatsapp = clamp(
    0.5 * normalize(whatsappCount, 500) + 0.5 * normalize(toMb(whatsappSize), 4000),
  );

  const averaged = (keys: string[]) =>
    clamp(
      keys.reduce((sum, key) => sum + (progress[key] ?? 0), 0) /
        Math.max(1, keys.length),
    );

  progress.smart = averaged([
    "junk",
    "cache",
    "old",
    "duplicate",
    "large",
    "apk",
    "unused",
    "whatsapp",
  ]);
  progress.storage = averaged(["large", "duplicate", "junk", "old"]);

  return progress;
};

