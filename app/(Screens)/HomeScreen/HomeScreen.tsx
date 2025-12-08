import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AdPlaceholder from "../../../components/AdPlaceholder";
import CircularLoadingIndicator from "../../../components/CircularLoadingIndicator";
import FeatureCard from "../../../components/FeatureCard";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScanButton from "../../../components/ScanButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import type { Feature } from "../../../dummydata/features";
import { featureCards } from "../../../dummydata/features";
import {
  initDatabase,
  loadApkScanResults,
  loadCacheLogsResults,
  loadDuplicateGroups,
  loadJunkFileResults,
  loadLargeFileResults,
  loadOldFileResults,
  loadSmartScanStatus,
  loadUnusedAppsResults,
  loadWhatsAppResults,
} from "../../../utils/db";
import { runSmartScan, type SmartScanProgress } from "../../../utils/smartScan";
import { getStorageInfo } from "../../../utils/storage";
import { calculateSystemHealth, type SystemHealthResult } from "../../../utils/systemHealth";

const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const topFeatures = featureCards.slice(0, 4);
  const remainingFeatures = featureCards.slice(4);
  const remainingRows = React.useMemo(() => {
    const rows: Feature[][] = [];
    for (let i = 0; i < remainingFeatures.length; i += 3) {
      rows.push(remainingFeatures.slice(i, i + 3));
    }
    return rows;
  }, [remainingFeatures]);

  const [, setStorageInfo] = React.useState({ total: 0, used: 0, free: 0 });
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState<SmartScanProgress | null>(null);
  const [showRemainingRows, setShowRemainingRows] = React.useState(false);
  const [featureProgress, setFeatureProgress] = React.useState<Record<string, number>>({});
  const [systemHealth, setSystemHealth] = React.useState<SystemHealthResult | null>(null);
  const scanCancelledRef = React.useRef(false);

  // Load storage info on mount
  React.useEffect(() => {
    const loadStorage = async () => {
      try {
        const info = await getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error("Failed to load storage info:", error);
      }
    };
    loadStorage();
  }, []);

  // Check if smart scan is complete or data exists
  React.useEffect(() => {
    const checkScanStatus = async () => {
      try {
        await initDatabase();
        const status = await loadSmartScanStatus();
        
        // Check if any scan data exists
        const [
          apkResults,
          whatsappResults,
          duplicateResults,
          largeFileResults,
          junkFileResults,
          oldFileResults,
          cacheLogsResults,
          unusedAppsResults,
        ] = await Promise.all([
          loadApkScanResults(),
          loadWhatsAppResults(),
          loadDuplicateGroups(),
          loadLargeFileResults(),
          loadJunkFileResults(),
          loadOldFileResults(),
          loadCacheLogsResults(),
          loadUnusedAppsResults(),
        ]);

        const hasData = 
          apkResults.length > 0 ||
          whatsappResults.length > 0 ||
          duplicateResults.length > 0 ||
          largeFileResults.length > 0 ||
          junkFileResults.length > 0 ||
          oldFileResults.length > 0 ||
          cacheLogsResults.length > 0 ||
          unusedAppsResults.length > 0;

        const isComplete = status?.completed === true;
        setShowRemainingRows(isComplete || hasData);

        // Calculate progress for each feature
        const progress: Record<string, number> = {};
        progress.apk = apkResults.length > 0 ? Math.min(0.95, apkResults.length / 100) : 0;
        progress.whatsapp = whatsappResults.length > 0 ? Math.min(0.95, whatsappResults.length / 500) : 0;
        progress.duplicate = duplicateResults.length > 0 ? Math.min(0.95, duplicateResults.length / 50) : 0;
        progress.large = largeFileResults.length > 0 ? Math.min(0.95, largeFileResults.length / 50) : 0;
        progress.junk = junkFileResults.length > 0 ? Math.min(0.95, junkFileResults.length / 200) : 0;
        progress.old = oldFileResults.length > 0 ? Math.min(0.95, oldFileResults.length / 200) : 0;
        progress.cache = cacheLogsResults.length > 0 ? Math.min(0.95, cacheLogsResults.length / 100) : 0;
        progress.unused = unusedAppsResults.length > 0 ? Math.min(0.95, unusedAppsResults.length / 50) : 0;
        setFeatureProgress(progress);

        // Calculate system health
        const health = calculateSystemHealth({
          apkResults,
          whatsappResults,
          duplicateResults,
          largeFileResults,
          junkFileResults,
          oldFileResults,
          cacheLogsResults,
          unusedAppsResults,
        });
        setSystemHealth(health);
      } catch (error) {
        console.error("Failed to check scan status:", error);
      }
    };
    checkScanStatus();
  }, [isScanning]);

  const handleSmartScan = React.useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(null);
    scanCancelledRef.current = false;

    try {
      await runSmartScan((progress) => {
        if (!scanCancelledRef.current) {
          setScanProgress(progress);
        }
      });
    } catch (error) {
      if (!scanCancelledRef.current) {
        console.error("Smart scan error:", error);
        Alert.alert("Scan Error", (error as Error).message || "An error occurred during the scan.");
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      scanCancelledRef.current = false;
    }
  }, [isScanning]);

  const handleStopScan = React.useCallback(() => {
    scanCancelledRef.current = true;
    setIsScanning(false);
    setScanProgress(null);
  }, []);

  const handleNavigate = React.useCallback(
    (route: Feature["route"]) => {
      router.push(route);
    },
    [router],
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.indicatorCard}>
            <CircularLoadingIndicator
              scanProgress={isScanning ? scanProgress : null}
              systemHealth={!isScanning ? systemHealth : null}
            />
            <ScanButton
              onPress={isScanning ? handleStopScan : handleSmartScan}
              label={isScanning ? "Stop Scan" : "Smart Scan"}
              style={[styles.scanButton, isScanning && { backgroundColor: "#EF4444" }]}
              disabled={false}
            />
          </View>
          <View style={styles.featureGrid}>
            {topFeatures.map((feature) => (
              <View key={feature.id} style={styles.featureGridItem}>
                <FeatureCard feature={feature} onPress={() => handleNavigate(feature.route)} />
              </View>
            ))}
          </View>
          {showRemainingRows && (
            <View style={styles.remainingSection}>
              <NeumorphicContainer style={styles.remainingCard}>
                {remainingRows.map((row, rowIndex) => (
                  <View
                    key={`remaining-row-${rowIndex}`}
                    style={[
                      styles.remainingGridRow,
                      rowIndex === remainingRows.length - 1 && styles.remainingGridRowLast,
                    ]}
                  >
                    {row.map((feature) => {
                      const progress = featureProgress[feature.id] || 0;
                      return (
                        <FeatureProgressItem
                          key={feature.id}
                          feature={feature}
                          progress={progress}
                          onPress={() => handleNavigate(feature.route)}
                          theme={theme}
                        />
                      );
                    })}
                  </View>
                ))}
              </NeumorphicContainer>
            </View>
          )}
          <View style={styles.adSection}>
            <AdPlaceholder />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

