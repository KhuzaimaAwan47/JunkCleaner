import type { ScanDataSnapshot } from "./db";

// Helper function to categorize files (same logic as fileCategoryCalculator)
const categorizeFile = (path: string, type?: string): string => {
  const lower = path.toLowerCase();
  
  // Check for APK files FIRST (before Documents) to prevent APK files from being categorized as Documents
  if (lower.endsWith(".apk") || lower.endsWith(".apks") || lower.endsWith(".xapk")) return "Apps";
  
  // Check for specific types first
  if (type === "cache" || type === "log" || type === "temp") return "Cache";
  if (type === "Images" || lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) return "Images";
  if (type === "Video" || lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) return "Videos";
  if (type === "Documents" || lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) return "Documents";
  if (type === "Audio" || type === "VoiceNotes" || lower.match(/\.(mp3|wav|flac|aac|m4a|ogg|wma)$/)) return "Audio";
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) return "Archives";
  if (lower.includes("system") || lower.includes("android/data") || lower.includes("android/obb")) return "System";
  
  return "Other";
};

export const hasDataInSnapshot = (snapshot: ScanDataSnapshot): boolean => {
  return (
    snapshot.whatsappResults.length > 0 ||
    snapshot.duplicateResults.length > 0 ||
    snapshot.largeFileResults.length > 0 ||
    snapshot.oldFileResults.length > 0 ||
    snapshot.videosResults.length > 0 ||
    snapshot.imagesResults.length > 0 ||
    snapshot.audiosResults.length > 0 ||
    snapshot.documentsResults.length > 0
  );
};

export const calculateProgressFromSnapshot = (snapshot: ScanDataSnapshot): Record<string, number> => {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  // Calculate sizes for each feature (more meaningful than count for storage impact)
  const oldSize = snapshot.oldFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);
  const duplicateSize = snapshot.duplicateResults.reduce(
    (sum, group) =>
      sum + (group.files?.reduce((fileSum, file) => fileSum + (file.size ?? 0), 0) ?? 0),
    0,
  );
  const largeFileSize = snapshot.largeFileResults.reduce((sum, item) => sum + (item.size ?? 0), 0);
  const whatsappSize = snapshot.whatsappResults.reduce((sum, item) => sum + (item.size ?? 0), 0);
  const apkSize = snapshot.apkResults.reduce((sum, item) => sum + (item.size ?? 0), 0);

  // Calculate maximum size across all features for relative progress
  const sizes = [
    oldSize,
    duplicateSize,
    largeFileSize,
    whatsappSize,
    apkSize,
  ];
  const maxSize = Math.max(...sizes, 1); // Use 1 as minimum to avoid division by zero

  const progress: Record<string, number> = {};

  // Calculate progress based on size relative to the maximum size
  // This ensures the feature with the most storage impact shows 100% progress, and others scale relative to it
  progress.old = maxSize > 0 ? clamp(oldSize / maxSize) : 0;
  progress.duplicate = maxSize > 0 ? clamp(duplicateSize / maxSize) : 0;
  progress.large = maxSize > 0 ? clamp(largeFileSize / maxSize) : 0;
  progress.whatsapp = maxSize > 0 ? clamp(whatsappSize / maxSize) : 0;
  progress.apk = maxSize > 0 ? clamp(apkSize / maxSize) : 0;

  const averaged = (keys: string[]) =>
    clamp(
      keys.reduce((sum, key) => sum + (progress[key] ?? 0), 0) /
        Math.max(1, keys.length),
    );

  progress.smart = averaged([
    "old",
    "duplicate",
    "large",
    "whatsapp",
    "apk",
  ]);
  progress.storage = averaged(["large", "duplicate", "old", "apk"]);

  // Calculate category feature progress (Audio, Images, Videos, Documents) based on size
  // Use dedicated scanner results directly
  const videosSize = snapshot.videosResults.reduce((sum, file) => sum + (file.size || 0), 0);
  const imagesSize = snapshot.imagesResults.reduce((sum, file) => sum + (file.size || 0), 0);
  const audiosSize = snapshot.audiosResults.reduce((sum, file) => sum + (file.size || 0), 0);
  const documentsSize = snapshot.documentsResults.reduce((sum, file) => sum + (file.size || 0), 0);

  const categorySizes = {
    Videos: videosSize,
    Images: imagesSize,
    Audio: audiosSize,
    Documents: documentsSize,
  };

  const categorySizesArray = Object.values(categorySizes);
  const maxCategorySize = Math.max(...categorySizesArray, 1);

  // Set progress for each category feature based on size
  Object.entries(categorySizes).forEach(([categoryName, size]) => {
    const categoryId = `category-${categoryName.toLowerCase()}`;
    progress[categoryId] = maxCategorySize > 0 ? clamp(size / maxCategorySize) : 0;
  });

  return progress;
};


