import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  feature: Feature;
  onPress?: () => void;
  progress?: number;
};

const FeatureCard: React.FC<Props> = ({ feature, onPress, progress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const effectiveProgress = Math.max(0, Math.min(1, progress ?? feature.progress ?? 0));
  
  // Detect if subtitle contains results (has file size units or "files")
  const hasResults = useMemo(() => {
    const subtitle = feature.subtitle.toLowerCase();
    return subtitle.includes('gb') || subtitle.includes('mb') || subtitle.includes('kb') || subtitle.includes('files');
  }, [feature.subtitle]);
  
  // Animation values for subtitle - always start from animated state
  const subtitleOpacity = useSharedValue(hasResults ? 0 : 1);
  const subtitleScale = useSharedValue(hasResults ? 0.9 : 1);
  const subtitleTranslateY = useSharedValue(hasResults ? 8 : 0);
  const prevSubtitle = React.useRef<string | null>(null);
  const hasAnimated = React.useRef(false);
  
  useEffect(() => {
    // Animate when subtitle changes and contains results
    if (hasResults) {
      // First time showing results or subtitle changed
      if (!hasAnimated.current || prevSubtitle.current !== feature.subtitle) {
        // Set initial animated state
        subtitleOpacity.value = 0;
        subtitleScale.value = 0.9;
        subtitleTranslateY.value = 8;
        
        // Animate to final state
        subtitleOpacity.value = withTiming(1, { 
          duration: 500,
          easing: Easing.out(Easing.ease),
        });
        subtitleScale.value = withTiming(1, { 
          duration: 500,
          easing: Easing.out(Easing.ease),
        });
        subtitleTranslateY.value = withTiming(0, { 
          duration: 500,
          easing: Easing.out(Easing.ease),
        });
        
        prevSubtitle.current = feature.subtitle;
        hasAnimated.current = true;
      }
    } else {
      // No results - reset to visible state without animation
      if (hasAnimated.current) {
        subtitleOpacity.value = 1;
        subtitleScale.value = 1;
        subtitleTranslateY.value = 0;
        hasAnimated.current = false;
      }
    }
  }, [feature.subtitle, hasResults, subtitleOpacity, subtitleScale, subtitleTranslateY]);
  
  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [
      { scale: subtitleScale.value },
      { translateY: subtitleTranslateY.value },
    ],
  }));

  return (
    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
      <NeumorphicContainer onPress={onPress} padding={20}>
        <View style={styles.cardContent}>
          <View style={[styles.iconWrap, { backgroundColor: `${feature.accent}22` }]}>
            <MaterialCommunityIcons name={feature.icon as any} size={24} color={feature.accent} />
          </View>
          <Animated.Text style={styles.title}>{feature.title}</Animated.Text>
          <Animated.Text style={[styles.subtitle, animatedSubtitleStyle]}>
            {feature.subtitle}
          </Animated.Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${effectiveProgress * 100}%`,
                backgroundColor: feature.accent,
              },
            ]}
          />
        </View>
      </NeumorphicContainer>
    </MotiView>
  );
};

export default FeatureCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    cardContent: {
      alignItems: "center",
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
      textAlign: "center",
    },
    progressBar: {
      width: "100%",
      height: 8,
      borderRadius: 20,
      backgroundColor: `${theme.colors.surfaceAlt}aa`,
      marginTop: theme.spacing.md,
    },
    progressFill: {
      height: "100%",
      borderRadius: 20,
    },
  });
