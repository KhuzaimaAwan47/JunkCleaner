import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import ScanActionButton from "./ScanActionButton";
import ScanProgressCard from "./ScanProgressCard";

type OldFilesEmptyStateProps = {
  loading: boolean;
  hasFiles: boolean;
  hasSavedResults: boolean;
};

const OldFilesEmptyState: React.FC<OldFilesEmptyStateProps> = ({
  loading,
  hasFiles,
  hasSavedResults,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.emptyCard}>
      {loading ? (
        <ScanProgressCard title="Scanning for old files..." subtitle="Hang tight while we gather results." />
      ) : (
        <>
          <Text style={styles.emptyTitle}>
            {hasFiles ? "no files in this filter" : "ready to scan for old files"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasFiles
              ? "try switching to another category."
              : "pull down to refresh and scan for old files."}
          </Text>
        </>
      )}
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    emptyCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      textAlign: "center",
      fontSize: 13,
    },
  });

export default OldFilesEmptyState;

