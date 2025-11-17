import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React from "react";
import styledNative, { DefaultTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  feature: Feature;
  onPress?: () => void;
};

type WithTheme = { theme: DefaultTheme };
type IconWrapProps = { accent: string } & WithTheme;
type ProgressProps = { accent: string; progress: number };

const CardContent = styledNative.View`
  align-items: center;
`;

const IconWrap = styledNative.View<IconWrapProps>`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ accent }: IconWrapProps) => `${accent}22`};
  margin-bottom: ${({ theme }: WithTheme) => theme.spacing.md}px;
`;

const Title = styledNative.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`;

const Subtitle = styledNative.Text<WithTheme>`
  color: ${({ theme }: WithTheme) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 2px;
  text-align: center;
`;

const ProgressBar = styledNative.View<WithTheme>`
  width: 100%;
  height: 8px;
  border-radius: 20px;
  background-color: ${({ theme }: WithTheme) => `${theme.colors.surfaceAlt}aa`};
  margin-top: ${({ theme }: WithTheme) => theme.spacing.md}px;
`;

const ProgressFill = styledNative.View<ProgressProps>`
  height: 100%;
  border-radius: 20px;
  width: ${({ progress }: ProgressProps) => `${progress * 100}%`};
  background-color: ${({ accent }: ProgressProps) => accent};
`;

const FeatureCard: React.FC<Props> = ({ feature, onPress }) => {
  return (
    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
      <NeumorphicContainer onPress={onPress} padding={20}>
        <CardContent>
          <IconWrap accent={feature.accent}>
            <MaterialCommunityIcons name={feature.icon as any} size={24} color={feature.accent} />
          </IconWrap>
          <Title>{feature.title}</Title>
          <Subtitle>{feature.subtitle}</Subtitle>
        </CardContent>
        <ProgressBar>
          <ProgressFill accent={feature.accent} progress={feature.progress} />
        </ProgressBar>
      </NeumorphicContainer>
    </MotiView>
  );
};

export default FeatureCard;
