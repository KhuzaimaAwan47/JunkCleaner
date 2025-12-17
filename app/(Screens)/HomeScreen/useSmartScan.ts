import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import {
  clearScanProgress,
  setLoading,
  setScanProgress,
  setWhatsappResults,
  setLargeFileResults,
  setOldFileResults,
  setDuplicateResults,
  setVideosResults,
  setImagesResults,
  setAudiosResults,
  setDocumentsResults,
  setFeatureProgress,
  setSystemHealth,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { runSmartScan, type SmartScanResultsUpdate } from "../../../utils/smartScan";
import { requestAllSmartScanPermissions } from "../../../utils/permissions";
import { loadAllScanResults } from "../../../utils/db";
import { calculateProgressFromSnapshot, hasDataInSnapshot } from "../../../utils/homeScreenHelpers";
import { calculateSystemHealth } from "../../../utils/systemHealth";
import { getStorageInfo } from "../../../utils/storage";
import { getMemoryInfo } from "../../../utils/memory";

export const useSmartScan = (onScanComplete: () => Promise<void>) => {
  const dispatch = useDispatch();
  const isScanningRedux = useSelector((state: RootState) => state.appState.loadingStates.smartScan);
  const [localIsScanning, setLocalIsScanning] = React.useState(false);
  const scanCancelledRef = React.useRef(false);

  React.useEffect(() => {
    setLocalIsScanning(isScanningRedux);
  }, [isScanningRedux]);

  const updateResultsIncrementally = React.useCallback(async (update: SmartScanResultsUpdate) => {
    if (scanCancelledRef.current) return;

    try {
      // Dispatch scanner-specific results immediately
      if (update.results.whatsappResults !== undefined) {
        dispatch(setWhatsappResults(update.results.whatsappResults));
      }
      if (update.results.duplicateResults !== undefined) {
        dispatch(setDuplicateResults(update.results.duplicateResults));
      }
      if (update.results.largeFileResults !== undefined) {
        dispatch(setLargeFileResults(update.results.largeFileResults));
      }
      if (update.results.oldFileResults !== undefined) {
        dispatch(setOldFileResults(update.results.oldFileResults));
      }

      // Load current snapshot from DB to get all results (including previously completed scanners)
      const snapshot = await loadAllScanResults();
      
      // Dispatch category results
      dispatch(setVideosResults(snapshot.videosResults));
      dispatch(setImagesResults(snapshot.imagesResults));
      dispatch(setAudiosResults(snapshot.audiosResults));
      dispatch(setDocumentsResults(snapshot.documentsResults));
      
      // Calculate and dispatch updated feature progress
      const progress = calculateProgressFromSnapshot(snapshot);
      dispatch(setFeatureProgress(progress));

      // Calculate and dispatch updated system health if we have data
      const dataExists = hasDataInSnapshot(snapshot);
      if (dataExists) {
        const [storage, memory] = await Promise.all([
          getStorageInfo(),
          getMemoryInfo(),
        ]);
        const storageUsage = storage.total > 0 ? storage.used / storage.total : undefined;
        const memoryUsage = memory?.usage;
        const systemHealth = calculateSystemHealth(snapshot, { storageUsage, memoryUsage });
        dispatch(setSystemHealth(systemHealth));
      }
    } catch (error) {
      console.error("Failed to update results incrementally:", error);
      // Don't throw - allow scan to continue even if incremental update fails
    }
  }, [dispatch]);

  const handleSmartScan = React.useCallback(async () => {
    if (localIsScanning) return;

    // Request all permissions upfront before starting the scan
    const hasPermissions = await requestAllSmartScanPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "All storage permissions are required to perform the smart scan. Please grant the permissions and try again.",
      );
      return;
    }

    setLocalIsScanning(true);
    dispatch(setLoading("smartScan", true));
    dispatch(clearScanProgress());
    scanCancelledRef.current = false;

    try {
      await runSmartScan(
        (progress) => {
          if (!scanCancelledRef.current) {
            dispatch(setScanProgress(progress));
          }
        },
        (resultsUpdate) => {
          if (!scanCancelledRef.current) {
            updateResultsIncrementally(resultsUpdate);
          }
        }
      );
      await onScanComplete();
    } catch (error) {
      if (!scanCancelledRef.current) {
        console.error("Smart scan error:", error);
        Alert.alert("Scan Error", (error as Error).message || "An error occurred during the scan.");
      }
    } finally {
      setLocalIsScanning(false);
      dispatch(setLoading("smartScan", false));
      dispatch(clearScanProgress());
      scanCancelledRef.current = false;
    }
  }, [localIsScanning, onScanComplete, dispatch, updateResultsIncrementally]);

  const handleStopScan = React.useCallback(() => {
    setLocalIsScanning(false);
    scanCancelledRef.current = true;
    dispatch(setLoading("smartScan", false));
    dispatch(clearScanProgress());
  }, [dispatch]);

  return {
    isScanning: localIsScanning,
    handleSmartScan,
    handleStopScan,
  };
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function SmartScanRoute(): null {
  return null;
}

