import React from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import DeleteButton from "./DeleteButton";

type FixedDeleteButtonProps = {
  items: number;
  size: number;
  disabled: boolean;
  onPress: () => void;
  visible: boolean;
};

const FixedDeleteButton: React.FC<FixedDeleteButtonProps> = ({
  items,
  size,
  disabled,
  onPress,
  visible,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <View style={styles.fixedDeleteButtonContainer}>
      <DeleteButton items={items} size={size} disabled={disabled} onPress={onPress} />
    </View>
  );
};

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    fixedDeleteButtonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.mode === 'dark' ? `${theme.colors.surfaceAlt}33` : `${theme.colors.surfaceAlt}22`,
    },
  });

export default FixedDeleteButton;

