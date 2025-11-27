import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ResultStatCard from "../../../components/ResultStatCard";
import { storageStats } from "../../../dummydata/features";

const StorageDashboardScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Storage IQ" subtitle="visual dashboard" />
        <NeumorphicContainer padding={24} glass style={styles.sectionSpacing}>
          <View style={styles.bars}>
            {[48, 72, 64, 90, 55, 80].map((height, index) => (
              <View key={index} style={[styles.bar, { height: `${height}%` }]} />
            ))}
          </View>
        </NeumorphicContainer>
        <View style={[styles.grid, styles.sectionSpacing]}>
          <View style={[styles.halfCard, styles.halfCardSpacing]}>
            <ResultStatCard label="Total" value={`${storageStats.total} GB`} />
          </View>
          <View style={styles.halfCard}>
            <ResultStatCard label="Used" value={`${storageStats.used} GB`} accent={theme.colors.primary} />
          </View>
        </View>
        <View style={[styles.grid, styles.sectionSpacing]}>
          <View style={[styles.halfCard, styles.halfCardSpacing]}>
            <ResultStatCard label="System" value={`${storageStats.system} GB`} />
          </View>
          <View style={styles.halfCard}>
            <ResultStatCard label="Junk" value={`${storageStats.junk} GB`} accent={theme.colors.accent} />
          </View>
        </View>
        <View style={styles.recommendations}>
          {storageStats.recommended.map((tip) => (
            <Text key={tip} style={styles.recommendation}>
              • {tip}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StorageDashboardScreen;

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
    sectionSpacing: {
      marginBottom: theme.spacing.lg,
    },
    bars: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 160,
      marginTop: theme.spacing.sm,
    },
    bar: {
      width: 18,
      borderRadius: 10,
      backgroundColor: `${theme.colors.primary}55`,
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    halfCard: {
      flex: 1,
    },
    halfCardSpacing: {
      marginRight: theme.spacing.md,
    },
    recommendations: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    recommendation: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
    },
  });
