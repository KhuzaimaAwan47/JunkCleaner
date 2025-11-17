import { SafeAreaView as SafeAreaContextView } from "react-native-safe-area-context";
import styled, { DefaultTheme } from "styled-components/native";

const BaseSafeArea = styled(SafeAreaContextView)`
  flex: 1;
  background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.background};
`;

const BaseScroll = styled.ScrollView`
  flex: 1;
`;

const BaseContent = styled.View`
  padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
`;

export const homeScreenStyles = {
  Screen: BaseSafeArea,
  Scroll: BaseScroll,
  Content: BaseContent,
  ThemeToggleRow: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px 0;
  `,
  ThemeToggleTextWrap: styled.View`
    flex: 1;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  ThemeToggleLabel: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 16px;
    font-weight: 600;
    text-transform: capitalize;
  `,
  ThemeToggleSubtitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-top: 2px;
    font-size: 12px;
  `,
  IndicatorSection: styled.View`
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
  `,
  ScoreLabel: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 14px;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  ScoreStatus: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 18px;
    font-weight: 600;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  FeatureGrid: styled.View`
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  `,
  FeatureGridItem: styled.View`
    width: 48%;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  RemainingCardWrap: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
  `,
  ToolsHeader: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  ToolsTitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 16px;
    font-weight: 600;
  `,
  RemainingGridRow: styled.View`
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  RemainingGridItem: styled.View`
    width: 30%;
    align-items: center;
  `,
  RemainingIcon: styled.View<{ accent: string }>`
    width: 40px;
    height: 40px;
    border-radius: 14px;
    align-items: center;
    justify-content: center;
    background-color: ${({ accent }: { accent: string }) => `${accent}22`};
  `,
  RemainingTextWrap: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => `${theme.spacing.xs / 2}px`};
    align-items: center;
  `,
  RemainingTitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 12px;
    font-weight: 600;
  `,
  RemainingSubtitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 10px;
    margin-top: 2px;
  `,
  MoreButton: styled.TouchableOpacity`
    align-self: center;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    border-radius: 999px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}22`};
  `,
  MoreButtonText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-size: 14px;
    font-weight: 600;
  `,
  AdSection: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
};

export const notificationReminderStyles = {
  Container: BaseSafeArea,
  Screen: styled(BaseScroll)`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
};

export const onboardingScreenStyles = {
  Container: BaseSafeArea,
  SlidesArea: styled.View`
    flex: 1;
  `,
  SlideWrapper: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    align-items: center;
    justify-content: center;
  `,
  Title: styled.Text`
    font-size: 26px;
    font-weight: 700;
    text-align: center;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    margin-top: 24px;
  `,
  Description: styled.Text`
    font-size: 15px;
    text-align: center;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-top: 12px;
  `,
  IconHalo: styled.View`
    width: 260px;
    height: 260px;
    border-radius: 130px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}11`};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}33`};
  `,
  IconBubble: styled.View`
    width: 210px;
    height: 210px;
    border-radius: 105px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    shadow-color: #000;
    shadow-opacity: 0.1;
    shadow-radius: 24px;
    elevation: 12;
  `,
  Footer: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  Dots: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  DotButton: styled.Pressable`
    padding: 8px 4px;
  `,
  Dot: styled.View<{ active: boolean }>`
    width: ${({ active }: { active: boolean }) => (active ? 28 : 10)}px;
    height: 10px;
    border-radius: 5px;
    margin: 0 6px;
    background-color: ${({ active, theme }: { active: boolean; theme: DefaultTheme }) =>
      active ? theme.colors.primary : `${theme.colors.surfaceAlt}66`};
    opacity: ${({ active }: { active: boolean }) => (active ? 1 : 0.6)};
  `,
  PrimaryButton: styled.Pressable`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.secondary};
    padding: 18px;
    border-radius: 24px;
    align-items: center;
    flex-direction: row;
    justify-content: center;
    gap: 8px;
  `,
  ButtonLabel: styled.Text`
    color: #fff;
    font-weight: 600;
    font-size: 16px;
  `,
};

export const splashScreenStyles = {
  Container: styled(BaseSafeArea)`
    align-items: center;
    justify-content: center;
  `,
  Title: styled.Text`
    font-size: 28px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-top: 24px;
  `,
  Subtitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-top: 8px;
    letter-spacing: 2px;
  `,
  IconRing: styled.View`
    width: 180px;
    height: 180px;
    border-radius: 90px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surface}aa`};
    elevation: 18;
  `,
};

export const storageDashboardStyles = {
  Container: BaseSafeArea,
  Screen: styled(BaseScroll)`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  Bars: styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    height: 160px;
  `,
  Bar: styled.View<{ heightPct: number }>`
    width: 18px;
    border-radius: 10px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}55`};
    height: ${({ heightPct }: { heightPct: number }) => `${heightPct}%`};
  `,
  Recommendations: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  Recommendation: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  Grid: styled.View`
    flex-direction: row;
    justify-content: space-between;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  Half: styled.View`
    width: 48%;
  `,
};

export const resultAnimationStyles = {
  Screen: styled(BaseSafeArea)`
    justify-content: center;
    align-items: center;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  AnimationShell: styled.View`
    width: 220px;
    height: 220px;
    border-radius: 110px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surface}aa`};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  Label: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
};

