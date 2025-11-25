import { Image, StyleSheet } from "react-native";
import { SafeAreaView as SafeAreaContextView } from "react-native-safe-area-context";
import styledNative, { DefaultTheme } from "styled-components/native";

import NeumorphicContainer from "../components/NeumorphicContainer";
import { spacing } from "../theme/theme";

const styled = styledNative;

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
  ToolsDescription: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 13px;
    line-height: 18px;
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
  RemainingGridItem: styled.TouchableOpacity`
    width: 30%;
    align-items: center;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => `${theme.spacing.xs}px`};
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

export const duplicateImagesScreenStyles = {
  Screen: BaseSafeArea,
  Scroll: BaseScroll,
  Content: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    width: 100%;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  FilterRow: styled.View`
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  FilterButton: styled.Pressable`
    flex-direction: row;
    align-items: center;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
    flex: 1;
  `,
  FilterButtonText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 15px;
    font-weight: 600;
    flex: 1;
  `,
  FilterButtonIcon: styled.View`
    width: 28px;
    height: 28px;
    border-radius: 14px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}44`};
  `,
  SmartFilterControl: styled.View`
    flex-direction: row;
    align-items: center;
    flex: 1;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  SmartFilterTextWrap: styled.View`
    flex: 1;
  `,
  SmartFilterLabel: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 14px;
    font-weight: 600;
  `,
  SmartFilterCaption: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
    margin-top: 2px;
  `,
  SmartFilterSwitch: styled.Switch.attrs(({ theme }: { theme: DefaultTheme }) => ({
    trackColor: {
      false: `${theme.colors.surfaceAlt}55`,
      true: `${theme.colors.primary}55`,
    },
    thumbColor: theme.colors.primary,
  }))`
    transform: scale(0.9);
  `,
  Title: styled.Text`
    font-size: 32px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    text-align: center;
  `,
  Subtitle: styled.Text`
    font-size: 16px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    text-align: center;
  `,
  StartButton: styled.TouchableOpacity`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.xl}px;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}66`};
    shadow-color: rgba(0, 0, 0, 0.25);
    shadow-opacity: 0.15;
    shadow-radius: 12px;
    elevation: 8;
  `,
  StartButtonText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-size: 18px;
    font-weight: 700;
    text-align: center;
  `,
  ProgressContainer: styled.View`
    width: 100%;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
  `,
  TimerContainer: styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  TimerText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-size: 18px;
    font-weight: 700;
  `,
  FileCountText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 14px;
    font-weight: 600;
  `,
  ErrorContainer: styled.View`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    border-width: 1px;
    border-color: #ff4444;
  `,
  ErrorText: styled.Text`
    color: #ff6666;
    font-size: 14px;
    text-align: center;
  `,
  SummaryCard: styled.View`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.xl}px;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    width: 100%;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}66`};
    shadow-color: rgba(0, 0, 0, 0.25);
    shadow-opacity: 0.15;
    shadow-radius: 8px;
    elevation: 5;
  `,
  SummaryRow: styled.View`
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  SummaryMeta: styled.Text<{ accent?: boolean }>`
    color: ${({ accent, theme }: { accent?: boolean; theme: DefaultTheme }) =>
      accent ? theme.colors.primary : theme.colors.textMuted};
    font-size: ${({ accent }: { accent?: boolean }) => (accent ? 16 : 14)}px;
    font-weight: ${({ accent }: { accent?: boolean }) => (accent ? 700 : 500)};
  `,
  SummaryTitle: styled.Text`
    font-size: 20px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    text-align: center;
  `,
  SummaryText: styled.Text`
    font-size: 14px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    text-align: center;
  `,
  ViewResultsButton: styled.TouchableOpacity`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    shadow-color: rgba(0, 0, 0, 0.25);
    shadow-opacity: 0.15;
    shadow-radius: 4px;
    elevation: 3;
  `,
  ViewResultsButtonText: styled.Text`
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  `,
  RescanButton: styled.TouchableOpacity`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    background-color: transparent;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
  `,
  RescanButtonText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  `,
  StopButton: styled.TouchableOpacity`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    background-color: #ff4d4d;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    shadow-color: rgba(0, 0, 0, 0.4);
    shadow-opacity: 0.3;
    shadow-radius: 6px;
    elevation: 4;
  `,
  StopButtonText: styled.Text`
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  `,
  SelectRow: styled.View`
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  SelectAllButton: styled.Pressable`
    flex-direction: row;
    align-items: center;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  SelectAllIndicator: styled.View<{ state: 'all' | 'partial' | 'none' }>`
    width: 26px;
    height: 26px;
    border-radius: 13px;
    border-width: 2px;
    border-color: ${({ state, theme }: { state: 'all' | 'partial' | 'none'; theme: DefaultTheme }) =>
      state === 'all'
        ? theme.colors.primary
        : state === 'partial'
        ? `${theme.colors.primary}aa`
        : `${theme.colors.primary}66`};
    background-color: ${({ state, theme }: { state: 'all' | 'partial' | 'none'; theme: DefaultTheme }) =>
      state === 'all' ? theme.colors.primary : theme.colors.surface};
    align-items: center;
    justify-content: center;
    shadow-color: ${({ state, theme }: { state: 'all' | 'partial' | 'none'; theme: DefaultTheme }) =>
      state === 'all' ? 'rgba(0, 0, 0, 0.15)' : `${theme.colors.primary}aa`};
    shadow-opacity: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'all' ? 0.2 : 0.45)};
    shadow-radius: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'all' ? 6 : 10)}px;
    elevation: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'all' ? 4 : 8)};
  `,
  SelectAllIndicatorInner: styled.View<{ state: 'all' | 'partial' | 'none' }>`
    width: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'partial' ? 12 : 6)}px;
    height: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'partial' ? 3 : 6)}px;
    border-radius: ${({ state }: { state: 'all' | 'partial' | 'none' }) => (state === 'partial' ? 2 : 12)}px;
    background-color: ${({ state, theme }: { state: 'all' | 'partial' | 'none'; theme: DefaultTheme }) =>
      state === 'partial' ? theme.colors.primary : `${theme.colors.surfaceAlt}aa`};
  `,
  SelectAllText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 14px;
    font-weight: 600;
    text-transform: capitalize;
  `,
  SelectAllHint: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 13px;
  `,
  ResultsContainer: styled.View`
    width: 100%;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  ResultsTitle: styled.Text`
    font-size: 20px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  ListEmptyState: styled.View`
    width: 100%;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.xl}px;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  EmptyTitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 18px;
    font-weight: 600;
  `,
  EmptySubtitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 14px;
    text-align: center;
  `,
  FooterAction: styled.View`
    width: 100%;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  FooterActionButton: styled.TouchableOpacity<{ disabled: boolean }>`
    width: 100%;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.xl}px;
    background-color: ${({ disabled, theme }: { disabled: boolean; theme: DefaultTheme }) =>
      disabled ? `${theme.colors.surfaceAlt}55` : theme.colors.secondary};
    opacity: ${({ disabled }: { disabled: boolean }) => (disabled ? 0.6 : 1)};
    align-items: center;
    justify-content: center;
    gap: 4px;
  `,
  FooterActionText: styled.Text`
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    text-transform: capitalize;
  `,
  FooterActionSubtext: styled.Text`
    color: #fff;
    font-size: 13px;
    opacity: 0.9;
  `,
};

