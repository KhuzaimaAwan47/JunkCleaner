import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AdPlaceholder from "../../../components/AdPlaceholder";
import AppHeader from "../../../components/AppHeader";
import ProgressBar from "../../../components/ProgressBar";
import formatBytes from "../../../constants/formatBytes";
import formatTime from "../../../constants/formatTime";
import { ApkFile, useAPKScanner } from "./APKScanner";

const APKsRemoverScreen = () => {
  const { startScan, stopScan, isScanning, progress, results, error } = useAPKScanner();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pulseScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isScanning) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true,
      );
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isScanning, pulseScale]);

  const totalInstallers = results.length;

  const apkSizeTotal = useMemo(
    () => results.reduce((sum, apk) => sum + (apk.size || 0), 0),
    [results],
  );



  const progressPercent = useMemo(
    () => (progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0),
    [progress],
  );

  const scannedFilesCount = progress.scannedFiles ?? progress.current;
  const totalFilesEstimate = progress.totalFiles ?? progress.total;

  const handleScan = useCallback(() => {
    void startScan();
  }, [startScan]);

  const handleStop = useCallback(() => {
    stopScan();
  }, [stopScan]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const iconConfig = useMemo(
    () => ({
      apk: { name: "android", color: theme.colors.primary },
      split: { name: "cube-scan", color: theme.colors.success || theme.colors.primary },
      bundle: { name: "zip-box", color: theme.colors.warning || theme.colors.primary },
    }),
    [theme.colors.primary, theme.colors.success, theme.colors.warning],
  );

  const renderApkRow = useCallback<ListRenderItem<ApkFile>>(
    ({ item }) => {
      const iconMeta = iconConfig[item.fileType] ?? iconConfig.apk;
      const displayName = item.name || item.path.split("/").pop() || "Unknown APK";
      return (
        <View style={styles.apkItem}>
          <View style={styles.apkItemContent}>
            <View style={styles.apkIconContainer}>
              <MaterialCommunityIcons
                name={iconMeta.name as never}
                size={28}
                color={iconMeta.color}
              />
            </View>
            <View style={styles.apkInfoContainer}>
              <View style={styles.apkHeaderRow}>
                <View style={styles.apkNameContainer}>
                  <Text style={styles.apkName} numberOfLines={2}>
                    {displayName}
                  </Text>
                </View>
                <Text style={styles.apkSize}>{formatBytes(item.size)}</Text>
              </View>
              <View style={styles.apkMetaRow}>
                <Text style={styles.apkPath} numberOfLines={1}>
                  {item.path}
                </Text>
                {item.isSignatureMatch && (
                  <View style={styles.signatureBadge}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={12}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.signatureBadgeText}>verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [iconConfig, theme, styles],
  );

  const showSummaryCard =
    !isScanning && (progress.total > 0 || progress.currentFile === "Cancelled" || totalInstallers > 0);
  const scanWasCancelled = progress.currentFile === "Cancelled";
  const showStarterCallout = !isScanning && totalInstallers === 0 && progress.total === 0 && !scanWasCancelled;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="APK Remover" subtitle="installers clean-up" />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryMeta}>
            {totalInstallers} installer{totalInstallers !== 1 ? "s" : ""} catalogued
          </Text>
          <Text style={[styles.summaryMeta, styles.summaryMetaAccent]}>{formatBytes(apkSizeTotal)} total size</Text>
        </View>

        {showStarterCallout && (
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleScan}
              activeOpacity={0.85}
              disabled={isScanning}
            >
              <Text style={styles.primaryButtonText}>
                {isScanning ? "scanning…" : "scan apks installers"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {isScanning && (
          <View style={styles.progressCard}>
            <View style={styles.timerRow}>
              <Text style={styles.timerText}>⏱️ {formatTime(elapsedTime)}</Text>
              {scannedFilesCount > 0 && (
                <Text style={styles.fileCountText}>
                  {scannedFilesCount.toLocaleString()} / {totalFilesEstimate > 0 ? totalFilesEstimate.toLocaleString() : "?"} files
                </Text>
              )}
            </View>
            <ProgressBar progress={progressPercent} currentFile={progress.currentFile} stage={progress.stage} />
            <TouchableOpacity style={styles.stopButton} onPress={handleStop} activeOpacity={0.85}>
              <Text style={styles.stopButtonText}>stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {showSummaryCard ? (
          <View style={styles.summaryCard}>
            {scanWasCancelled ? (
              <>
                <Text style={styles.summaryTitle}>scan cancelled</Text>
                <Text style={styles.summaryText}>
                  scanned {progress.scannedFiles || progress.current || 0} files before cancellation
                </Text>
                <Text style={styles.summaryText}>resume when you’re ready</Text>
              </>
            ) : totalInstallers === 0 ? (
              <>
                <Text style={styles.summaryTitle}>no installers found</Text>
                <Text style={styles.summaryText}>
                  scanned {progress.total || scannedFilesCount || 0} locations
                </Text>
                <Text style={styles.summaryText}>downloads are already clean</Text>
              </>
            ) : (
              <>
                <Text style={styles.summaryTitle}>scan complete</Text>
                <Text style={styles.summaryText}>
                  scanned {progress.total || scannedFilesCount || 0} files
                </Text>
                <Text style={styles.summaryText}>
                  found {totalInstallers} installer{totalInstallers !== 1 ? "s" : ""}
                </Text>
              </>
            )}
            <TouchableOpacity style={styles.rescanButton} onPress={handleScan} activeOpacity={0.85}>
              <Text style={styles.rescanButtonText}>rescan</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {totalInstallers > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>detected installers</Text>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>latest sweep</Text>
              <Text style={styles.listHeaderMeta}>
                {totalInstallers} shown · {formatBytes(apkSizeTotal)}
              </Text>
            </View>
            <View style={styles.listShell}>
              <FlatList
                data={results}
                keyExtractor={(item) => item.path}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={renderApkRow}
              />
            </View>
          </View>
        ) : null}

        <AdPlaceholder />
      </ScrollView>
    </SafeAreaView>
  );
};

export default APKsRemoverScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
    },
    summaryMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      textTransform: "capitalize",
    },
    summaryMetaAccent: {
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.xl,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(0,0,0,0.2)",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      marginBottom: theme.spacing.lg,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      marginBottom: theme.spacing.lg,
    },
    timerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    timerText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    fileCountText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    stopButton: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.error,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
    },
    stopButtonText: {
      color: "#fff",
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "uppercase",
    },
    errorCard: {
      backgroundColor: `${theme.colors.error}11`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.error}55`,
      marginBottom: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.xs,
      shadowColor: "rgba(0,0,0,0.08)",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
      marginBottom: theme.spacing.lg,
    },
    summaryTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      textTransform: "capitalize",
    },
    summaryText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    rescanButton: {
      marginTop: theme.spacing.md,
      alignSelf: "flex-start",
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    rescanButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "uppercase",
    },
    resultsSection: {
      marginBottom: theme.spacing.lg,
    },
    resultsTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      textTransform: "capitalize",
    },
    listHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    listHeaderTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "capitalize",
    },
    listHeaderMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    listShell: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      padding: theme.spacing.md,
    },
    separator: {
      height: 1,
      backgroundColor: `${theme.colors.surfaceAlt}44`,
      marginVertical: theme.spacing.sm,
    },
    apkItem: {
      paddingVertical: theme.spacing.sm,
    },
    apkItemContent: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    apkIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
      justifyContent: "center",
    },
    apkInfoContainer: {
      flex: 1,
      marginLeft: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    apkHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    apkNameContainer: {
      flex: 1,
    },
    apkName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    apkSize: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    apkMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    apkPath: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    signatureBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${theme.colors.primary}11`,
      borderRadius: theme.radii.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
    },
    signatureBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
  });
