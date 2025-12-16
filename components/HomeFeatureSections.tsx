import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import FeatureCard from "./FeatureCard";

type Props = {
  features: Feature[];
  featureProgress: Record<string, number>;
  featureRevealStyle: ViewStyle;
  onNavigate: (route: Feature["route"]) => void;
};

const HomeFeatureSections = React.memo<Props>(
  ({ features, featureProgress, featureRevealStyle, onNavigate }) => {
    const theme = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);
    const featuresWithProgress = React.useMemo(
      () =>
        features.map((feature) => ({
          ...feature,
          progress: featureProgress[feature.id] ?? 0,
        })),
      [featureProgress, features]
    );

    return (
      <Animated.View style={[styles.listSection, featureRevealStyle]}>
        <View style={styles.gridContainer}>
          {featuresWithProgress.map((feature) => (
            <View key={feature.id} style={styles.gridItem}>
              <FeatureCard
                feature={feature}
                progress={feature.progress}
                onPress={() => onNavigate(feature.route)}
              />
            </View>
          ))}
        </View>
      </Animated.View>
    );
  }
);

HomeFeatureSections.displayName = "HomeFeatureSections";

export default HomeFeatureSections;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    listSection: {
      marginTop: theme.spacing.xl,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    gridItem: {
      width: "48%",
      marginBottom: theme.spacing.md,
    },
  });