export const resultAnimationStyles = {
  Screen: styled(BaseSafeArea)`
    flex: 1;
  `,
  Scroll: styled(BaseScroll)`
    flex: 1;
  `,
  Content: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    padding-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xl}px;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  AnimationShell: styled.View`
    width: 220px;
    height: 220px;
    border-radius: 110px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surface}aa`};
    align-self: center;
    position: relative;
  `,
  StatusBadge: styled.View`
    position: absolute;
    bottom: 18px;
    right: 18px;
    width: 52px;
    height: 52px;
    border-radius: 26px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    shadow-color: #000;
    shadow-opacity: 0.15;
    shadow-radius: 16px;
    elevation: 8;
  `,
  Header: styled.View`
    align-items: center;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  Title: styled.Text`
    font-size: 22px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    text-transform: capitalize;
  `,
  Subtitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    text-align: center;
  `,
  StatsGrid: styled.View`
    width: 100%;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  Highlights: styled.View`
    width: 100%;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  HighlightCard: styled.View`
    flex-direction: row;
    align-items: center;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}66`};
  `,
  HighlightIcon: styled.View<{ accent: string }>`
    width: 48px;
    height: 48px;
    border-radius: 24px;
    align-items: center;
    justify-content: center;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    background-color: ${({ accent }: { accent: string }) => `${accent}22`};
  `,
  HighlightTextWrap: styled.View`
    flex: 1;
  `,
  HighlightLabel: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-weight: 600;
  `,
  HighlightMeta: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
    margin-top: 2px;
    text-transform: capitalize;
  `,
  HighlightValue: styled.Text<{ accent: string }>`
    color: ${({ accent }: { accent: string }) => accent};
    font-weight: 700;
    font-size: 16px;
  `,
  InsightRow: styled.View`
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  InsightPill: styled.View<{ accent: string }>`
    padding-horizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    padding-vertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    border-radius: 999px;
    background-color: ${({ accent }: { accent: string }) => `${accent}22`};
  `,
  InsightLabel: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 11px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  `,
  InsightValue: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-weight: 600;
    margin-top: 2px;
  `,
  Label: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    text-align: center;
  `,
};

