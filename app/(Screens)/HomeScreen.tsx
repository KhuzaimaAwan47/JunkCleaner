import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import styledNative, { DefaultTheme, useTheme } from "styled-components/native";
import AdPlaceholder from "../../components/AdPlaceholder";
import AppHeader from "../../components/AppHeader";
import CircularStorageIndicator from "../../components/CircularStorageIndicator";
import FeatureCard from "../../components/FeatureCard";
import NeumorphicContainer from "../../components/NeumorphicContainer";
import ScanButton from "../../components/ScanButton";
import type { Feature } from "../../dummydata/features";
import { featureCards, storageStats } from "../../dummydata/features";
import { appRoutes } from "../../routes";

const Screen = styledNative.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const Scroll = styledNative.ScrollView`
  flex: 1;
`;

const Content = styledNative.View`
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const IndicatorSection = styledNative.View`
  align-items: center;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.xl}px;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
  shadow-color: rgba(0, 0, 0, 0.25);
  shadow-opacity: 0.15;
  shadow-radius: 24px;
  elevation: 12;
`;

const ScoreLabel = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  font-size: 14px;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
`;

const ScoreStatus = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  font-size: 18px;
  font-weight: 600;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
`;

const FeatureGrid = styledNative.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const FeatureGridItem = styledNative.View`
  width: 48%;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
`;

const RemainingCardWrap = styledNative.View`
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
`;

const ToolsHeader = styledNative.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
`;

const ToolsTitle = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const RemainingGridRow = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
`;

const RemainingGridItem = styledNative.View`
  width: 30%;
  align-items: center;
`;

const RemainingIcon = styledNative.View<{ accent: string }>`
  width: 40px;
  height: 40px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background-color: ${({ accent }: { accent: string }) => `${accent}22`};
`;

const RemainingTextWrap = styledNative.View`
  margin-top: ${({ theme }: { theme: DefaultTheme }) => `${theme.spacing.xs / 2}px`};
  align-items: center;
`;

const RemainingTitle = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  font-size: 12px;
  font-weight: 600;
`;

const RemainingSubtitle = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  font-size: 10px;
  margin-top: 2px;
`;

const MoreButton = styledNative.TouchableOpacity`
  align-self: center;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  border-radius: 999px;
  background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}22`};
`;

const MoreButtonText = styledNative.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
`;

const AdSection = styledNative.View`
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const topFeatures = featureCards.slice(0, 4);
  const remainingFeatures = featureCards.slice(4);
  const remainingRows = React.useMemo(() => {
    const rows: Feature[][] = [];
    for (let i = 0; i < remainingFeatures.length; i += 3) {
      rows.push(remainingFeatures.slice(i, i + 3));
    }
    return rows;
  }, [remainingFeatures]);

  return (
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
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
                <FeatureCard feature={feature} onPress={() => router.push(feature.route as any)} />
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
                    <RemainingGridItem key={feature.id}>
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
