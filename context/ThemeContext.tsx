import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import type { DefaultTheme } from "styled-components/native";
import { ThemeProvider } from "styled-components/native";
import { darkTheme, lightTheme } from "../theme/theme";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: DefaultTheme;
};

const ThemeModeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeModeProviderProps = {
  children: React.ReactNode;
};

export const ThemeModeProvider: React.FC<ThemeModeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemColorScheme === "dark" ? "dark" : "light");

  // Update theme when system color scheme changes
  useEffect(() => {
    if (systemColorScheme) {
      setMode(systemColorScheme === "dark" ? "dark" : "light");
    }
  }, [systemColorScheme]);

  const theme = mode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      mode,
      theme,
    }),
    [mode, theme],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
};

