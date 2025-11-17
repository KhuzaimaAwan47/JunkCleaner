import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { PressableProps } from "react-native";
import styled, { DefaultTheme, useTheme } from "styled-components/native";

const Container = styled.View`
  width: 100%;
  padding-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const TitleContent = styled.View`
  flex: 1;
  margin-left: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
`;

const Heading = styled.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 700;
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

const AppHeader: React.FC<Props> = ({
  title,
  subtitle: _subtitle,
  rightIcon = "chevron-left",
  onRightPress,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const fallbackPress = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const pressHandler = onRightPress ?? (router.canGoBack() ? fallbackPress : undefined);
  const isInteractive = Boolean(pressHandler);

  return (
    <Container>
      <TitleRow>
        <IconButton
          onPress={pressHandler}
          disabled={!isInteractive}
          hitSlop={12}
          style={{ opacity: isInteractive ? 1 : 0.4 }}
          accessibilityRole="button"
          accessibilityLabel="navigate back"
          accessibilityState={{ disabled: !isInteractive }}
        >
          <MaterialCommunityIcons
            name={rightIcon as any}
            size={28}
            color={theme.mode === "dark" ? theme.colors.text : theme.colors.primary}
          />
        </IconButton>
        <TitleContent>
          <Heading>{title}</Heading>
        </TitleContent>
      </TitleRow>
    </Container>
  );
};

export default AppHeader;
