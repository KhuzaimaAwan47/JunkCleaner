import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DefaultTheme } from "styled-components/native";
import { ThemeProvider } from "styled-components/native";
import { darkTheme, lightTheme } from "../theme";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: DefaultTheme;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeModeProviderProps = {
  children: React.ReactNode;
  initialMode?: ThemeMode;
};

export const ThemeModeProvider: React.FC<ThemeModeProviderProps> = ({
  children,
  initialMode = "light",
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const theme = mode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      mode,
      theme,
      toggleTheme,
      setMode,
    }),
    [mode, theme, toggleTheme],
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

