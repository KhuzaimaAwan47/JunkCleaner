import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  Text,
  ViewStyle,
} from "react-native";
import { useTheme } from "styled-components/native";

type Props = PressableProps & {
  label?: string;
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

const resolveStyle = (
  style: Props["style"],
  state: PressableStateCallbackType,
): StyleProp<ViewStyle> => {
  if (typeof style === "function") {
    return style(state);
  }

  return style;
};

const ScanButton: React.FC<Props> = ({
  label = "Clean Now",
  style,
  ...rest
}) => {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(state) => [
        staticButtonStyle,
        {
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.primary,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.md,
          opacity: state.pressed ? 0.9 : 1,
        },
        resolveStyle(style, state),
      ]}
    >
      <MaterialCommunityIcons name="lightning-bolt" size={24} color={theme.colors.white} />
      <Text style={staticLabelStyle(theme)}>{label}</Text>
    </Pressable>
  );
};

export default ScanButton;
