import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import ScanActionButton from "./ScanActionButton";

type UnusedAppsEmptyStateProps = {
  hasScanned: boolean;
  onScan: () => void;
};

const UnusedAppsEmptyState: React.FC<UnusedAppsEmptyStateProps> = ({
  hasScanned,
  onScan,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="application-outline"
        size={48}
        color={theme.colors.textMuted}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>
        {hasScanned ? "no unused apps found" : "run a scan to find unused apps"}
      </Text>
      {!hasScanned && <ScanActionButton label="start scan" onPress={onScan} />}
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    emptyIcon: {
      opacity: 0.5,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },
  });

export default UnusedAppsEmptyState;

