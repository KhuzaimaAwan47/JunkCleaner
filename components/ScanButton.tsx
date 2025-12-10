import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, Text, ViewStyle } from "react-native";
import { useTheme } from "styled-components/native";
import DebouncedTouchableOpacity from "./DebouncedTouchableOpacity";

type Props = {
  label?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: string;
};

const staticButtonStyle: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
};

const staticLabelStyle = (theme: ReturnType<typeof useTheme>) => ({
  color: theme.colors.white,
  fontSize: 18,
  fontWeight: "600" as const,
  marginLeft: 10,
});

const ScanButton: React.FC<Props> = ({
  label = "Clean Now",
  style,
  onPress,
  disabled,
  accessibilityRole = "button",
  ...rest
}) => {
  const theme = useTheme();

  return (
    <DebouncedTouchableOpacity
      accessibilityRole={accessibilityRole}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[
        staticButtonStyle,
        {
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.primary,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.md,
          opacity: disabled ? 0.65 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <MaterialCommunityIcons name="lightning-bolt" size={24} color={theme.colors.white} />
      <Text style={staticLabelStyle(theme)}>{label}</Text>
    </DebouncedTouchableOpacity>
  );
};

export default ScanButton;
