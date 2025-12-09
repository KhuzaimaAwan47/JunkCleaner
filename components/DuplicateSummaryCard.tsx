import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import ScanActionButton from './ScanActionButton';

interface DuplicateSummaryCardProps {
  isCancelled: boolean;
  scannedCount: number;
  totalScanned: number;
  onRescan: () => void;
}

export default function DuplicateSummaryCard({
  isCancelled,
  scannedCount,
  totalScanned,
  onRescan,
}: DuplicateSummaryCardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      {isCancelled ? (
        <>
          <Text style={styles.title}>scan cancelled</Text>
          <Text style={styles.text}>scanned {scannedCount} files before cancellation.</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>no duplicates found</Text>
          <Text style={styles.text}>scanned {totalScanned} files. all files are unique.</Text>
        </>
      )}
      <ScanActionButton label="rescan" onPress={onRescan} variant="outline" style={styles.rescanButton} />
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
      gap: theme.spacing.xs,
      shadowColor: theme.mode === 'dark' ? '#000000' : 'rgba(0,0,0,0.08)',
      shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: 'capitalize',
    },
    text: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    rescanButton: {
      marginTop: theme.spacing.md,
      alignSelf: 'flex-start',
    },
  });

