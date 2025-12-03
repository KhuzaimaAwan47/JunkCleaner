import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import { deleteJunkFiles, JunkFileItem, scanJunkFiles } from "./JunkFileScanner";


const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ progress, size = 120 }) => {
  const theme = useTheme();
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference - progressValue * circumference;
  const gradientId = useMemo(() => `progressGradient-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.95} />
            <Stop offset="100%" stopColor={theme.colors.accent} stopOpacity={0.9} />
          </SvgGradient>
        </Defs>
        <Circle
          stroke={`${theme.colors.surfaceAlt}55`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={`url(#${gradientId})`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>
          {Math.round(progressValue * 100)}%
        </Text>
      </View>
    </View>
  );
};

const SuccessCheckmark: React.FC = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#4CAF50",
          alignItems: "center",
          justifyContent: "center",
        },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons name="check" size={48} color="#FFFFFF" />
    </Animated.View>
  );
};

const JunkFileScannerScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<JunkFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ progress: number; detail?: string }>({
    progress: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setShowSuccess(false);
    setItems([]);
    setScanProgress({ progress: 0, detail: "initializing..." });
    try {
      const progressCallback: (progress: number, detail?: string) => void = (progress, detail) => {
        setScanProgress({ progress, detail });
      };
      const result = await scanJunkFiles(progressCallback);
      setItems(result.items);
    } catch (error) {
      console.warn("Junk file scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for junk files. Please try again.");
    } finally {
      setLoading(false);
      setScanProgress({ progress: 0 });
    }
  }, []);

  const totalSize = useMemo(() => items.reduce((sum, item) => sum + (item.size || 0), 0), [items]);

  const handleClean = useCallback(() => {
    if (!items.length || clearing) {
      return;
    }
    const size = items.reduce((sum, item) => sum + (item.size || 0), 0);
    Alert.alert(
      "Clean Junk Files?",
      `This will permanently delete ${items.length} junk file${items.length > 1 ? "s" : ""} (${formatBytes(size)}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await deleteJunkFiles(items);
              setShowSuccess(true);
              setTimeout(() => {
                setShowSuccess(false);
                setItems([]);
              }, 2000);
            } catch (error) {
              console.warn("Clean failed", error);
              Alert.alert("Clean Failed", "Some files could not be deleted.");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [items, clearing]);

  const formatModifiedDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const renderItem = useCallback<ListRenderItem<JunkFileItem>>(
    ({ item }) => (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.path.split("/").pop() || item.path}
          </Text>
          <Text style={styles.size}>{formatBytes(item.size)}</Text>
        </View>
        <Text style={styles.path} numberOfLines={1}>
          {item.path}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.badge}>{item.type}</Text>
          <Text style={styles.dateText}>{formatModifiedDate(item.modified)}</Text>
        </View>
      </View>
    ),
    [styles]
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
        <AppHeader title="Junk Scanner" />

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>ultra-fast junk cleanup</Text>
            <Text style={styles.heroSubtitle}>
              Deep scan for cache, temp files, logs, and other junk cluttering your storage.
            </Text>
          </View>

          {loading ? (
            <View style={styles.progressCard}>
              <CircularProgress progress={scanProgress.progress} />
              <Text style={styles.progressText}>Scanning...</Text>
              {scanProgress.detail && (
                <Text style={styles.progressSubtext} numberOfLines={1}>
                  {scanProgress.detail}
                </Text>
              )}
            </View>
          ) : showSuccess ? (
            <View style={styles.successCard}>
              <SuccessCheckmark />
              <Text style={styles.successText}>Cleanup Complete!</Text>
            </View>
          ) : (
            <Pressable
              onPress={scan}
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.scanButtonPressed,
                loading && styles.scanButtonDisabled,
              ]}
              disabled={loading}
            >
              <Text style={styles.scanButtonText}>
                {items.length > 0 ? "Rescan Storage" : "Start Scan"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>files found</Text>
            <Text style={styles.metricValue}>{items.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>total size</Text>
            <Text style={styles.metricValue}>{formatBytes(totalSize)}</Text>
          </View>
        </View>

        <View style={styles.resultsCard}>
          {items.length > 0 ? (
            <>
              <FlatList
                data={items}
                keyExtractor={(item) => item.path}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>no junk files detected</Text>
                  </View>
                }
              />
              <Pressable
                onPress={handleClean}
                disabled={clearing || !items.length}
                style={[
                  styles.cleanButton,
                  (clearing || !items.length) && styles.scanButtonDisabled,
                ]}
              >
                {clearing ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.scanButtonText}>Clean Junk</Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={48}
                color={theme.colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {loading ? "scanning storage..." : "run a scan to find junk files"}
              </Text>
            </View>
          )}
        </View>
      </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    heroCard: {
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.md,
    },
    heroHeader: {
      gap: theme.spacing.sm,
    },
    heroTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    progressCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    progressText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginTop: theme.spacing.xs,
    },
    progressSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    successCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    successText: {
      color: "#4CAF50",
      fontSize: 18,
      fontWeight: "700",
      marginTop: theme.spacing.xs,
    },
    scanButton: {
      marginTop: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
    scanButtonPressed: {
      opacity: 0.9,
    },
    scanButtonDisabled: {
      opacity: 0.6,
    },
    scanButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    metricsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    metricCard: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginTop: theme.spacing.xs / 2,
    },
    resultsCard: {
      flex: 1,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    listContent: {
      paddingBottom: theme.spacing.sm,
    },
    item: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    fileName: {
      flex: 1,
      marginRight: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: "600",
    },
    size: {
      color: theme.colors.accent,
      fontWeight: "700",
    },
    path: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    itemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.xs / 2,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.radii.lg,
      backgroundColor: `${theme.colors.primary}22`,
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    cleanButton: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    emptyIcon: {
      opacity: 0.5,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },
  });

export default JunkFileScannerScreen;

