import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, useTheme } from 'styled-components/native';

type SelectionState = 'all' | 'partial' | 'none';

interface DuplicateFilterBarProps {
  selectionState: SelectionState;
  selectAllActionLabel: string;
  selectAllHint: string;
  selectAllDisabled: boolean;
  smartFiltering: boolean;
  onSelectAll: () => void;
  onSmartFilterToggle: (value: boolean) => void;
}

export default function DuplicateFilterBar({
  selectionState,
  selectAllActionLabel,
  selectAllHint,
  selectAllDisabled,
  smartFiltering,
  onSelectAll,
  onSmartFilterToggle,
}: DuplicateFilterBarProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={onSelectAll}
          disabled={selectAllDisabled}
          activeOpacity={selectAllDisabled ? 1 : 0.85}
          style={[styles.filterButton, selectAllDisabled && styles.filterButtonDisabled]}
        >
          <View
            style={[
              styles.selectIndicator,
              selectionState === 'all' && styles.selectIndicatorAll,
              selectionState === 'partial' && styles.selectIndicatorPartial,
            ]}
          >
            {selectionState === 'all' ? (
              <MaterialCommunityIcons name="check" size={14} color={theme.colors.white} />
            ) : (
              <View
                style={[
                  styles.selectIndicatorInner,
                  selectionState === 'partial' && styles.selectIndicatorInnerPartial,
                ]}
              />
            )}
          </View>
          <View style={styles.filterText}>
            <Text style={styles.filterLabel}>{selectAllActionLabel}</Text>
            <Text style={styles.filterHint}>{selectAllHint}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.smartFilterCard}>
          <View style={styles.smartFilterText}>
            <Text style={styles.smartFilterLabel}>smart filtering</Text>
          </View>
          <Switch
            value={smartFiltering}
            onValueChange={onSmartFilterToggle}
            trackColor={{ false: `${theme.colors.surfaceAlt}55`, true: `${theme.colors.primary}55` }}
            thumbColor={theme.colors.primary}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
      zIndex: 10,
    },
    filterRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    smartFilterCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
    },
    smartFilterText: {
      flex: 1,
      marginRight: theme.spacing.xs,
    },
    smartFilterLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}77` : `${theme.colors.surfaceAlt}55`,
    },
    filterButtonDisabled: {
      opacity: 0.5,
    },
    selectIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: `${theme.colors.primary}66`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
    },
    selectIndicatorAll: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    selectIndicatorPartial: {
      borderColor: `${theme.colors.primary}aa`,
    },
    selectIndicatorInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: `${theme.colors.primary}66`,
    },
    selectIndicatorInnerPartial: {
      width: 10,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.primary,
    },
    filterText: {
      flex: 1,
    },
    filterLabel: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      textTransform: 'capitalize',
    },
    filterHint: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.xs,
      marginTop: 1,
    },
  });

