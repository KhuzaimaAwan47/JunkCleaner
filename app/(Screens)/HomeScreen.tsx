import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Switch } from "react-native";
import { useTheme } from "styled-components/native";
import AdPlaceholder from "../../components/AdPlaceholder";
import CircularStorageIndicator from "../../components/CircularStorageIndicator";
import FeatureCard from "../../components/FeatureCard";
import NeumorphicContainer from "../../components/NeumorphicContainer";
import ScanButton from "../../components/ScanButton";
import { useThemeMode } from "../../context/ThemeContext";
import type { Feature } from "../../dummydata/features";
import { featureCards, storageStats } from "../../dummydata/features";
import { appRoutes } from "../../routes";
import { homeScreenStyles } from "../../styles/screens";

const {
  Screen,
  Scroll,
  Content,
  ThemeToggleRow,
  ThemeToggleTextWrap,
  ThemeToggleLabel,
  ThemeToggleSubtitle,
  IndicatorSection,
  ScoreLabel,
  ScoreStatus,
  FeatureGrid,
  FeatureGridItem,
  RemainingCardWrap,
  ToolsHeader,
  ToolsTitle,
  RemainingGridRow,
  RemainingGridItem,
  RemainingIcon,
  RemainingTextWrap,
  RemainingTitle,
  RemainingSubtitle,
  MoreButton,
  MoreButtonText,
  AdSection,
} = homeScreenStyles;

const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const topFeatures = featureCards.slice(0, 4);
  const remainingFeatures = featureCards.slice(4);
  const remainingRows = React.useMemo(() => {
    const rows: Feature[][] = [];
    for (let i = 0; i < remainingFeatures.length; i += 3) {
      rows.push(remainingFeatures.slice(i, i + 3));
    }
    return rows;
  }, [remainingFeatures]);
  const isDarkMode = mode === "dark";
  const handleNavigate = React.useCallback(
    (route: Feature["route"]) => {
      router.push(route);
    },
    [router],
  );

  return (
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <ThemeToggleRow>
            <ThemeToggleTextWrap>
              <ThemeToggleLabel>{isDarkMode ? "dark mode" : "light mode"}</ThemeToggleLabel>
              <ThemeToggleSubtitle>adjust the interface instantly</ThemeToggleSubtitle>
            </ThemeToggleTextWrap>
            <Switch
              accessibilityLabel="toggle app theme"
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor={isDarkMode ? theme.colors.primary : "#ffffff"}
              trackColor={{
                false: `${theme.colors.surfaceAlt}aa`,
                true: `${theme.colors.primary}55`,
              }}
            />
          </ThemeToggleRow>
          <IndicatorSection>
            <CircularStorageIndicator total={storageStats.total} used={storageStats.used} />
            <ScoreLabel>your system is in good condition</ScoreLabel>
            <ScoreStatus>{`${storageStats.used} GB used / ${storageStats.total} GB`}</ScoreStatus>
            <ScanButton
              onPress={() => router.push(appRoutes.smartClean)}
              label="optimize"
              style={{ marginTop: theme.spacing.lg, width: "100%" }}
            />
          </IndicatorSection>
          <FeatureGrid>
            {topFeatures.map((feature) => (
              <FeatureGridItem key={feature.id}>
                <FeatureCard feature={feature} onPress={() => handleNavigate(feature.route)} />
              </FeatureGridItem>
            ))}
          </FeatureGrid>
          <RemainingCardWrap>
            <ToolsHeader>
              <ToolsTitle>tools</ToolsTitle>
              <MoreButton onPress={() => router.push(appRoutes.storageDashboard)}>
                <MoreButtonText>more</MoreButtonText>
              </MoreButton>
            </ToolsHeader>
            <NeumorphicContainer style={{ paddingBottom: theme.spacing.lg }}>
              {remainingRows.map((row, rowIndex) => (
                <RemainingGridRow key={`remaining-row-${rowIndex}`}>
                  {row.map((feature) => (
                    <RemainingGridItem
                      key={feature.id}
                      accessibilityRole="button"
                      accessibilityLabel={`open ${feature.title}`}
                      activeOpacity={0.8}
                      onPress={() => handleNavigate(feature.route)}
                    >
                      <RemainingIcon accent={feature.accent}>
                        <MaterialCommunityIcons
                          name={feature.icon as any}
                          size={22}
                          color={feature.accent}
                        />
                      </RemainingIcon>
                      <RemainingTextWrap>
                        <RemainingTitle numberOfLines={1}>{feature.title}</RemainingTitle>
                        <RemainingSubtitle numberOfLines={1}>{feature.subtitle}</RemainingSubtitle>
                      </RemainingTextWrap>
                    </RemainingGridItem>
                  ))}
                </RemainingGridRow>
              ))}
            </NeumorphicContainer>
          </RemainingCardWrap>
          <AdSection>
            <AdPlaceholder />
          </AdSection>
        </Content>
      </Scroll>
    </Screen>
  );
};

export default HomeScreen;
