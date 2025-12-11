import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import FeatureProgressItem from "./FeatureProgressItem";
import NeumorphicContainer from "./NeumorphicContainer";

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
        <View style={styles.listStack}>
          {featuresWithProgress.map((feature, index) => (
            <NeumorphicContainer
              key={feature.id}
              style={[
                styles.listItemCard,
                index === 0 && styles.listItemFirst,
                index === featuresWithProgress.length - 1 && styles.listItemLast,
              ]}
              padding={theme.spacing.md}
            >
              <FeatureProgressItem
                feature={feature}
                progress={feature.progress}
                onPress={() => onNavigate(feature.route)}
              />
            </NeumorphicContainer>
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
    listStack: {
      gap: theme.spacing.md,
    },
    listItemCard: {
      paddingVertical: theme.spacing.sm,
    },
    listItemFirst: {
      marginTop: 0,
    },
    listItemLast: {
      marginBottom: 0,
    },
  });


