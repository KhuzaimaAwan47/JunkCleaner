import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import CircularStorageIndicator from "./CircularStorageIndicator";

type Props = {
  storageInfo: {
    total: number;
    used: number;
    free: number;
  } | null;
  size?: number;
};

const StorageIndicatorCard: React.FC<Props> = ({ storageInfo, size = 200 }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Always render, show placeholder if no data
  if (!storageInfo || storageInfo.total === 0) {
    return (
      <View style={styles.card}>
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Text style={styles.placeholderText}>Storage</Text>
          <Text style={styles.placeholderSubtext}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <CircularStorageIndicator
        total={storageInfo.total}
        used={storageInfo.used}
        size={size}
        label="Used"
      />
    </View>
  );
};

export default StorageIndicatorCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    placeholderSubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
  });

