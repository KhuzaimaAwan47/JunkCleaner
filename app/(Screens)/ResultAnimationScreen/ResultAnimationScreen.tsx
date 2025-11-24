import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import type { ComponentProps } from "react";
import React from "react";
import { useTheme } from "styled-components/native";
import ResultStatCard from "../../../components/ResultStatCard";
import ScanButton from "../../../components/ScanButton";
import {
  cleanResultBreakdown,
  cleanResultInsights,
  cleanResultStats,
} from "../../../dummydata/cleanResults";
import { appRoutes } from "../../../routes";
import { resultAnimationStyles } from "../../../styles/GlobalStyles";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const {
  Screen,
  Scroll,
  Content,
  AnimationShell,
  StatusBadge,
  Header,
  Title,
  Subtitle,
  StatsGrid,
  Highlights,
  HighlightCard,
  HighlightIcon,
  HighlightTextWrap,
  HighlightLabel,
  HighlightMeta,
  HighlightValue,
  InsightRow,
  InsightPill,
  InsightLabel,
  InsightValue,
  Label,
} = resultAnimationStyles;

const ResultAnimationScreen = () => {
  const theme = useTheme();

  return (
    <Screen>
      <Scroll contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Content>
          <MotiView
            from={{ scale: 0.85, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ loop: true, type: "timing", duration: 1200 }}
          >
            <AnimationShell>
              <MotiView
                from={{ scale: 0.6, opacity: 0.3 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  loop: true,
                  delay: 200,
                  type: "timing",
                  duration: 1500,
                }}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: `${theme.colors.primary}33`,
                }}
              />
              <StatusBadge>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={28}
                  color={theme.colors.primary}
                />
              </StatusBadge>
            </AnimationShell>
          </MotiView>

          <Header>
            <Title>cleanup complete</Title>
            <Subtitle>device is refreshed and running cooler</Subtitle>
          </Header>

          <StatsGrid>
            {cleanResultStats.map((stat) => (
              <ResultStatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                accent={stat.accent}
              />
            ))}
          </StatsGrid>

          <Highlights>
            {cleanResultBreakdown.map((item) => (
              <HighlightCard key={item.id}>
                <HighlightIcon accent={item.accent}>
                  <MaterialCommunityIcons
                    name={item.icon as IconName}
                    size={24}
                    color={item.accent}
                  />
                </HighlightIcon>
                <HighlightTextWrap>
                  <HighlightLabel>{item.label}</HighlightLabel>
                  <HighlightMeta>{item.description}</HighlightMeta>
                </HighlightTextWrap>
                <HighlightValue accent={item.accent}>{item.value}</HighlightValue>
              </HighlightCard>
            ))}
          </Highlights>

          <InsightRow>
            {cleanResultInsights.map((insight) => (
              <InsightPill key={insight.id} accent={insight.accent}>
                <InsightLabel>{insight.label}</InsightLabel>
                <InsightValue>{insight.value}</InsightValue>
              </InsightPill>
            ))}
          </InsightRow>

          <Label>visual placeholder for lottie animation</Label>

          <ScanButton
            label="Done"
            onPress={() => router.replace(appRoutes.home)}
            style={{ alignSelf: "stretch" }}
          />
        </Content>
      </Scroll>
    </Screen>
  );
};

export default ResultAnimationScreen;
