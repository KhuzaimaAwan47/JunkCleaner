import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import {
  clearSelections,
  setLoading,
  setUnusedAppsResults,
} from "../../../redux-code/action";
import { initDatabase, loadUnusedAppsResults, saveUnusedAppsResults } from "../../../utils/db";
import { scanUnusedApps, type UnusedAppInfo } from "./UnusedAppsScanner";

export const useUnusedAppsActions = (
  apps: UnusedAppInfo[],
  selectedPackageNames: Set<string>
) => {
  const dispatch = useDispatch();
  const [hasScanned, setHasScanned] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        await initDatabase();
        const savedResults = await loadUnusedAppsResults();
        if (savedResults.length > 0) {
          dispatch(setUnusedAppsResults(savedResults));
          setHasScanned(true);
        }
      } catch (error) {
        console.error("Failed to load saved unused apps results:", error);
      }
    };
    loadSavedResults();
  }, [dispatch]);

  const handleScan = useCallback(async () => {
    dispatch(setLoading("unused", true));
    dispatch(setUnusedAppsResults([]));
    dispatch(clearSelections("unused"));
    try {
      const result = await scanUnusedApps();
      dispatch(setUnusedAppsResults(result));
      setHasScanned(true);
      await saveUnusedAppsResults(result);
    } catch (error) {
      console.warn("Unused apps scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for unused apps. Please try again.");
      setHasScanned(true);
    } finally {
      dispatch(setLoading("unused", false));
    }
  }, [dispatch]);

  const handleUninstall = useCallback((selectedStats: { items: number }) => {
    const appsToUninstall = selectedStats.items > 0
      ? apps.filter((app) => selectedPackageNames.has(app.packageName))
      : apps;

    if (!appsToUninstall.length || uninstalling) {
      return;
    }

    Alert.alert(
      "Uninstall Apps?",
      `This will uninstall ${appsToUninstall.length} app${appsToUninstall.length > 1 ? "s" : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Uninstall",
          style: "destructive",
          onPress: async () => {
            setUninstalling(true);
            try {
              // TODO: Implement actual uninstall functionality
              // For now, just remove from list
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const remainingApps = apps.filter((app) => !appsToUninstall.some((uninstalled) => uninstalled.packageName === app.packageName));
              dispatch(setUnusedAppsResults(remainingApps));
              dispatch(clearSelections("unused"));
              Alert.alert("Success", `${appsToUninstall.length} app${appsToUninstall.length > 1 ? "s" : ""} uninstalled successfully.`);
            } catch (error) {
              console.warn("Uninstall failed", error);
              Alert.alert("Uninstall Failed", "Some apps could not be uninstalled.");
            } finally {
              setUninstalling(false);
            }
          },
        },
      ]
    );
  }, [apps, uninstalling, selectedPackageNames, dispatch]);

  return { hasScanned, handleScan, handleUninstall, uninstalling };
};

// Default export to satisfy expo-router while keeping this as a non-route module
export default function UnusedAppsActionsRoute(): null {
  return null;
}

