import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type FilterChipsProps<T extends string> = {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  renderLabel?: (value: T) => string;
  scrollable?: boolean;
};

function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
  renderLabel,
  scrollable = true,
}: FilterChipsProps<T>) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const content = (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(option)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {renderLabel ? renderLabel(option) : option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {content}
      </ScrollView>
    );
  }

  return content;
}

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: theme.spacing.md,
    },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.lg,
    },
    chipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipLabel: {
      color: theme.colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    chipLabelSelected: {
      color: theme.colors.white,
    },
  });

export default FilterChips;

