import React from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import CircularLoadingIndicator from "./CircularLoadingIndicator";
import type { SmartScanProgress } from "../utils/smartScan";
import type { SystemHealthResult } from "../utils/systemHealth";

type Props = {
  systemHealth: SystemHealthResult | null;
  scanProgress: SmartScanProgress | null;
  size?: number;
};

const SystemHealthCard: React.FC<Props> = ({ systemHealth, scanProgress, size = 200 }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Always render - CircularLoadingIndicator handles the display logic
  // It shows scan progress when scanning, system health when not scanning
  return (
    <View style={styles.card}>
      <CircularLoadingIndicator
        scanProgress={scanProgress}
        systemHealth={systemHealth}
        size={size}
      />
    </View>
  );
};

export default SystemHealthCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minHeight: 200,
    },
  });

