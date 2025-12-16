import React from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { DefaultTheme, useTheme } from "styled-components/native";

type Props = {
  children: [React.ReactNode, React.ReactNode];
};

const SwipeableCardContainer: React.FC<Props> = ({ children }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const containerWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    containerWidth.value = width;
    translateX.value = withSpring(currentIndex.value * -width);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (containerWidth.value === 0) return;
      const baseTranslate = currentIndex.value * -containerWidth.value;
      const newTranslateX = baseTranslate + e.translationX;
      // Clamp between 0 and -containerWidth
      translateX.value = Math.max(-containerWidth.value, Math.min(0, newTranslateX));
    })
    .onEnd((e) => {
      if (containerWidth.value === 0) return;
      const threshold = containerWidth.value * 0.3;
      const shouldSwipeLeft = e.translationX < -threshold;
      const shouldSwipeRight = e.translationX > threshold;

      if (shouldSwipeLeft && currentIndex.value < 1) {
        currentIndex.value = 1;
        translateX.value = withSpring(-containerWidth.value);
        runOnJS(setActiveIndex)(1);
      } else if (shouldSwipeRight && currentIndex.value > 0) {
        currentIndex.value = 0;
        translateX.value = withSpring(0);
        runOnJS(setActiveIndex)(0);
      } else {
        translateX.value = withSpring(currentIndex.value * -containerWidth.value);
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Card style doesn't need to be animated - it's always 50% of wrapper (which is 200% of container)
  // So each card is effectively 100% of container width

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, containerStyle]}>
          <View style={styles.card}>
            {children[0]}
          </View>
          <View style={styles.card}>
            {children[1]}
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.indicators}>
        <View style={[styles.dot, activeIndex === 0 && styles.activeDot]} />
        <View style={[styles.dot, activeIndex === 1 && styles.activeDot]} />
      </View>
    </View>
  );
};

export default SwipeableCardContainer;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      overflow: "hidden",
    },
    cardWrapper: {
      flexDirection: "row",
      width: "200%",
    },
    card: {
      width: "50%",
    },
    indicators: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: `${theme.colors.textMuted}55`,
    },
    activeDot: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
  });

