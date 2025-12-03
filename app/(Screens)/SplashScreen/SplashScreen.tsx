import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, useTheme } from "styled-components/native";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { appRoutes } from "../../../routes";

const SplashScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  useEffect(() => {
    const timer = setTimeout(() => router.replace(appRoutes.onboarding), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <MotiView
          from={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ loop: true, type: "timing", duration: 1400 }}
        >
          <View style={styles.iconRing}>
            <MaterialCommunityIcons name="robot-excited-outline" size={88} color={theme.colors.primary} />
          </View>
        </MotiView>
        <Text style={styles.title}>ai junk cleaner</Text>
        <Text style={styles.subtitle}>digitally spotless in seconds</Text>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default SplashScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    iconRing: {
      width: 180,
      height: 180,
      borderRadius: 90,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}44`,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}11`,
      shadowColor: theme.mode === "dark" ? "#000" : "#dfe3f0",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    title: {
      marginTop: theme.spacing.lg,
      fontSize: 28,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      textTransform: "capitalize",
    },
    subtitle: {
      marginTop: theme.spacing.sm,
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
    },
  });
