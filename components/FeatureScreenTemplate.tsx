import { MotiView } from "moti";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "./AppHeader";
import NeumorphicContainer from "./NeumorphicContainer";
import ResultStatCard from "./ResultStatCard";
import ScanButton from "./ScanButton";
import ScreenWrapper from "./ScreenWrapper";

type SupportStat = {
  label: string;
  value: string;
};

type FeatureItem = {
  label: string;
  status?: string;
};

type Props = {
  title: string;
  subtitle: string;
  accent: string;
  statLabel: string;
  statValue: string;
  summaryLines?: string[];
  supportStats?: SupportStat[];
  featureItems?: FeatureItem[];
  onScan?: () => void;
};

const FeatureScreenTemplate: React.FC<Props> = ({
  title,
  subtitle,
  accent,
  statLabel,
  statValue,
  summaryLines = ["Quick scan ready", "Safe to clean"],
  supportStats,
  featureItems,
  onScan,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenWrapper style={styles.wrapper}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <AppHeader title={title} subtitle={subtitle} />
        <View style={styles.progressWrap}>
          <NeumorphicContainer padding={20}>
            <View style={styles.progressBar}>
              <MotiView
                from={{ width: "10%" }}
                animate={{ width: "88%" }}
                transition={{ type: "timing", duration: 1200 }}
                style={{ height: "100%", backgroundColor: accent }}
              />
            </View>
          </NeumorphicContainer>
        </View>
        {featureItems && featureItems.length > 0 ? (
          <View style={styles.featureList}>
            {featureItems.map((item) => (
              <NeumorphicContainer
                key={item.label}
                padding={18}
                glass
                style={styles.featureRow}
              >
                <View style={styles.featureRowInner}>
                  <Text style={styles.appText}>{item.label}</Text>
                  {item.status ? (
                    <Text style={[styles.statusBadge, { color: accent }]}>
                      {item.status}
                    </Text>
                  ) : null}
                </View>
              </NeumorphicContainer>
            ))}
          </View>
        ) : (
          <View style={styles.placeholderList}>
            {[0, 1, 2].map((index) => (
              <NeumorphicContainer
                key={index}
                padding={18}
                glass
                style={styles.placeholderRow}
              >
                <Text style={styles.appText}>List placeholder {index + 1}</Text>
              </NeumorphicContainer>
            ))}
          </View>
        )}
        <ResultStatCard label={statLabel} value={statValue} accent={accent} />
        {supportStats && supportStats.length > 0 ? (
          <View style={styles.supportStatsRow}>
            {supportStats.map((item) => (
              <NeumorphicContainer
                key={item.label}
                padding={16}
                glass
                style={styles.supportStatCard}
              >
                <Text style={styles.supportStatLabel}>{item.label}</Text>
                <Text style={[styles.supportStatValue, { color: accent }]}>
                  {item.value}
                </Text>
              </NeumorphicContainer>
            ))}
          </View>
        ) : null}
        {summaryLines.map((line) => (
          <Text key={line} style={styles.summaryText}>
            {line}
          </Text>
        ))}
        <ScanButton label="Scan Now" onPress={onScan} />
      </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default FeatureScreenTemplate;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    screen: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    progressWrap: {
      marginTop: theme.spacing.lg,
    },
    progressBar: {
      height: 18,
      borderRadius: 20,
      backgroundColor: `${theme.colors.surfaceAlt}66`,
      overflow: "hidden",
    },
    featureList: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    featureRow: {
      marginBottom: theme.spacing.sm,
    },
    featureRowInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statusBadge: {
      fontSize: 13,
      fontWeight: "600",
    },
    placeholderList: {
      marginTop: theme.spacing.lg,
    },
    placeholderRow: {
      marginBottom: theme.spacing.md,
    },
    appText: {
      color: theme.colors.text,
    },
    summaryText: {
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    supportStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    supportStatCard: {
      flex: 1,
    },
    supportStatLabel: {
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
    },
    supportStatValue: {
      fontSize: 18,
      fontWeight: "700",
    },
  });
