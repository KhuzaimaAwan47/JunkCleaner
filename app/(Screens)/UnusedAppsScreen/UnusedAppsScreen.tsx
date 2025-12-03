import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { scanUnusedApps, UnusedAppInfo } from "./UnusedAppsScanner";

type SectionData = {
  title: string;
  data: UnusedAppInfo[];
};

const UnusedAppsScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [apps, setApps] = useState<UnusedAppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setApps([]);
    try {
      const result = await scanUnusedApps();
      setApps(result);
      setHasScanned(true);
    } catch (error) {
      console.warn("Unused apps scan failed", error);
      Alert.alert("Scan Failed", "Unable to scan for unused apps. Please try again.");
      setHasScanned(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const groupedData = useMemo<SectionData[]>(() => {
    const unused = apps.filter((app) => app.category === "UNUSED");
    const lowUsage = apps.filter((app) => app.category === "LOW_USAGE");
    const active = apps.filter((app) => app.category === "ACTIVE");

    const sections: SectionData[] = [];
    
    if (unused.length > 0) {
      sections.push({ title: "UNUSED APPS", data: unused });
    }
    if (lowUsage.length > 0) {
      sections.push({ title: "LOW USAGE", data: lowUsage });
    }
    if (active.length > 0) {
      sections.push({ title: "ACTIVE", data: active });
    }

    return sections;
  }, [apps]);

  const renderItem = useCallback(
    ({ item }: { item: UnusedAppInfo }) => {
      const lastUsedText =
        item.lastUsedDays === -1
          ? "Never used"
          : item.lastUsedDays === 0
          ? "Used today"
          : item.lastUsedDays === 1
          ? "Used yesterday"
          : `Last used ${item.lastUsedDays} days ago`;

      return (
        <View style={styles.itemWrapper}>
          <NeumorphicContainer padding={theme.spacing.md}>
            <View style={styles.itemInner}>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons
                  name="application"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.appName} numberOfLines={1}>
                  {item.appName}
                </Text>
                <Text style={styles.packageName} numberOfLines={1}>
                  {item.packageName}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{lastUsedText}</Text>
                  <Text style={styles.confidenceScore}>
                    {item.confidenceScore}%
                  </Text>
                </View>
              </View>
            </View>
          </NeumorphicContainer>
        </View>
      );
    },
    [styles, theme]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <Text style={styles.sectionCount}>({section.data.length})</Text>
      </View>
    ),
    [styles]
  );

  const keyExtractor = useCallback((item: UnusedAppInfo) => item.packageName, []);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        <AppHeader title="Unused Apps" subtitle="Detect and manage unused applications" />

        {!loading && apps.length === 0 && (
          <View style={[styles.primaryButtonContainer, styles.sectionSpacing]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={scan}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>start scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={[styles.progressCard, styles.sectionSpacing]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.progressText}>Scanning apps...</Text>
          </View>
        )}

        {!loading && apps.length > 0 && (
          <>
            <View style={[styles.metricsRow, styles.sectionSpacing]}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>total apps</Text>
                <Text style={styles.metricValue}>{apps.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>unused</Text>
                <Text style={styles.metricValue}>
                  {apps.filter((a) => a.category === "UNUSED").length}
                </Text>
              </View>
            </View>

            <View style={[styles.resultsContainer, styles.sectionSpacing]}>
              <SectionList
                sections={groupedData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            </View>

            <View style={[styles.rescanContainer, styles.sectionSpacing]}>
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={scan}
                activeOpacity={0.8}
              >
                <Text style={styles.rescanButtonText}>rescan</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!loading && hasScanned && apps.length === 0 && (
          <View style={[styles.emptyCard, styles.sectionSpacing]}>
            <Text style={styles.emptyTitle}>no unused apps found</Text>
            <Text style={styles.emptySubtitle}>
              All installed apps appear to be in use.
            </Text>
          </View>
        )}
      </ScrollView>
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
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.5,
    },
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    primaryButtonContainer: {
      marginTop: theme.spacing.md,
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
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    progressText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginTop: theme.spacing.xs,
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
      fontSize: theme.fontSize.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginTop: theme.spacing.xs / 2,
    },
    resultsContainer: {
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      padding: theme.spacing.md,
    },
    listContent: {
      gap: theme.spacing.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.surfaceAlt}33`,
    },
    sectionHeaderText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    sectionCount: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    itemWrapper: {
      marginVertical: 0,
    },
    itemInner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
    },
    infoColumn: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    appName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    packageName: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs / 2,
    },
    metaText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    confidenceScore: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    rescanContainer: {
      marginTop: theme.spacing.md,
    },
    rescanButton: {
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
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
  });

export default UnusedAppsScreen;
