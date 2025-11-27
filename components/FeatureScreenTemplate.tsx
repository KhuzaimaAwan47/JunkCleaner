import { MotiView } from "moti";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AdPlaceholder from "./AdPlaceholder";
import AppHeader from "./AppHeader";
import NeumorphicContainer from "./NeumorphicContainer";
import ResultStatCard from "./ResultStatCard";
import ScanButton from "./ScanButton";

type Props = {
  title: string;
  subtitle: string;
  accent: string;
  statLabel: string;
  statValue: string;
  summaryLines?: string[];
  onScan?: () => void;
};

const FeatureScreenTemplate: React.FC<Props> = ({
  title,
  subtitle,
  accent,
  statLabel,
  statValue,
  summaryLines = ["Quick scan ready", "Safe to clean"],
  onScan,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom', 'left', 'right']}>
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
        <View style={styles.placeholderList}>
          {[0, 1, 2].map((index) => (
            <NeumorphicContainer key={index} padding={18} glass style={styles.placeholderRow}>
              <Text style={styles.appText}>List placeholder {index + 1}</Text>
            </NeumorphicContainer>
          ))}
        </View>
        <ResultStatCard label={statLabel} value={statValue} accent={accent} />
        {summaryLines.map((line) => (
          <Text key={line} style={styles.summaryText}>
            {line}
          </Text>
        ))}
        <ScanButton label="Scan Now" onPress={onScan} />
        <AdPlaceholder />
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeatureScreenTemplate;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
  });
