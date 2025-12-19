import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";
import CircularStorageIndicator from "./CircularStorageIndicator";

type Props = {
  storageInfo: {
    total: number;
    used: number;
    free: number;
  } | null;
  size?: number;
};

const StorageIndicatorCard: React.FC<Props> = ({ storageInfo, size = 200 }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  // Animation values for text - only animate when data appears
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.9);
  const textTranslateY = useSharedValue(8);
  const prevHasData = React.useRef(false);
  const hasData = storageInfo && storageInfo.total > 0;
  
  useEffect(() => {
    // Only animate when transitioning from no data to having data
    if (hasData && !prevHasData.current) {
      textOpacity.value = 0;
      textScale.value = 0.9;
      textTranslateY.value = 8;
      
      textOpacity.value = withTiming(1, { 
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      textScale.value = withTiming(1, { 
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      textTranslateY.value = withTiming(0, { 
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      
      prevHasData.current = true;
    } else if (!hasData) {
      prevHasData.current = false;
      textOpacity.value = 1;
      textScale.value = 1;
      textTranslateY.value = 0;
    }
  }, [hasData, textOpacity, textScale, textTranslateY]);
  
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { scale: textScale.value },
      { translateY: textTranslateY.value },
    ],
  }));

  // Always render, show placeholder if no data
  if (!storageInfo || storageInfo.total === 0) {
    return (
      <View style={styles.card}>
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Animated.Text style={styles.placeholderText}>Storage</Animated.Text>
          <Animated.Text style={styles.placeholderSubtext}>Loading...</Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <CircularStorageIndicator
        total={storageInfo.total}
        used={storageInfo.used}
        size={size}
        label="Used"
        animatedStyle={animatedTextStyle}
      />
    </View>
  );
};

export default StorageIndicatorCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    placeholderSubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
  });

