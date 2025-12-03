import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import type { ComponentProps } from "react";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import ResultStatCard from "../../../components/ResultStatCard";
import ScanButton from "../../../components/ScanButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import {
  cleanResultBreakdown,
  cleanResultInsights,
  cleanResultStats,
} from "../../../dummydata/cleanResults";
import { appRoutes } from "../../../routes";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ResultAnimationScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.animationWrap}>
          <MotiView
            from={{ scale: 0.85, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ loop: true, type: "timing", duration: 1200 }}
          >
            <View style={styles.animationShell}>
              <MotiView
                from={{ scale: 0.6, opacity: 0.3 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  loop: true,
                  delay: 200,
                  type: "timing",
                  duration: 1500,
                }}
                style={[styles.pulse, { backgroundColor: `${theme.colors.primary}33` }]}
              />
              <View style={styles.statusBadge}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
            </View>
          </MotiView>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>cleanup complete</Text>
          <Text style={styles.subtitle}>device is refreshed and running cooler</Text>
        </View>

        <View style={styles.statsGrid}>
          {cleanResultStats.map((stat) => (
            <ResultStatCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              accent={stat.accent}
            />
          ))}
        </View>

        <View style={styles.highlights}>
          {cleanResultBreakdown.map((item) => (
            <View key={item.id} style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: `${item.accent}22` }]}>
                <MaterialCommunityIcons
                  name={item.icon as IconName}
                  size={24}
                  color={item.accent}
                />
              </View>
              <View style={styles.highlightTextWrap}>
                <Text style={styles.highlightLabel}>{item.label}</Text>
                <Text style={styles.highlightMeta}>{item.description}</Text>
              </View>
              <Text style={[styles.highlightValue, { color: item.accent }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.insightRow}>
          {cleanResultInsights.map((insight) => (
            <View key={insight.id} style={[styles.insightPill, { backgroundColor: `${insight.accent}15` }]}>
              <Text style={styles.insightLabel}>{insight.label}</Text>
              <Text style={[styles.insightValue, { color: insight.accent }]}>{insight.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.placeholderLabel}>visual placeholder for lottie animation</Text>

        <ScanButton
          label="Done"
          onPress={() => router.replace(appRoutes.home)}
          style={styles.scanButton}
        />
      </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default ResultAnimationScreen;

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
    animationWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
    },
    animationShell: {
      width: 200,
      height: 200,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}11`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}22`,
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.15)",
      shadowOpacity: theme.mode === "dark" ? 0.4 : 0.2,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    pulse: {
      width: 160,
      height: 160,
      borderRadius: 80,
    },
    statusBadge: {
      position: "absolute",
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.2)",
      shadowOpacity: theme.mode === "dark" ? 0.5 : 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 24,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      textTransform: "capitalize",
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
    },
    highlights: {
      marginBottom: theme.spacing.lg,
    },
    highlightCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.mode === "dark" ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      shadowColor: theme.mode === "dark" ? "#000000" : "rgba(0,0,0,0.05)",
      shadowOpacity: theme.mode === "dark" ? 0.3 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    highlightIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    highlightTextWrap: {
      flex: 1,
      gap: 2,
    },
    highlightLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      textTransform: "capitalize",
    },
    highlightMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    highlightValue: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
    },
    insightRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.lg,
    },
    insightPill: {
      flexBasis: "48%",
      marginRight: theme.spacing.sm / 2,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    insightLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      textTransform: "capitalize",
    },
    insightValue: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      marginTop: 2,
    },
    placeholderLabel: {
      textAlign: "center",
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: theme.spacing.lg,
    },
    scanButton: {
      alignSelf: "stretch",
    },
  });
