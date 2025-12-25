import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import ModuleCard from "../../../components/ModuleCard";
import ScreenWrapper from "../../../components/ScreenWrapper";
import StorageIndicatorCard from "../../../components/StorageIndicatorCard";
import {
  setAPKResults,
  setAudiosResults,
  setCachesResults,
  setDocumentsResults,
  setDuplicateResults,
  setFeatureProgress,
  setImagesResults,
  setLargeFileResults,
  setOldFileResults,
  setStorageInfo,
  setVideosResults,
  setWhatsappResults,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import { appRoutes } from "../../../routes";
import {
  initDatabase,
  loadAllScanResults,
  saveAPKResults,
  saveAudiosResults,
  saveDocumentsResults,
  saveDuplicateGroups,
  saveImagesResults,
  saveLargeFileResults,
  saveOldFileResults,
  saveVideosResults,
  saveWhatsAppResults,
} from "../../../utils/db";
import { calculateFeatureStats } from "../../../utils/featureStatsCalculator";
import { calculateProgressFromSnapshot } from "../../../utils/homeScreenHelpers";
import { requestAllSmartScanPermissions } from "../../../utils/permissions";
import { getStorageInfo } from "../../../utils/storage";
import { unifiedFileScan } from "../../../utils/unifiedFileScanner";
import { scanDuplicateImages } from "../DuplicateImagesScreen/DuplicateImageScanner";
import { scanWhatsApp } from "../WhatsAppRemoverScreen/WhatsAppScanner";

const HomeScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const featureProgress = useSelector((state: RootState) => state.appState.featureProgress);
  const storageInfo = useSelector((state: RootState) => state.appState.storageInfo);
  const largeFileResults = useSelector((state: RootState) => state.appState.largeFileResults);
  const oldFileResults = useSelector((state: RootState) => state.appState.oldFileResults);
  const whatsappResults = useSelector((state: RootState) => state.appState.whatsappResults);
  const duplicateResults = useSelector((state: RootState) => state.appState.duplicateResults);
  const apkResults = useSelector((state: RootState) => state.appState.apkResults);
  const cachesResults = useSelector((state: RootState) => state.appState.cachesResults);
  const videosResults = useSelector((state: RootState) => state.appState.videosResults);
  const imagesResults = useSelector((state: RootState) => state.appState.imagesResults);
  const audiosResults = useSelector((state: RootState) => state.appState.audiosResults);
  const documentsResults = useSelector((state: RootState) => state.appState.documentsResults);
  
  // Calculate feature stats from scan results
  const featureStats = React.useMemo(() => {
    return calculateFeatureStats({
      whatsappResults,
      duplicateResults,
      largeFileResults,
      oldFileResults,
      apkResults,
      cachesResults,
    });
  }, [whatsappResults, duplicateResults, largeFileResults, oldFileResults, apkResults, cachesResults]);

  // Calculate Storage Analyzer stats (aggregate all file categories)
  const storageAnalyzerStats = React.useMemo(() => {
    let totalCount = 0;
    let totalSize = 0;

    // Add counts and sizes from all categories
    if (largeFileResults) {
      totalCount += largeFileResults.length;
      totalSize += largeFileResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (oldFileResults) {
      totalCount += oldFileResults.length;
      totalSize += oldFileResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (videosResults) {
      totalCount += videosResults.length;
      totalSize += videosResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (imagesResults) {
      totalCount += imagesResults.length;
      totalSize += imagesResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (audiosResults) {
      totalCount += audiosResults.length;
      totalSize += audiosResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (documentsResults) {
      totalCount += documentsResults.length;
      totalSize += documentsResults.reduce((sum, f) => sum + f.size, 0);
    }
    if (apkResults) {
      totalCount += apkResults.length;
      totalSize += apkResults.reduce((sum, f) => sum + f.size, 0);
    }

    return { count: totalCount, size: totalSize };
  }, [largeFileResults, oldFileResults, videosResults, imagesResults, audiosResults, documentsResults, apkResults]);

  // Calculate Duplicate Images stats
  const duplicateStats = React.useMemo(() => {
    const stats = featureStats.duplicate;
    return {
      count: stats?.count ?? 0,
      size: stats?.size ?? 0,
    };
  }, [featureStats.duplicate]);

  // Calculate WhatsApp Cleaner stats
  const whatsappStats = React.useMemo(() => {
    const stats = featureStats.whatsapp;
    return {
      count: stats?.count ?? 0,
      size: stats?.size ?? 0,
    };
  }, [featureStats.whatsapp]);

  const refreshHomeState = React.useCallback(async () => {
    try {
      await initDatabase();
      const [snapshot, storage] = await Promise.all([
        loadAllScanResults(),
        getStorageInfo(),
      ]);

      dispatch(setWhatsappResults(snapshot.whatsappResults));
      dispatch(setLargeFileResults(snapshot.largeFileResults));
      dispatch(setOldFileResults(snapshot.oldFileResults));
      dispatch(setDuplicateResults(snapshot.duplicateResults));
      dispatch(setVideosResults(snapshot.videosResults));
      dispatch(setImagesResults(snapshot.imagesResults));
      dispatch(setAudiosResults(snapshot.audiosResults));
      dispatch(setDocumentsResults(snapshot.documentsResults));
      dispatch(setAPKResults(snapshot.apkResults));
      dispatch(setCachesResults(snapshot.cachesResults));

      dispatch(
        setFeatureProgress(
          calculateProgressFromSnapshot(snapshot)
        )
      );
      dispatch(setStorageInfo(storage));
    } catch (error) {
      console.error("Failed to check scan status:", error);
    }
  }, [dispatch]);


  const [scanningStates, setScanningStates] = React.useState({
    storage: false,
    duplicate: false,
    whatsapp: false,
  });

  React.useEffect(() => {
    refreshHomeState();
  }, [refreshHomeState, dispatch]);

  const handleStorageScan = React.useCallback(async () => {
    if (scanningStates.storage) return;

    const hasPermissions = await requestAllSmartScanPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Storage permissions are required to scan files. Please grant the permissions and try again.",
      );
      return;
    }

    setScanningStates((prev) => ({ ...prev, storage: true }));
    try {
      await initDatabase();
      const results = await unifiedFileScan();
      
      // Save all results
      await Promise.all([
        saveLargeFileResults(results.largeFiles),
        saveOldFileResults(results.oldFiles),
        saveVideosResults(results.videos),
        saveImagesResults(results.images),
        saveAudiosResults(results.audios),
        saveDocumentsResults(results.documents),
        saveAPKResults(results.apkFiles),
      ]);

      // Dispatch results
      dispatch(setLargeFileResults(results.largeFiles));
      dispatch(setOldFileResults(results.oldFiles));
      dispatch(setVideosResults(results.videos));
      dispatch(setImagesResults(results.images));
      dispatch(setAudiosResults(results.audios));
      dispatch(setDocumentsResults(results.documents));
      dispatch(setAPKResults(results.apkFiles));

      await refreshHomeState();
    } catch (error) {
      console.error("Storage scan error:", error);
      Alert.alert("Scan Error", (error as Error).message || "An error occurred during the scan.");
    } finally {
      setScanningStates((prev) => ({ ...prev, storage: false }));
    }
  }, [scanningStates.storage, dispatch, refreshHomeState]);

  const handleDuplicateScan = React.useCallback(async () => {
    if (scanningStates.duplicate) return;

    const hasPermissions = await requestAllSmartScanPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Storage permissions are required to scan for duplicates. Please grant the permissions and try again.",
      );
      return;
    }

    setScanningStates((prev) => ({ ...prev, duplicate: true }));
    try {
      await initDatabase();
      const results = await scanDuplicateImages(
        () => {}, // Progress callback
        { current: false } // Cancel ref
      );
      
      await saveDuplicateGroups(results);
      dispatch(setDuplicateResults(results));
      await refreshHomeState();
    } catch (error) {
      console.error("Duplicate scan error:", error);
      Alert.alert("Scan Error", (error as Error).message || "An error occurred during the scan.");
    } finally {
      setScanningStates((prev) => ({ ...prev, duplicate: false }));
    }
  }, [scanningStates.duplicate, dispatch, refreshHomeState]);

  const handleWhatsAppScan = React.useCallback(async () => {
    if (scanningStates.whatsapp) return;

    const hasPermissions = await requestAllSmartScanPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Storage permissions are required to scan WhatsApp files. Please grant the permissions and try again.",
      );
      return;
    }

    setScanningStates((prev) => ({ ...prev, whatsapp: true }));
    try {
      await initDatabase();
      const results = await scanWhatsApp();
      await saveWhatsAppResults(results);
      dispatch(setWhatsappResults(results));
      await refreshHomeState();
    } catch (error) {
      console.error("WhatsApp scan error:", error);
      Alert.alert("Scan Error", (error as Error).message || "An error occurred during the scan.");
    } finally {
      setScanningStates((prev) => ({ ...prev, whatsapp: false }));
    }
  }, [scanningStates.whatsapp, dispatch, refreshHomeState]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.indicatorCard}>
            <StorageIndicatorCard storageInfo={storageInfo} />
          </View>

          <View style={styles.moduleCardsContainer}>
            <ModuleCard
              title="Storage Analyzer"
              icon="harddisk"
              itemsCount={storageAnalyzerStats.count}
              sizeCanFree={storageAnalyzerStats.size}
              itemsLabel="items found"
              iconAccent={theme.colors.info}
              onView={() => router.push(appRoutes.storageAnalyzer)}
              onScan={handleStorageScan}
              isScanning={scanningStates.storage}
              description="Find out what taking up space on your device."
            />

            <ModuleCard
              title="Duplicate Images"
              icon="image-multiple-outline"
              itemsCount={duplicateStats.count}
              sizeCanFree={duplicateStats.size}
              itemsLabel="duplicate images found"
              iconAccent="#7E57C2"
              onView={() => router.push(appRoutes.duplicates)}
              onScan={handleDuplicateScan}
              isScanning={scanningStates.duplicate}
              description="Find and remove duplicate images."
            />

            <ModuleCard
              title="WhatsApp Cleaner"
              icon="whatsapp"
              itemsCount={whatsappStats.count}
              sizeCanFree={whatsappStats.size}
              itemsLabel="expendable items found"
              iconAccent="#25D366"
              onView={() => router.push(appRoutes.whatsapp)}
              onScan={handleWhatsAppScan}
              isScanning={scanningStates.whatsapp}
              description="Clean up WhatsApp media files."
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default HomeScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 2,
    },
    indicatorCard: {
      alignItems: "center",
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.25)",
      shadowOpacity: theme.mode === "dark" ? 0.3 : 0.15,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    moduleCardsContainer: {
      marginTop: theme.spacing.md,
    },
  });
