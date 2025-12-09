import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import ScanActionButton from "../../../components/ScanActionButton";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { appRoutes } from "../../../routes";

const slides = [
  {
    title: "ai-powered junk radar",
    description: "hunt cache, logs, and temp clutter with a single tap",
    icon: "radar",
  },
  {
    title: "visual storage pulse",
    description: "understand space usage through smooth glassy visuals",
    icon: "chart-areaspline",
  },
  {
    title: "clean smarter, not harder",
    description: "automation-ready routines keep your phone spotless",
    icon: "robot-happy",
  },
];

const OnboardingScreen = () => {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<typeof slides[0]>>(null);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.min(
      slides.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)),
    );
    setActiveIndex(newIndex);
  };

  const handleGetStarted = () => router.replace(appRoutes.home);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.slidesArea}>
          <FlatList
            ref={flatListRef}
            data={slides}
            keyExtractor={(item) => item.title}
            renderItem={({ item }) => (
              <View style={[styles.slideWrapper, { width }]}>
                <View style={styles.iconHalo}>
                  <View style={styles.iconBubble}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={100}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            onMomentumScrollEnd={handleMomentumEnd}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            contentContainerStyle={styles.slidesContent}
          />
        </View>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  flatListRef.current?.scrollToOffset({ offset: width * index, animated: true });
                  setActiveIndex(index);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${index + 1}`}
                style={styles.dotButton}
              >
                <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
          <ScanActionButton
            label="get started"
            onPress={handleGetStarted}
            fullWidth
            leadingIcon={
              <MaterialCommunityIcons name="arrow-right" size={20} color={theme.colors.white} />
            }
          />
        </View>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default OnboardingScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    slidesArea: {
      flex: 1,
    },
    slidesContent: {
      flexGrow: 1,
    },
    slideWrapper: {
      padding: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    iconHalo: {
      width: 260,
      height: 260,
      borderRadius: 130,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}11`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}33`,
    },
    iconBubble: {
      width: 210,
      height: 210,
      borderRadius: 105,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      shadowColor: theme.mode === "dark" ? "#000000" : "#000",
      shadowOpacity: theme.mode === "dark" ? 0.3 : 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: theme.fontWeight.bold,
      textAlign: "center",
      color: theme.colors.text,
      marginTop: 24,
      textTransform: "capitalize",
    },
    description: {
      fontSize: theme.fontSize.md,
      textAlign: "center",
      color: theme.colors.textMuted,
      marginTop: 12,
    },
    footer: {
      paddingTop: theme.spacing.lg,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    dotButton: {
      padding: theme.spacing.xs / 2,
      marginHorizontal: theme.spacing.xs / 2,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: `${theme.colors.surfaceAlt}66`,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
      width: 28,
    },
    buttonIcon: {
      marginLeft: theme.spacing.sm,
    },
  });
