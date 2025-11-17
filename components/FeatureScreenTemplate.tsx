import React from "react";
import styled from "styled-components/native";
import { MotiView } from "moti";
import AppHeader from "./AppHeader";
import NeumorphicContainer from "./NeumorphicContainer";
import ResultStatCard from "./ResultStatCard";
import ScanButton from "./ScanButton";
import AdPlaceholder from "./AdPlaceholder";

const Wrapper = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Screen = styled.ScrollView`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const ProgressWrap = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

const ProgressBar = styled.View<{ accent: string }>`
  height: 18px;
  border-radius: 20px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}66`};
  overflow: hidden;
`;

const PlaceholderList = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

const PlaceholderRow = styled(NeumorphicContainer)`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

type Props = {
  title: string;
  subtitle: string;
  accent: string;
  statLabel: string;
  statValue: string;
  summaryLines?: string[];
  onScan?: () => void;
};

const FeatureScreenTemplate: React.FC<Props> = ({
  title,
  subtitle,
  accent,
  statLabel,
  statValue,
  summaryLines = ["Quick scan ready", "Safe to clean"],
  onScan,
}) => (
  <Wrapper>
    <Screen showsVerticalScrollIndicator={false}>
      <AppHeader title={title} subtitle={subtitle} />
      <ProgressWrap>
        <NeumorphicContainer padding={20}>
          <ProgressBar accent={accent}>
            <MotiView
              from={{ width: "10%" }}
              animate={{ width: "88%" }}
              transition={{ type: "timing", duration: 1200 }}
              style={{ height: "100%", backgroundColor: accent }}
            />
          </ProgressBar>
        </NeumorphicContainer>
      </ProgressWrap>
      <PlaceholderList>
        {[0, 1, 2].map((index) => (
          <PlaceholderRow key={index} padding={18} glass>
            <AppText>List placeholder {index + 1}</AppText>
          </PlaceholderRow>
        ))}
      </PlaceholderList>
      <ResultStatCard label={statLabel} value={statValue} accent={accent} />
      {summaryLines.map((line) => (
        <SummaryText key={line}>{line}</SummaryText>
      ))}
      <ScanButton label="Scan Now" onPress={onScan} />
      <AdPlaceholder />
    </Screen>
  </Wrapper>
);

const AppText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
`;

const SummaryText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

export default FeatureScreenTemplate;