const {
  Screen: ApkScreen,
  Scroll: ApkScroll,
  Content: ApkContent,
  SummaryRow: ApkSummaryRow,
  SummaryMeta: ApkSummaryMeta,
  StartButton: ApkStartButton,
  StartButtonText: ApkStartButtonText,
  ProgressContainer: ApkProgressContainer,
  TimerContainer: ApkTimerContainer,
  TimerText: ApkTimerText,
  FileCountText: ApkFileCountText,
  ErrorContainer: ApkErrorContainer,
  ErrorText: ApkErrorText,
  SummaryCard: ApkSummaryCard,
  SummaryTitle: ApkSummaryTitle,
  SummaryText: ApkSummaryText,
  RescanButton: ApkRescanButton,
  RescanButtonText: ApkRescanButtonText,
  StopButton: ApkStopButton,
  StopButtonText: ApkStopButtonText,
  ResultsContainer: ApkResultsContainer,
  ResultsTitle: ApkResultsTitle,
} = duplicateImagesScreenStyles;

export const apkRemoverScreenStyles = {
  Screen: ApkScreen,
  Scroll: ApkScroll,
  Content: ApkContent,
  SummaryRow: ApkSummaryRow,
  SummaryMeta: ApkSummaryMeta,
  StartButton: ApkStartButton,
  StartButtonText: ApkStartButtonText,
  ProgressContainer: ApkProgressContainer,
  TimerContainer: ApkTimerContainer,
  TimerText: ApkTimerText,
  FileCountText: ApkFileCountText,
  ErrorContainer: ApkErrorContainer,
  ErrorText: ApkErrorText,
  SummaryCard: ApkSummaryCard,
  SummaryTitle: ApkSummaryTitle,
  SummaryText: ApkSummaryText,
  RescanButton: ApkRescanButton,
  RescanButtonText: ApkRescanButtonText,
  StopButton: ApkStopButton,
  StopButtonText: ApkStopButtonText,
  ResultsContainer: ApkResultsContainer,
  ResultsTitle: ApkResultsTitle,
  ListHeader: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  `,
  ListHeaderTitle: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-weight: 700;
    font-size: 16px;
  `,
  ListHeaderMeta: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
  `,
  ListShell: styled(NeumorphicContainer).attrs({
    padding: 0,
  })`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  ApkItem: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-bottom-width: 1px;
    border-bottom-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  ApkItemContent: styled.View`
    flex-direction: row;
    align-items: flex-start;
  `,
  ApkIconContainer: styled.View`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}66`};
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  ApkInfoContainer: styled.View`
    flex: 1;
    min-width: 0;
  `,
  ListItemHeader: styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  ApkNameContainer: styled.View`
    flex: 1;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  ApkName: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-weight: 600;
    font-size: 15px;
    line-height: 20px;
  `,
  ApkSize: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 13px;
    font-weight: 500;
    margin-top: 2px;
  `,
  ApkMetaRow: styled.View`
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
  `,
  ApkPath: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
    flex: 1;
    min-width: 0;
  `,
  SignatureBadge: styled.View`
    flex-direction: row;
    align-items: center;
    margin-left: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    padding: 4px ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    border-radius: 8px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}22`};
  `,
  SignatureBadgeText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 4px;
  `,
  Separator: styled.View`
    height: 1px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}33`};
  `,
};

export const largeFilesScreenStyles = {
  Screen: BaseSafeArea,
  ListHeader: styled.View`
    padding-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  SummaryRow: styled.View`
    flex-direction: row;
    justify-content: space-between;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
  `,
  SummarySlot: styled.View<{ isLast?: boolean }>`
    flex: 1;
    margin-right: ${({ isLast, theme }: { isLast?: boolean; theme: DefaultTheme }) =>
      isLast ? 0 : theme.spacing.sm}px;
  `,
  SummaryCard: styled.View`
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  SummaryIcon: styled.View`
    width: 36px;
    height: 36px;
    border-radius: 12px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.primary}15`};
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  SummaryValue: styled.Text`
    font-size: 18px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  `,
  SummaryLabel: styled.Text`
    font-size: 12px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    margin-top: 2px;
    text-transform: uppercase;
  `,
  ProgressCard: styled.View`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}33`};
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  ProgressHeader: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  `,
  ProgressText: styled.Text`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    font-weight: 600;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
  `,
  ProgressPercent: styled.Text`
    font-size: 16px;
    font-weight: 700;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
  `,
  ProgressSubtext: styled.Text`
    margin-top: 2px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
  `,
  ScanButton: styled.TouchableOpacity<{ disabled?: boolean }>`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    paddingVertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md + 2}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.6 : 1)};
  `,
  ScanButtonText: styled.Text`
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
  `,
  ActionRow: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
  `,
  ActionHint: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 13px;
  `,
  RescanButton: styled.TouchableOpacity<{ disabled?: boolean }>`
    paddingVertical: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    paddingHorizontal: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.lg}px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.5 : 1)};
  `,
  RescanButtonText: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-weight: 700;
    text-transform: uppercase;
  `,
  FileCard: styled.View`
    background-color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.surface};
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    padding: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    border-width: 1px;
    border-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}55`};
  `,
  FileRow: styled.View`
    flex-direction: row;
  `,
  ThumbnailWrapper: styled.View`
    width: 60px;
    height: 60px;
    border-radius: ${({ theme }: { theme: DefaultTheme }) => theme.radii.lg}px;
    overflow: hidden;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.md}px;
    background-color: ${({ theme }: { theme: DefaultTheme }) => `${theme.colors.surfaceAlt}77`};
    align-items: center;
    justify-content: center;
  `,
  ThumbnailImage: styled(Image)`
    width: 100%;
    height: 100%;
  `,
  ThumbnailFallback: styled.View`
    flex: 1;
    align-items: center;
    justify-content: center;
  `,
  FileContent: styled.View`
    flex: 1;
  `,
  FileHeader: styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  `,
  FileName: styled.Text`
    flex: 1;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.text};
    font-size: 16px;
    font-weight: 600;
  `,
  FileSize: styled.Text`
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.primary};
    font-weight: 700;
  `,
  BadgeRow: styled.View`
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
  `,
  Tag: styled.Text<{ accent?: boolean }>`
    padding: 4px ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    border-radius: 999px;
    margin-right: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs}px;
    margin-bottom: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.xs / 2}px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    background-color: ${({ accent, theme }: { accent?: boolean; theme: DefaultTheme }) =>
      accent ? `${theme.colors.primary}22` : `${theme.colors.surfaceAlt}55`};
    color: ${({ accent, theme }: { accent?: boolean; theme: DefaultTheme }) =>
      accent ? theme.colors.primary : theme.colors.text};
  `,
  MetaText: styled.Text`
    font-size: 12px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
  `,
  PathText: styled.Text`
    margin-top: ${({ theme }: { theme: DefaultTheme }) => theme.spacing.sm}px;
    color: ${({ theme }: { theme: DefaultTheme }) => theme.colors.textMuted};
    font-size: 12px;
  `,
};

export const spacingX = {
  _20: spacing.lg,
};

export const spacingY = {
  _20: spacing.lg,
};

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._20,
  },
});

