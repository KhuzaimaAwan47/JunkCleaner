import { useEffect, useMemo, useRef, useState } from 'react';
import { DuplicateFileItem } from '../../../components/DuplicateCard';
import { guessOriginalPath } from '../../../utils/fileUtils';

interface DuplicateGroup {
  hash: string;
  files: { path: string }[];
}

export function useDuplicateSelection(duplicates: DuplicateGroup[], duplicateFiles: DuplicateFileItem[]) {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [smartFiltering, setSmartFiltering] = useState(false);
  const smartFilterMemoryRef = useRef<Set<string>>(new Set());
  const selectAllMemoryRef = useRef<Set<string>>(new Set());

  const fileLookupByGroup = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    duplicateFiles.forEach((file) => {
      if (!map.has(file.groupHash)) {
        map.set(file.groupHash, new Map());
      }
      map.get(file.groupHash)!.set(file.path, file.id);
    });
    return map;
  }, [duplicateFiles]);

  const originalFileIds = useMemo(() => {
    const originals = new Set<string>();
    duplicates.forEach((group) => {
      const preferredPath = guessOriginalPath(group.files);
      if (preferredPath) {
        const id = fileLookupByGroup.get(group.hash)?.get(preferredPath);
        if (id) {
          originals.add(id);
        }
      }
    });
    return originals;
  }, [duplicates, fileLookupByGroup]);

  useEffect(() => {
    setSelectedFileIds((prev) => {
      const availableIds = new Set(duplicateFiles.map((file) => file.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [duplicateFiles]);

  const smartFilteredIds = useMemo(() => {
    const autoSelected = new Set<string>();
    duplicateFiles.forEach((file) => {
      if (!originalFileIds.has(file.id)) {
        autoSelected.add(file.id);
      }
    });
    return autoSelected;
  }, [duplicateFiles, originalFileIds]);

  useEffect(() => {
    if (!smartFiltering) return;
    setSelectedFileIds(new Set(smartFilteredIds));
  }, [smartFiltering, smartFilteredIds]);

  const toggleFileSelection = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSmartFilteringToggle = (value: boolean) => {
    if (value) {
      smartFilterMemoryRef.current = new Set(selectedFileIds);
    } else {
      const previous = smartFilterMemoryRef.current;
      setSelectedFileIds(previous.size ? new Set(previous) : new Set());
      smartFilterMemoryRef.current = new Set();
    }
    selectAllMemoryRef.current = new Set();
    setSmartFiltering(value);
  };

  const handleSelectAll = () => {
    if (!duplicateFiles.length) return;
    if (selectedFileIds.size === duplicateFiles.length) {
      const previous = selectAllMemoryRef.current;
      setSelectedFileIds(previous.size ? new Set(previous) : new Set());
      selectAllMemoryRef.current = new Set();
      return;
    }
    selectAllMemoryRef.current = new Set(selectedFileIds);
    setSelectedFileIds(new Set(duplicateFiles.map((file) => file.id)));
  };

  const handleGroupSelectAll = (groupHash: string) => {
    const groupFiles = duplicateFiles.filter((file) => file.groupHash === groupHash);
    const groupFileIds = new Set(groupFiles.map((file) => file.id));
    const allGroupSelected = groupFiles.every((file) => selectedFileIds.has(file.id));
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) {
        groupFileIds.forEach((id) => next.delete(id));
      } else {
        groupFileIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedStats = useMemo(() => {
    const stats = { items: 0, size: 0 };
    duplicateFiles.forEach((file) => {
      if (selectedFileIds.has(file.id)) {
        stats.items += 1;
        stats.size += file.size;
      }
    });
    return stats;
  }, [selectedFileIds, duplicateFiles]);

  const allSelected = duplicateFiles.length > 0 && selectedFileIds.size === duplicateFiles.length;
  const noneSelected = selectedFileIds.size === 0;
  const selectionState: 'all' | 'partial' | 'none' = allSelected ? 'all' : noneSelected ? 'none' : 'partial';
  const selectAllActionLabel = allSelected ? 'restore selection' : 'select all';
  const selectAllDisabled = duplicateFiles.length === 0;
  const selectAllHint = selectAllDisabled ? 'run a scan to enable' : `${selectedFileIds.size}/${duplicateFiles.length} selected`;

  return {
    selectedFileIds,
    smartFiltering,
    selectedStats,
    selectionState,
    selectAllActionLabel,
    selectAllDisabled,
    selectAllHint,
    toggleFileSelection,
    handleSmartFilteringToggle,
    handleSelectAll,
    handleGroupSelectAll,
  };
}

// Default export to satisfy expo-router while keeping this as a non-route module
export default function DuplicateSelectionRoute(): null {
  return null;
}

