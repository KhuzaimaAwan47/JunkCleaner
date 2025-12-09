import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';
import formatTime from '../constants/formatTime';
import ProgressBar from './ProgressBar';

interface DuplicateProgressCardProps {
  elapsedTime: number;
  scannedFiles: number;
  totalFiles: number;
  progress: number;
  currentFile?: string;
  stage?: string;
  onStop: () => void;
}

export default function DuplicateProgressCard({
  elapsedTime,
  scannedFiles,
  totalFiles,
  progress,
  currentFile,
  stage,
  onStop,
}: DuplicateProgressCardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>⏱️ {formatTime(elapsedTime)}</Text>
        {scannedFiles > 0 && (
          <Text style={styles.fileCountText}>
            {scannedFiles.toLocaleString()} / {totalFiles > 0 ? totalFiles.toLocaleString() : '?'} files
          </Text>
        )}
      </View>
      <ProgressBar progress={progress} currentFile={currentFile} stage={stage} />
      <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.8}>
        <Text style={styles.stopButtonText}>stop</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}66` : `${theme.colors.surfaceAlt}44`,
      gap: theme.spacing.md,
    },
    timerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timerText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    fileCountText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    stopButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    stopButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'uppercase',
    },
  });

