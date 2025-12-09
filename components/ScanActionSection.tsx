import React from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import ScanActionButton from "./ScanActionButton";
import ScanProgressCard from "./ScanProgressCard";

type ScanActionSectionProps = {
  loading: boolean;
  hasSavedResults: boolean;
  label: string;
  onScan: () => void;
  loadingTitle?: string;
  loadingSubtitle?: string;
};

const ScanActionSection: React.FC<ScanActionSectionProps> = ({
  loading,
  hasSavedResults,
  label,
  onScan,
  loadingTitle = "Scanning...",
  loadingSubtitle,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (hasSavedResults) return null;

  return (
    <View style={styles.actionsRow}>
      {loading ? (
        <ScanProgressCard title={loadingTitle} subtitle={loadingSubtitle} />
      ) : (
        <ScanActionButton label={label} onPress={onScan} fullWidth />
      )}
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });

export default ScanActionSection;

