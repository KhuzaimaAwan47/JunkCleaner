import React from "react";
import styled, { useTheme } from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import NeumorphicContainer from "./NeumorphicContainer";
import type { Feature } from "../dummydata/features";

type Props = {
  feature: Feature;
  onPress?: () => void;
};

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconWrap = styled.View<{ accent: string }>`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ accent }) => `${accent}22`};
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 2px;
`;

const ProgressBar = styled.View`
  width: 100%;
  height: 8px;
  border-radius: 20px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}aa`};
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const ProgressFill = styled.View<{ accent: string; progress: number }>`
  height: 100%;
  border-radius: 20px;
  width: ${({ progress }) => `${progress * 100}%`};
  background-color: ${({ accent }) => accent};
`;

const FeatureCard: React.FC<Props> = ({ feature, onPress }) => {
  const theme = useTheme();
  return (
    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
      <NeumorphicContainer onPress={onPress} padding={20}>
        <Row>
          <IconWrap accent={feature.accent}>
            <MaterialCommunityIcons name={feature.icon as any} size={24} color={feature.accent} />
          </IconWrap>
          <Row style={{ flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
            <Title>{feature.title}</Title>
            <Subtitle>{feature.subtitle}</Subtitle>
          </Row>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
        </Row>
        <ProgressBar>
          <ProgressFill accent={feature.accent} progress={feature.progress} />
        </ProgressBar>
      </NeumorphicContainer>
    </MotiView>
  );
};

export default FeatureCard;
