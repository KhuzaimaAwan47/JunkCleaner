import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import CircularLoadingIndicator from "../../../components/CircularLoadingIndicator";
import HomeFeatureSections from "../../../components/HomeFeatureSections";
import ScanButton from "../../../components/ScanButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import type { Feature } from "../../../dummydata/features";
import { featureCards } from "../../../dummydata/features";
import { appRoutes } from "../../../routes";
import {
  setApkResults,
  setCacheLogsResults,
  setDuplicateResults,
  setFeatureProgress,
  setJunkFileResults,
  setLargeFileResults,
  setOldFileResults,
  setStorageInfo,
  setSystemHealth,
  setUnusedAppsResults,
  setWhatsappResults,
} from "../../../redux-code/action";
import type { RootState } from "../../../redux-code/store";
import {
  initDatabase,
  loadAllScanResults,
  loadSmartScanStatus,
} from "../../../utils/db";
import { calculateProgressFromSnapshot, hasDataInSnapshot } from "../../../utils/homeScreenHelpers";
import { getStorageInfo } from "../../../utils/storage";
import { calculateSystemHealth } from "../../../utils/systemHealth";
import { getMemoryInfo } from "../../../utils/memory";
import { useSmartScan } from "./useSmartScan";

const HomeScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const features = React.useMemo<Feature[]>(() => featureCards.filter((f) => f.id !== "smart"), []);

  const scanProgress = useSelector((state: RootState) => state.appState.scanProgress);
  const featureProgress = useSelector((state: RootState) => state.appState.featureProgress);
  const systemHealth = useSelector((state: RootState) => state.appState.systemHealth);
  const [showFeatures, setShowFeatures] = React.useState(false);
  const featureVisibility = useSharedValue(0);

  const refreshHomeState = React.useCallback(async () => {
    try {
      await initDatabase();
      const [status, snapshot, storage, memory] = await Promise.all([
        loadSmartScanStatus(),
        loadAllScanResults(),
        getStorageInfo(),
        getMemoryInfo(),
      ]);

      dispatch(setApkResults(snapshot.apkResults));
      dispatch(setWhatsappResults(snapshot.whatsappResults));
      dispatch(setJunkFileResults(snapshot.junkFileResults));
      dispatch(setLargeFileResults(snapshot.largeFileResults));
      dispatch(setOldFileResults(snapshot.oldFileResults));
      dispatch(setCacheLogsResults(snapshot.cacheLogsResults));
      dispatch(setDuplicateResults(snapshot.duplicateResults));
      dispatch(setUnusedAppsResults(snapshot.unusedAppsResults));

      const dataExists = hasDataInSnapshot(snapshot);
      const isComplete = status?.completed === true;

      // Always render feature cards; fall back to zeroed progress when no data yet.
      setShowFeatures(true);
      dispatch(
        setFeatureProgress(
          calculateProgressFromSnapshot(snapshot)
        )
      );
      dispatch(setStorageInfo(storage));

      const storageUsage = storage.total > 0 ? storage.used / storage.total : undefined;
      const memoryUsage = memory?.usage;

      dispatch(setSystemHealth(
        dataExists || isComplete
          ? calculateSystemHealth(snapshot, { storageUsage, memoryUsage })
          : {
              score: 0,
              status: "fair" as const,
              message: "not calculated yet",
              totalItems: 0,
              totalSize: 0,
              storageUsage,
              memoryUsage,
            }
      ));
    } catch (error) {
      console.error("Failed to check scan status:", error);
    }
  }, [dispatch]);

  const isScanning = useSelector((state: RootState) => state.appState.loadingStates.smartScan);
  const { isScanning: localIsScanning, handleSmartScan, handleStopScan } = useSmartScan(refreshHomeState);

  React.useEffect(() => {
    refreshHomeState();
  }, [refreshHomeState, isScanning, dispatch]);

  React.useEffect(() => {
    featureVisibility.value = withTiming(showFeatures ? 1 : 0, { duration: 450 });
  }, [featureVisibility, showFeatures]);

  const featureRevealStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: featureVisibility.value,
    transform: [{ translateY: (1 - featureVisibility.value) * 14 }],
  }));

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.indicatorCard}>
            <CircularLoadingIndicator
              scanProgress={localIsScanning ? scanProgress : null}
              systemHealth={!localIsScanning ? systemHealth : null}
            />
            <ScanButton
              onPress={localIsScanning ? handleStopScan : handleSmartScan}
              label={localIsScanning ? "Stop Scan" : "Smart Scan"}
              style={[styles.scanButton, localIsScanning && { backgroundColor: "#EF4444" }]}
              disabled={false}
            />
            <ScanButton
              onPress={() => router.push(appRoutes.smartClean)}
              label="Smart Clean"
              style={[styles.scanButton, styles.smartCleanButton]}
              disabled={false}
            />
          </View>
          {showFeatures && (
            <HomeFeatureSections
              features={features}
              featureProgress={featureProgress}
              featureRevealStyle={featureRevealStyle}
              onNavigate={(route) => router.push(route)}
            />
          )}
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
    scanButton: {
      marginTop: theme.spacing.lg,
      width: "100%",
    },
    smartCleanButton: {
      backgroundColor: theme.colors.secondary,
      marginTop: theme.spacing.sm,
    },
  });
