import { useMemo } from "react";
import type { OldFileInfo } from "./OldFilesScanner";

export type FileCategory = 'All' | 'Images' | 'Videos' | 'Documents' | 'Audio' | 'Archives' | 'Other';

export const categorizeFile = (path: string): FileCategory => {
  const lower = path.toLowerCase();
  
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/)) return 'Images';
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|3gp)$/)) return 'Videos';
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt)$/)) return 'Documents';
  if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) return 'Audio';
  if (lower.match(/\.(zip|rar|7z|tar|gz|bz2|obb)$/)) return 'Archives';
  return 'Other';
};

export const FILTER_TYPES: FileCategory[] = [
  'All',
  'Images',
  'Videos',
  'Documents',
  'Audio',
  'Archives',
  'Other',
];

export const useOldFilesSummary = (oldFiles: OldFileInfo[], filterType: FileCategory) => {
  const totalSize = useMemo(() => oldFiles.reduce((sum, file) => sum + file.size, 0), [oldFiles]);

  const filteredFiles = useMemo(() => {
    if (filterType === 'All') return oldFiles;
    return oldFiles.filter((file) => categorizeFile(file.path) === filterType);
  }, [oldFiles, filterType]);

  const fileSummary = useMemo(() => {
    const summary: Record<FileCategory, { count: number; size: number }> = {
      All: { count: oldFiles.length, size: totalSize },
      Images: { count: 0, size: 0 },
      Videos: { count: 0, size: 0 },
      Documents: { count: 0, size: 0 },
      Audio: { count: 0, size: 0 },
      Archives: { count: 0, size: 0 },
      Other: { count: 0, size: 0 },
    };

    oldFiles.forEach((file) => {
      const category = categorizeFile(file.path);
      summary[category].count += 1;
      summary[category].size += file.size;
    });

    return summary;
  }, [oldFiles, totalSize]);

  const categoryCounts = useMemo(() => 
    Object.fromEntries(FILTER_TYPES.map(type => [type, fileSummary[type].count])),
    [fileSummary]
  );

  return { totalSize, filteredFiles, categoryCounts, fileSummary };
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function OldFilesSummaryRoute(): null {
  return null;
}

