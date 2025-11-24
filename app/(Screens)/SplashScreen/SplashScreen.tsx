import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect } from "react";
import { useTheme } from "styled-components/native";
import { appRoutes } from "../../../routes";
import { splashScreenStyles } from "../../../styles/GlobalStyles";

const { Container, Title, Subtitle, IconRing } = splashScreenStyles;

const SplashScreen = () => {
  const theme = useTheme();
  useEffect(() => {
    const timer = setTimeout(() => router.replace(appRoutes.onboarding), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container>
      <MotiView
        from={{ scale: 0.8, opacity: 0.3 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ loop: true, type: 'timing', duration: 1400 }}
      >
        <IconRing>
          <MaterialCommunityIcons name="robot-excited-outline" size={88} color={theme.colors.primary} />
        </IconRing>
      </MotiView>
      <Title>ai junk cleaner</Title>
      <Subtitle>digitally spotless in seconds</Subtitle>
    </Container>
  );
};

export default SplashScreen;
