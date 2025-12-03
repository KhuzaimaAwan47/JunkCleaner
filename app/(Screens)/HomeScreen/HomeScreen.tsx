import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AdPlaceholder from "../../../components/AdPlaceholder";
import CircularStorageIndicator from "../../../components/CircularStorageIndicator";
import FeatureCard from "../../../components/FeatureCard";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScanButton from "../../../components/ScanButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { useThemeMode } from "../../../context/ThemeContext";
import type { Feature } from "../../../dummydata/features";
import { featureCards, storageStats } from "../../../dummydata/features";
import { appRoutes } from "../../../routes";

const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
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
  const isDarkMode = mode === "dark";
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

        <View style={styles.themeToggleRow}>
          <View style={styles.themeToggleTextWrap}>
            <Text style={styles.themeToggleLabel}>{isDarkMode ? "dark mode" : "light mode"}</Text>
            <Text style={styles.themeToggleSubtitle}>adjust the interface instantly</Text>
          </View>
            <Switch
              accessibilityLabel="toggle app theme"
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor={isDarkMode ? theme.colors.primary : "#ffffff"}
              trackColor={{
                false: `${theme.colors.surfaceAlt}aa`,
                true: `${theme.colors.primary}55`,
              }}
            />
          </View>
          <View style={styles.indicatorCard}>
            <CircularStorageIndicator total={storageStats.total} used={storageStats.used} />
            <Text style={styles.scoreLabel}>your system is in good condition</Text>
            <Text style={styles.scoreStatus}>{`${storageStats.used} GB used / ${storageStats.total} GB`}</Text>
            <ScanButton
              onPress={() => router.push(appRoutes.smartClean)}
              label="optimize"
              style={styles.scanButton}
            />
          </View>
          <View style={styles.featureGrid}>
            {topFeatures.map((feature) => (
              <View key={feature.id} style={styles.featureGridItem}>
                <FeatureCard feature={feature} onPress={() => handleNavigate(feature.route)} />
              </View>
            ))}
          </View>
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
                  {row.map((feature) => (
                    <TouchableOpacity
                      key={feature.id}
                      accessibilityRole="button"
                      accessibilityLabel={`open ${feature.title}`}
                      activeOpacity={0.8}
                      onPress={() => handleNavigate(feature.route)}
                      style={styles.remainingGridItem}
                    >
                      <View style={[styles.remainingIcon, { backgroundColor: `${feature.accent}22` }]}>
                        <MaterialCommunityIcons
                          name={feature.icon as any}
                          size={22}
                          color={feature.accent}
                        />
                      </View>
                      <View style={styles.remainingTextWrap}>
                        <Text style={styles.remainingTitle} numberOfLines={1}>
                          {feature.title}
                        </Text>
                        <Text style={styles.remainingSubtitle} numberOfLines={1}>
                          {feature.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </NeumorphicContainer>
          </View>
          <View style={styles.adSection}>
            <AdPlaceholder />
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
    themeToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
    },
    themeToggleTextWrap: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    themeToggleLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "capitalize",
    },
    themeToggleSubtitle: {
      color: theme.colors.textMuted,
      marginTop: 2,
      fontSize: theme.fontSize.sm,
    },
    indicatorCard: {
      alignItems: "center",
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      shadowColor: "rgba(0,0,0,0.25)",
      shadowOpacity: 0.15,
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
  });
