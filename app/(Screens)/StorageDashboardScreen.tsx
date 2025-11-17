import React from "react";
import styled, { DefaultTheme } from "styled-components/native";
import AppHeader from "../../components/AppHeader";
import NeumorphicContainer from "../../components/NeumorphicContainer";
import ResultStatCard from "../../components/ResultStatCard";
import { storageStats } from "../../dummydata/features";

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const Screen = styled.ScrollView`
  flex: 1;
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Bars = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  height: 160px;
`;

const Bar = styled.View<{ heightPct: number }>`
  width: 18px;
  border-radius: 10px;
  background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}55`};
  height: ${({ heightPct }: { heightPct: number }) => `${heightPct}%`};
`;

const Recommendations = styled.View`
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Recommendation = styled.Text`
  color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
`;

const Grid = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

const Half = styled.View`
  width: 48%;
`;

const StorageDashboardScreen = () => (
  <Container>
    <Screen showsVerticalScrollIndicator={false}>
      <AppHeader title="Storage IQ" subtitle="visual dashboard" />
      <NeumorphicContainer padding={24} glass>
        <Bars>
          {[48, 72, 64, 90, 55, 80].map((height, index) => (
            <Bar key={index} heightPct={height} />
          ))}
        </Bars>
      </NeumorphicContainer>
      <Grid>
        <Half>
          <ResultStatCard label="Total" value={`${storageStats.total} GB`} />
        </Half>
        <Half>
          <ResultStatCard label="Used" value={`${storageStats.used} GB`} accent="#6C63FF" />
        </Half>
      </Grid>
      <Grid>
        <Half>
          <ResultStatCard label="System" value={`${storageStats.system} GB`} />
        </Half>
        <Half>
          <ResultStatCard label="Junk" value={`${storageStats.junk} GB`} accent="#FF7A80" />
        </Half>
      </Grid>
      <Recommendations>
        {storageStats.recommended.map((tip) => (
          <Recommendation key={tip}>- {tip}</Recommendation>
        ))}
      </Recommendations>
    </Screen>
  </Container>
);

export default StorageDashboardScreen;
