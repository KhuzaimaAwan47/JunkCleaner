import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeModeProvider, useThemeMode } from "../context/ThemeContext";
import { ScannerProvider } from "./(Screens)/DuplicateImagesScreen/DuplicateImageScanner";

const LayoutContent = () => {
  const { theme, mode } = useThemeMode();

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </SafeAreaProvider>
  );
};

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider initialMode={scheme === "dark" ? "dark" : "light"}>
        <ScannerProvider>
          <LayoutContent />
        </ScannerProvider>
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}
