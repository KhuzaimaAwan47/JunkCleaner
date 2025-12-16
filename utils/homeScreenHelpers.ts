import type { ScanDataSnapshot } from "./db";
import type { DuplicateGroup } from "../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner";
import type { LargeFileResult } from "../app/(Screens)/LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import type { WhatsAppScanResult } from "../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner";

// Helper function to categorize files (same logic as fileCategoryCalculator)
const categorizeFile = (path: string, type?: string): string => {
  const lower = path.toLowerCase();
  
  // Check for specific types first
  if (type === "cache" || type === "log" || type === "temp") return "Cache";
  if (type === "Images" || lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) return "Images";
  if (type === "Video" || lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) return "Videos";
  if (type === "Documents" || lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) return "Documents";
  if (type === "Audio" || type === "VoiceNotes" || lower.match(/\.(mp3|wav|flac|aac|m4a|ogg|wma)$/)) return "Audio";
  if (lower.endsWith(".apk")) return "Apps";
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) return "Archives";
  if (lower.includes("system") || lower.includes("android/data") || lower.includes("android/obb")) return "System";
  
  return "Other";
};

export const hasDataInSnapshot = (snapshot: ScanDataSnapshot): boolean => {
  return (
    snapshot.whatsappResults.length > 0 ||
    snapshot.duplicateResults.length > 0 ||
    snapshot.largeFileResults.length > 0 ||
    snapshot.oldFileResults.length > 0
  );
};

export const calculateProgressFromSnapshot = (snapshot: ScanDataSnapshot): Record<string, number> => {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  const oldCount = snapshot.oldFileResults.length;
  const duplicateFileCount = snapshot.duplicateResults.reduce(
    (sum, group) => sum + (group.files?.length ?? 0),
    0,
  );
  const largeFileCount = snapshot.largeFileResults.length;
  const whatsappCount = snapshot.whatsappResults.length;

  // Calculate maximum file count across all features for relative progress
  const counts = [
    oldCount,
    duplicateFileCount,
    largeFileCount,
    whatsappCount,
  ];
  const maxCount = Math.max(...counts, 1); // Use 1 as minimum to avoid division by zero

  const progress: Record<string, number> = {};

  // Calculate progress based on file count relative to the maximum count
  // This ensures the feature with the most files shows 100% progress, and others scale relative to it
  progress.old = maxCount > 0 ? clamp(oldCount / maxCount) : 0;
  progress.duplicate = maxCount > 0 ? clamp(duplicateFileCount / maxCount) : 0;
  progress.large = maxCount > 0 ? clamp(largeFileCount / maxCount) : 0;
  progress.whatsapp = maxCount > 0 ? clamp(whatsappCount / maxCount) : 0;

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
  ]);
  progress.storage = averaged(["large", "duplicate", "old"]);

  // Calculate category feature progress (Audio, Images, Videos, etc.)
  const categoryCounts: Record<string, number> = {};

  // Process Large files
  snapshot.largeFileResults.forEach((file) => {
    const category = categorizeFile(file.path, (file as any).category);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Process Old files
  snapshot.oldFileResults.forEach((file) => {
    const category = categorizeFile(file.path);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Process WhatsApp files
  snapshot.whatsappResults.forEach((file) => {
    const category = categorizeFile(file.path, (file as any).type);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Process Duplicate images
  snapshot.duplicateResults.forEach((group) => {
    group.files.forEach((file) => {
      const category = categorizeFile(file.path, "Images");
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  // Calculate progress for target categories
  const targetCategories = ["Videos", "Images", "Audio", "Other", "Documents"];
  const categoryCountsArray = targetCategories.map((name) => categoryCounts[name] || 0);
  const maxCategoryCount = Math.max(...categoryCountsArray, 1);

  // Set progress for each category feature
  targetCategories.forEach((categoryName) => {
    const categoryId = `category-${categoryName.toLowerCase()}`;
    const count = categoryCounts[categoryName] || 0;
    progress[categoryId] = maxCategoryCount > 0 ? clamp(count / maxCategoryCount) : 0;
  });

  return progress;
};

