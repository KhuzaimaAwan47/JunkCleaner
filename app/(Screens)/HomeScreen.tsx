import { useRouter } from "expo-router";
import React from "react";
import styledNative, { DefaultTheme } from "styled-components/native";
import AdPlaceholder from "../../components/AdPlaceholder";
import AppHeader from "../../components/AppHeader";
import BottomNavBar from "../../components/BottomNavBar";
import CircularStorageIndicator from "../../components/CircularStorageIndicator";
import FeatureCard from "../../components/FeatureCard";
import ResultStatCard from "../../components/ResultStatCard";
import ScanButton from "../../components/ScanButton";
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

const Row = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const HomeScreen = () => {
  const router = useRouter();

  return (
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <AppHeader
            title="ai junk cleaner"
            subtitle="boost device freshness"
            onRightPress={() => router.push(appRoutes.reminder)}
          />
          <CircularStorageIndicator total={storageStats.total} used={storageStats.used} />
          <Row>
            <ResultStatCard label="System" value={`${storageStats.system} GB`} />
            <ResultStatCard label="Junk" value={`${storageStats.junk} GB`} accent="#FF7A80" />
          </Row>
          {featureCards.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onPress={() => router.push(feature.route as any)}
            />
          ))}
          <ScanButton onPress={() => router.push(appRoutes.smartClean)} />
          <AdPlaceholder />
        </Content>
      </Scroll>
      <BottomNavBar />
    </Screen>
  );
};

export default HomeScreen;
