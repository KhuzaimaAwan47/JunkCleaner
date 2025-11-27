import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  title: string;
  caption?: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
};

const ToggleRow: React.FC<Props> = ({ title, caption, value, onValueChange }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <NeumorphicContainer padding={18}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: `${theme.colors.surfaceAlt}99`, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      </View>
    </NeumorphicContainer>
  );
};

export default ToggleRow;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    textWrap: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    caption: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
  });
