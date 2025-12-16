import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import {
  clearScanProgress,
  setLoading,
  setScanProgress,
  setApkResults,
  setWhatsappResults,
  setDuplicateResults,
  setLargeFileResults,
  setJunkFileResults,
  setOldFileResults,
  setCacheLogsResults,
  setUnusedAppsResults,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { runSmartScan } from "../../../utils/smartScan";

export const useSmartScan = (onScanComplete: () => Promise<void>) => {
  const dispatch = useDispatch();
  const isScanningRedux = useSelector((state: RootState) => state.appState.loadingStates.smartScan);
  const [localIsScanning, setLocalIsScanning] = React.useState(false);
  const scanCancelledRef = React.useRef(false);

  React.useEffect(() => {
    setLocalIsScanning(isScanningRedux);
  }, [isScanningRedux]);

  const handleSmartScan = React.useCallback(async () => {
    if (localIsScanning) return;

    setLocalIsScanning(true);
    dispatch(setLoading("smartScan", true));
    dispatch(clearScanProgress());
    scanCancelledRef.current = false;

    try {
      await runSmartScan((progress) => {
        if (!scanCancelledRef.current) {
          dispatch(setScanProgress(progress));
        }
      });
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
  }, [localIsScanning, onScanComplete, dispatch]);

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

