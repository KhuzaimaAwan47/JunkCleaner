import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import NeumorphicContainer from "./NeumorphicContainer";

const AdPlaceholder: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <NeumorphicContainer glass padding={18}>
      <Text style={styles.title}>Ad placeholder</Text>
      <Text style={styles.caption}>Your sponsored message fits perfectly here.</Text>
    </NeumorphicContainer>
  );
};

export default AdPlaceholder;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    caption: {
      textAlign: "center",
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    title: {
      textAlign: "center",
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
  });
