import type { DefaultTheme } from "styled-components/native";
import type { DuplicateGroup } from "../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner";
import type { LargeFileResult } from "../app/(Screens)/LargeFilesScreen/LargeFileScanner";
import type { OldFileInfo } from "../app/(Screens)/OldFilesScreen/OldFilesScanner";
import type { WhatsAppScanResult } from "../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner";
import type { Feature } from "../dummydata/features";
import { appRoutes } from "../routes";

type ScanResults = {
  largeFileResults?: LargeFileResult[];
  oldFileResults?: OldFileInfo[];
  whatsappResults?: WhatsAppScanResult[];
  duplicateResults?: DuplicateGroup[];
};

type FileCategoryData = {
  name: string;
  size: number;
  count: number;
};

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

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    Images: "image-multiple",
    Videos: "video",
    Documents: "file-document",
    Audio: "music",
    Apps: "android",
    Archives: "folder-zip",
    Cache: "cached",
    System: "cog",
    Other: "file-outline",
  };
  return icons[category] || "file-outline";
};

const getCategoryColor = (category: string, theme: DefaultTheme): string => {
  const colors: Record<string, string> = {
    Images: "#4CAF50",
    Videos: "#F44336",
    Documents: "#2196F3",
    Audio: "#9C27B0",
    Apps: "#00D1FF",
    Archives: "#FF9800",
    Cache: theme.colors.accent,
    System: theme.colors.textMuted,
    Other: theme.colors.textMuted,
  };
  return colors[category] || theme.colors.textMuted;
};

const getCategorySubtitle = (category: string, size: number, count: number): string => {
  const sizeGB = (size / (1024 * 1024 * 1024)).toFixed(1);
  if (count > 0) {
    return `${sizeGB} GB • ${count} files`;
  }
  return `${sizeGB} GB`;
};

/**
 * Calculate file categories from scan results and convert to Feature format
 */
export function calculateFileCategoryFeatures(
  scanResults: ScanResults,
  theme: DefaultTheme
): Feature[] {
  const categories: Record<string, FileCategoryData> = {};

  // Process Large files
  scanResults.largeFileResults?.forEach((file) => {
    const category = categorizeFile(file.path, file.category);
    if (!categories[category]) {
      categories[category] = { name: category, size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Old files
  scanResults.oldFileResults?.forEach((file) => {
    const category = categorizeFile(file.path);
    if (!categories[category]) {
      categories[category] = { name: category, size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process WhatsApp files
  scanResults.whatsappResults?.forEach((file) => {
    const category = categorizeFile(file.path, file.type);
    if (!categories[category]) {
      categories[category] = { name: category, size: 0, count: 0 };
    }
    categories[category].size += file.size || 0;
    categories[category].count += 1;
  });

  // Process Duplicate images
  scanResults.duplicateResults?.forEach((group) => {
    group.files.forEach((file) => {
      const category = categorizeFile(file.path, "Images");
      if (!categories[category]) {
        categories[category] = { name: category, size: 0, count: 0 };
      }
      categories[category].size += file.size || 0;
      categories[category].count += 1;
    });
  });

  // Filter to only the categories we want: Videos, Images, Audio, Other, Documents
  const targetCategories = ["Videos", "Images", "Audio", "Other", "Documents"];
  const filteredCategories = targetCategories.map((name) => {
    const data = categories[name] || { name, size: 0, count: 0 };
    return data;
  });

  // Calculate max count for progress calculation (file count-based progress)
  const maxCount = Math.max(...filteredCategories.map((cat) => cat.count), 1);

  // Convert to Feature format
  // Use "category-" prefix to avoid conflicts with existing feature IDs
  return filteredCategories.map((category) => {
    // Calculate progress based on file count relative to the maximum count
    const progress = maxCount > 0 ? Math.min(1, category.count / maxCount) : 0;
    return {
      id: `category-${category.name.toLowerCase()}`,
      title: category.name,
      subtitle: getCategorySubtitle(category.name, category.size, category.count),
      icon: getCategoryIcon(category.name),
      route: appRoutes.home,
      accent: getCategoryColor(category.name, theme),
      progress,
    };
  });
}

