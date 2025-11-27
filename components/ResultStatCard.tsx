import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  label: string;
  value: string;
  accent?: string;
};

const ResultStatCard: React.FC<Props> = ({ label, value, accent }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <NeumorphicContainer padding={18} glass>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent ?? theme.colors.text }]}>{value}</Text>
    </NeumorphicContainer>
  );
};

export default ResultStatCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    label: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    value: {
      marginTop: 6,
      fontSize: 22,
      fontWeight: "700",
    },
  });