// Component for feature item with progress bar
const FeatureProgressItem = React.memo<{
  feature: Feature;
  progress: number;
  onPress: () => void;
  theme: DefaultTheme;
}>(({ feature, progress, onPress, theme }) => {
  const progressAnimated = useSharedValue(0);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  React.useEffect(() => {
    progressAnimated.value = withTiming(progress, { duration: 500 });
  }, [progress, progressAnimated]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimated.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`open ${feature.title}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.remainingGridItem}
    >
      <View style={[styles.remainingIcon, { backgroundColor: `${feature.accent}22` }]}>
        <MaterialCommunityIcons name={feature.icon as any} size={22} color={feature.accent} />
      </View>
      <View style={styles.remainingTextWrap}>
        <Text style={styles.remainingTitle} numberOfLines={1}>
          {feature.title}
        </Text>
        <Text style={styles.remainingSubtitle} numberOfLines={1}>
          {feature.subtitle}
        </Text>
        {progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarTrack, { backgroundColor: `${feature.accent}22` }]}>
              <Animated.View
                style={[styles.progressBarFill, { backgroundColor: feature.accent }, progressStyle]}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

FeatureProgressItem.displayName = "FeatureProgressItem";

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
    scoreLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.sm,
    },
    scoreStatus: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      marginTop: theme.spacing.xs,
    },
    scanButton: {
      marginTop: theme.spacing.lg,
      width: "100%",
    },
    featureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    featureGridItem: {
      width: "48%",
      marginBottom: theme.spacing.md,
    },
    remainingSection: {
      marginTop: theme.spacing.xl,
    },
    remainingCard: {
      paddingBottom: theme.spacing.lg,
    },
    remainingGridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    remainingGridRowLast: {
      marginBottom: 0,
    },
    remainingGridItem: {
      width: "30%",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
    },
    remainingIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    remainingTextWrap: {
      alignItems: "center",
      marginTop: theme.spacing.xs / 2,
    },
    remainingTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    remainingSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      marginTop: 2,
    },
    adSection: {
      marginTop: theme.spacing.lg,
    },
    progressBarContainer: {
      marginTop: theme.spacing.xs / 2,
      width: "100%",
    },
    progressBarTrack: {
      width: "100%",
      height: 3,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2,
    },
  });
