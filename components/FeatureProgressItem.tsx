import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import DebouncedTouchableOpacity from "./DebouncedTouchableOpacity";

type Props = {
  feature: Feature;
  progress: number;
  onPress: () => void;
};

const FeatureProgressItem = React.memo<Props>(({ feature, progress, onPress }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const progressAnimated = useSharedValue(0);

  React.useEffect(() => {
    progressAnimated.value = withTiming(progress, { duration: 500 });
  }, [progress, progressAnimated]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimated.value * 100}%`,
  }));

  return (
    <DebouncedTouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`open ${feature.title}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.remainingGridItem}
    >
      <View style={[styles.remainingIcon, { backgroundColor: `${feature.accent}22` }]}>
        <MaterialCommunityIcons name={feature.icon as any} size={22} color={feature.accent} />
      </View>
      <View style={styles.remainingTextWrap}>
        <Text style={styles.remainingTitle} numberOfLines={1}>
          {feature.title}
        </Text>
        <Text style={styles.remainingSubtitle} numberOfLines={1}>
          {feature.subtitle}
        </Text>
        {progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarTrack, { backgroundColor: `${feature.accent}22` }]}>
              <Animated.View
                style={[styles.progressBarFill, { backgroundColor: feature.accent }, progressStyle]}
              />
            </View>
          </View>
        )}
      </View>
    </DebouncedTouchableOpacity>
  );
});

FeatureProgressItem.displayName = "FeatureProgressItem";

export default FeatureProgressItem;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    remainingGridItem: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    remainingIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    remainingTextWrap: {
      flex: 1,
      alignItems: "flex-start",
    },
    remainingTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    remainingSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginTop: 2,
    },
    progressBarContainer: {
      marginTop: theme.spacing.xs,
      width: "100%",
    },
    progressBarTrack: {
      width: "100%",
      height: 4,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
  });

