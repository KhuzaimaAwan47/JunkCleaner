import React, { ReactElement, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    ListRenderItem,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";

type ThemedListProps<T> = {
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  emptyText?: string;
  contentStyle?: ViewStyle;
  listFooter?: ReactElement | null;
  showsVerticalScrollIndicator?: boolean;
};

function ThemedList<T>({
  data,
  keyExtractor,
  renderItem,
  title,
  subtitle,
  loading,
  emptyText = "no records yet",
  contentStyle,
  listFooter,
  showsVerticalScrollIndicator = false,
}: ThemedListProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEmpty = !loading && data.length === 0;

  return (
    <View style={[styles.container, contentStyle]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>scanning...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          ListFooterComponent={listFooter}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

export default ThemedList;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.surfaceAlt}44`,
    },
    header: {
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      textTransform: "capitalize",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      marginTop: 2,
    },
    loadingState: {
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      textAlign: "center",
    },
    listContent: {
      paddingBottom: theme.spacing.sm,
    },
    separator: {
      height: 1,
      backgroundColor: `${theme.colors.surfaceAlt}44`,
      marginVertical: theme.spacing.sm,
    },
  });

