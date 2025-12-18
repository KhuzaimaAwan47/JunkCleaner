import React from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import CategoryFilterBar from "./CategoryFilterBar";

type FilterContainerProps = {
  categories: string[];
  activeCategory: string;
  counts: Record<string, number>;
  onCategoryChange: (category: string) => void;
  loading: boolean;
  hasSavedResults: boolean;
};

const FilterContainer: React.FC<FilterContainerProps> = ({
  categories,
  activeCategory,
  counts,
  onCategoryChange,
  loading,
  hasSavedResults,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.stickyFilterContainer}>
      <CategoryFilterBar
        categories={categories}
        activeCategory={activeCategory}
        counts={counts}
        onCategoryChange={onCategoryChange}
      />
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    stickyFilterContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
      zIndex: 10,
      gap: theme.spacing.sm,
    },
  });

export default FilterContainer;

