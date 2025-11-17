import React, { ReactNode, useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: ReactNode;
  glass?: boolean;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const Base = styled.Pressable<{ glass?: boolean; padding?: number }>`
  border-radius: ${({ theme }) => theme.radii.xl}px;
  padding: ${({ padding, theme }) => padding ?? theme.spacing.lg}px;
  background-color: ${({ glass, theme }) =>
    glass ? 'rgba(255,255,255,0.08)' : theme.colors.surface};
  border-width: ${({ glass }) => (glass ? 1 : 0)}px;
  border-color: rgba(255, 255, 255, 0.14);
  overflow: hidden;
`;

const GlassOverlay = styled(LinearGradient)`
  flex: 1;
  border-radius: ${({ theme }) => theme.radii.xl}px;
`;

const Content = styled.View`
  flex: 1;
`;

const NeumorphicContainer: React.FC<Props> = ({
  children,
  glass,
  padding,
  onPress,
  style,
}) => {
  const theme = useTheme();
  const shadowStyle = useMemo(
    () => ({
      shadowColor: theme.mode === 'dark' ? '#05070E' : '#AAB6DA',
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: glass ? 0.3 : 0.45,
      shadowRadius: glass ? 18 : 24,
      elevation: glass ? 8 : 14,
    }),
    [glass, theme.mode],
  );

  const gradientColors =
    theme.mode === 'dark'
      ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']
      : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)'];

  return (
    <Base
      padding={padding}
      glass={glass}
      onPress={onPress}
      disabled={!onPress}
      style={[shadowStyle, style]}
    >
      {glass ? (
        <GlassOverlay colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Content>{children}</Content>
        </GlassOverlay>
      ) : (
        <Content>{children}</Content>
      )}
    </Base>
  );
};

export default NeumorphicContainer;
