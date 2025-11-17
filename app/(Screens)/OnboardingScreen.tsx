import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions } from "react-native";
import { useTheme } from "styled-components/native";
import { appRoutes } from "../../routes";
import { onboardingScreenStyles } from "../../styles/screens";

const {
  Container,
  SlidesArea,
  SlideWrapper,
  Title,
  Description,
  IconHalo,
  IconBubble,
  Footer,
  Dots,
  DotButton,
  Dot,
  PrimaryButton,
  ButtonLabel,
} = onboardingScreenStyles;

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
