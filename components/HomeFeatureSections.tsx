import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import FeatureCard from "./FeatureCard";
import FeatureProgressItem from "./FeatureProgressItem";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  topFeatures: Feature[];
  remainingRows: Feature[][];
  featureProgress: Record<string, number>;
  featureRevealStyle: ViewStyle;
  onNavigate: (route: Feature["route"]) => void;
};

const HomeFeatureSections = React.memo<Props>(
  ({ topFeatures, remainingRows, featureProgress, featureRevealStyle, onNavigate }) => {
    const theme = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    return (
      <>
        <Animated.View style={[styles.featureGrid, featureRevealStyle]}>
          {topFeatures.map((feature) => (
            <View key={feature.id} style={styles.featureGridItem}>
              <FeatureCard
                feature={{ ...feature, progress: featureProgress[feature.id] ?? 0 }}
                progress={featureProgress[feature.id] ?? 0}
                onPress={() => onNavigate(feature.route)}
              />
            </View>
          ))}
        </Animated.View>
        <Animated.View style={[styles.remainingSection, featureRevealStyle]}>
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
                  <FeatureProgressItem
                    key={feature.id}
                    feature={feature}
                    progress={featureProgress[feature.id] || 0}
                    onPress={() => onNavigate(feature.route)}
                  />
                ))}
              </View>
            ))}
          </NeumorphicContainer>
        </Animated.View>
      </>
    );
  }
);

HomeFeatureSections.displayName = "HomeFeatureSections";

export default HomeFeatureSections;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
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
  });

