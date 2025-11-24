import React from "react";
import { useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ResultStatCard from "../../../components/ResultStatCard";
import { storageStats } from "../../../dummydata/features";
import { storageDashboardStyles } from "../../../styles/GlobalStyles";

const { Container, Screen, Bars, Bar, Recommendations, Recommendation, Grid, Half } =
  storageDashboardStyles;

const StorageDashboardScreen = () => {
  const theme = useTheme();

  return (
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
            <ResultStatCard label="Used" value={`${storageStats.used} GB`} accent={theme.colors.primary} />
          </Half>
        </Grid>
        <Grid>
          <Half>
            <ResultStatCard label="System" value={`${storageStats.system} GB`} />
          </Half>
          <Half>
            <ResultStatCard label="Junk" value={`${storageStats.junk} GB`} accent={theme.colors.accent} />
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
};

export default StorageDashboardScreen;
