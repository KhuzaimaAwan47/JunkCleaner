import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import styledNative, { DefaultTheme } from "styled-components/native";
import { appRoutes } from "../../routes";

const Container = styledNative(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const Title = styledNative.Text`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-top: 24px;
`;

const Subtitle = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  margin-top: 8px;
  letter-spacing: 2px;
`;

const IconRing = styledNative.View`
  width: 180px;
  height: 180px;
  border-radius: 90px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surface}aa`};
  elevation: 18;
`;

const SplashScreen = () => {
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
          <MaterialCommunityIcons name="robot-excited-outline" size={88} color="#6C63FF" />
        </IconRing>
      </MotiView>
      <Title>ai junk cleaner</Title>
      <Subtitle>digitally spotless in seconds</Subtitle>
    </Container>
  );
};

export default SplashScreen;
