import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { FlatList, ViewToken } from "react-native";
import styled, { DefaultTheme } from "styled-components/native";
import { appRoutes } from "../../routes";

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const SlideWrapper = styled.View`
  width: 100%;
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
  align-items: center;
`;

const Title = styled.Text`
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  margin-top: 24px;
`;

const Description = styled.Text`
  font-size: 15px;
  text-align: center;
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  margin-top: 12px;
`;

const IconBubble = styled.View`
  width: 220px;
  height: 220px;
  border-radius: 110px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
`;

const Footer = styled.View`
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Dots = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Dot = styled.View<{ active: boolean }>`
  width: ${({ active }: { active: boolean }) => (active ? 32 : 10)}px;
  height: 10px;
  border-radius: 5px;
  margin: 0 4px;
  background-color: ${({ active, theme }: { active: boolean; theme: DefaultTheme }) =>
    active ? theme.colors.primary : `${theme.colors.surfaceAlt}aa`};
`;

const PrimaryButton = styled.Pressable`
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.secondary};
  padding: 16px;
  border-radius: 24px;
  align-items: center;
`;

const ButtonLabel = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 16px;
`;

const slides = [
  {
    title: "ai-powered junk radar",
    description: "hunt cache, logs, and temp clutter with a single tap",
    icon: "radar",
  },
  {
    title: "visual storage pulse",
    description: "understand space usage through smooth glassy visuals",
    icon: "chart-areaspline",
  },
  {
    title: "clean smarter, not harder",
    description: "automation-ready routines keep your phone spotless",
    icon: "robot-happy",
  },
];

const OnboardingScreen = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems?.length) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  });

  const handleGetStarted = () => router.replace(appRoutes.home);

  return (
    <Container>
      <FlatList
        data={slides}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <SlideWrapper>
            <IconBubble>
              <MaterialCommunityIcons name={item.icon as any} size={90} color="#6C63FF" />
            </IconBubble>
            <Title>{item.title}</Title>
            <Description>{item.description}</Description>
          </SlideWrapper>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
      />
      <Footer>
        <Dots>
          {slides.map((_, index) => (
            <Dot key={index} active={index === activeIndex} />
          ))}
        </Dots>
        <PrimaryButton onPress={handleGetStarted}>
          <ButtonLabel>Get Started</ButtonLabel>
        </PrimaryButton>
      </Footer>
    </Container>
  );
};

export default OnboardingScreen;
