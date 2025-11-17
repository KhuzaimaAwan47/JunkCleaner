import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions } from "react-native";
// eslint-disable-next-line import/no-named-as-default
import styled, { DefaultTheme, useTheme } from "styled-components/native";
import { appRoutes } from "../../routes";

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const SlidesArea = styled.View`
  flex: 1;
`;

const SlideWrapper = styled.View`
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
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

const IconHalo = styled.View`
  width: 260px;
  height: 260px;
  border-radius: 130px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}11`};
  border-width: 1px;
  border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}33`};
`;

const IconBubble = styled.View`
  width: 210px;
  height: 210px;
  border-radius: 105px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 24px;
  elevation: 12;
`;

const Footer = styled.View`
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Dots = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const DotButton = styled.Pressable`
  padding: 8px 4px;
`;

const Dot = styled.View<{ active: boolean }>`
  width: ${({ active }: { active: boolean }) => (active ? 28 : 10)}px;
  height: 10px;
  border-radius: 5px;
  margin: 0 6px;
  background-color: ${({ active, theme }: { active: boolean; theme: DefaultTheme }) =>
    active ? theme.colors.primary : `${theme.colors.surfaceAlt}66`};
  opacity: ${({ active }: { active: boolean }) => (active ? 1 : 0.6)};
`;

const PrimaryButton = styled.Pressable`
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.secondary};
  padding: 18px;
  border-radius: 24px;
  align-items: center;
  flex-direction: row;
  justify-content: center;
  gap: 8px;
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
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<typeof slides[0]>>(null);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.min(
      slides.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)),
    );
    setActiveIndex(newIndex);
  };

  const handleGetStarted = () => router.replace(appRoutes.home);

  return (
    <Container>
      <SlidesArea>
        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <SlideWrapper style={{ width }}>
              <IconHalo>
                <IconBubble>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={100}
                    color={theme.colors.primary}
                  />
                </IconBubble>
              </IconHalo>
              <Title>{item.title}</Title>
              <Description>{item.description}</Description>
            </SlideWrapper>
          )}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </SlidesArea>
      <Footer>
        <Dots>
          {slides.map((_, index) => (
            <DotButton
              key={index}
              onPress={() => {
                flatListRef.current?.scrollToOffset({ offset: width * index, animated: true });
                setActiveIndex(index);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${index + 1}`}
            >
              <Dot active={index === activeIndex} />
            </DotButton>
          ))}
        </Dots>
        <PrimaryButton onPress={handleGetStarted}>
          <ButtonLabel>get started</ButtonLabel>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
        </PrimaryButton>
      </Footer>
    </Container>
  );
};

export default OnboardingScreen;
