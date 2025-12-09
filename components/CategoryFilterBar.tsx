import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type CategoryFilterBarProps = {
  categories: string[];
  activeCategory: string;
  counts: Record<string, number>;
  onCategoryChange: (category: string) => void;
};

const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  activeCategory,
  counts,
  onCategoryChange,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersScrollContent}
    >
      {categories.map((category) => {
        const isActive = category === activeCategory;
        const countLabel = counts[category] ?? 0;
        return (
          <TouchableOpacity
            key={category}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onCategoryChange(category)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {category.toLowerCase()} · {countLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    filtersScrollContent: {
      paddingRight: theme.spacing.lg,
    },
    filterChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}55`,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.xs,
    },
    filterChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}22`,
    },
    filterChipText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    filterChipTextActive: {
      color: theme.colors.primary,
    },
  });

export default CategoryFilterBar;

