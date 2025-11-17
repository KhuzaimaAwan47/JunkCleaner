import { MotiView } from "moti";
import React from "react";
import styledNative, { DefaultTheme } from "styled-components/native";
import AdPlaceholder from "./AdPlaceholder";
import AppHeader from "./AppHeader";
import NeumorphicContainer from "./NeumorphicContainer";
import ResultStatCard from "./ResultStatCard";
import ScanButton from "./ScanButton";

type ThemedProps = { theme: DefaultTheme };

const Wrapper = styledNative.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: ThemedProps) => theme.colors.background};
`;

const Screen = styledNative.ScrollView`
  flex: 1;
  padding: ${({ theme }: ThemedProps) => theme.spacing.lg}px;
`;

const ProgressWrap = styledNative.View`
  margin-top: ${({ theme }: ThemedProps) => theme.spacing.lg}px;
`;

const ProgressBar = styledNative.View<{ accent: string }>`
  height: 18px;
  border-radius: 20px;
  background-color: ${({ theme }: ThemedProps) => `${theme.colors.surfaceAlt}66`};
  overflow: hidden;
`;

const PlaceholderList = styledNative.View`
  margin-top: ${({ theme }: ThemedProps) => theme.spacing.lg}px;
`;

const PlaceholderRow = styledNative(NeumorphicContainer)`
  margin-bottom: ${({ theme }: ThemedProps) => theme.spacing.md}px;
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

const AppText = styledNative.Text`
  color: ${({ theme }: ThemedProps) => theme.colors.text};
`;

const SummaryText = styledNative.Text`
  color: ${({ theme }: ThemedProps) => theme.colors.textMuted};
  margin-top: ${({ theme }: ThemedProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: ThemedProps) => theme.spacing.md}px;
`;

export default FeatureScreenTemplate;
