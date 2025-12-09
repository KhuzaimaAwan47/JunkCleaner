import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import formatBytes from "../../../constants/formatBytes";
import { clearSelections, setLoading, setOldFileResults, setSelectedItems } from "../../../redux-code/action";
import { initDatabase, loadOldFileResults, saveOldFileResults } from "../../../utils/db";
import { deleteOldFiles, type OldFileInfo } from "./OldFilesScanner";
import { scanOldFiles } from "./OldFilesScanner";

export const useOldFilesActions = (
  oldFiles: OldFileInfo[],
  selectedFilePaths: Set<string>
) => {
  const dispatch = useDispatch();
  const [clearing, setClearing] = useState(false);
  const [hasSavedResults, setHasSavedResults] = useState(false);

  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadOldFileResults();
        if (savedResults.length > 0) {
          dispatch(setOldFileResults(savedResults));
          setHasSavedResults(true);
        } else {
          setHasSavedResults(false);
        }
      } catch (error) {
        console.error("Failed to load saved old file results:", error);
        setHasSavedResults(false);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    dispatch(setLoading("old", true));
    dispatch(clearSelections("old"));
    try {
      const files = await scanOldFiles(90);
      dispatch(setOldFileResults(files));
      await saveOldFileResults(files);
      setHasSavedResults(files.length > 0);
    } catch (error) {
      console.warn("OldFiles scan failed", error);
    } finally {
      dispatch(setLoading("old", false));
    }
  }, [dispatch]);

  const handleDelete = useCallback(async (selectedStats: { items: number; size: number }) => {
    if (selectedStats.items === 0 || clearing) return;

    const filesToDelete = oldFiles.filter((file) => selectedFilePaths.has(file.path));
    Alert.alert(
      "Delete Old Files?",
      `This will permanently delete ${selectedStats.items} file${selectedStats.items !== 1 ? 's' : ''} (${formatBytes(selectedStats.size)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await deleteOldFiles(filesToDelete);
              const remainingFiles = oldFiles.filter((file) => !selectedFilePaths.has(file.path));
              dispatch(setOldFileResults(remainingFiles));
              dispatch(clearSelections("old"));
              await saveOldFileResults(remainingFiles);
            } catch (error) {
              console.warn("Delete old files failed", error);
              Alert.alert("Delete Failed", "Some files could not be deleted.");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [dispatch, selectedFilePaths, clearing, oldFiles]);

  return { hasSavedResults, handleScan, handleDelete, clearing };
};

