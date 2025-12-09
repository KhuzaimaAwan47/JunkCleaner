import { useMemo } from "react";
import type { OldFileInfo } from "./OldFilesScanner";

export const useOldFilesSelection = (
  filteredFiles: OldFileInfo[],
  selectedFilePaths: Set<string>
) => {
  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    filteredFiles.forEach((file) => {
      if (selectedFilePaths.has(file.path)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [selectedFilePaths, filteredFiles]);

  const isAllSelected = useMemo(() => {
    return filteredFiles.length > 0 && filteredFiles.every((file) => selectedFilePaths.has(file.path));
  }, [filteredFiles, selectedFilePaths]);

  return { selectedStats, isAllSelected };
};

