import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { PressableProps } from "react-native";
import styled, { DefaultTheme, useTheme } from "styled-components/native";

const Container = styled.View`
  padding: ${({ theme }: { theme: DefaultTheme }) =>
    `${theme.spacing.lg}px ${theme.spacing.lg}px 0`};
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Heading = styled.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  font-size: 28px;
  font-weight: 700;
`;

const Subtitle = styled.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  font-size: 15px;
  margin-top: 6px;
`;

const IconButton = styled.Pressable`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}99`};
`;

type Props = {
  title: string;
  subtitle?: string;
  rightIcon?: string;
  onRightPress?: PressableProps["onPress"];
};

const AppHeader: React.FC<Props> = ({ title, subtitle, rightIcon = "bell-outline", onRightPress }) => {
  const theme = useTheme();

  return (
    <Container>
      <TitleRow>
        <Heading>{title}</Heading>
        <IconButton onPress={onRightPress} hitSlop={12}>
          <MaterialCommunityIcons
            name={rightIcon as any}
            size={24}
            color={theme.mode === "dark" ? theme.colors.text : theme.colors.primary}
          />
        </IconButton>
      </TitleRow>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
    </Container>
  );
};

export default AppHeader;
