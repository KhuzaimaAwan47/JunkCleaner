import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeModeProvider, useThemeMode } from "../context/ThemeContext";
import { persistor, store } from "../redux-code/store";
import { ScannerProvider } from "./(Screens)/DuplicateImagesScreen/DuplicateImageScanner";

const LayoutContent = () => {
  const { theme, mode } = useThemeMode();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeModeProvider>
            <ScannerProvider>
              <LayoutContent />
            </ScannerProvider>
          </ThemeModeProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
