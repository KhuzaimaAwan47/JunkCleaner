import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ListRenderItem } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import styledNative, { useTheme } from "styled-components/native";
import AdPlaceholder from "../../../components/AdPlaceholder";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ProgressBar from "../../../components/ProgressBar";
import { duplicateImagesScreenStyles } from "../../../styles/GlobalStyles";
import { ApkFile, useAPKScanner } from "./APKScanner";

const {
  Screen,
  Scroll,
  Content,
  SummaryRow,
  SummaryMeta,
  StartButton,
  StartButtonText,
  ProgressContainer,
  TimerContainer,
  TimerText,
  FileCountText,
  ErrorContainer,
  ErrorText,
  SummaryCard,
  SummaryTitle,
  SummaryText,
  RescanButton,
  RescanButtonText,
  StopButton,
  StopButtonText,
  ResultsContainer,
  ResultsTitle,
} = duplicateImagesScreenStyles;

const styled = styledNative;


const ListHeader = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
`;

const ListHeaderTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: 16px;
`;

const ListHeaderMeta = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

const ListShell = styled(NeumorphicContainer).attrs({
  padding: 0,
})`
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const ApkItem = styled.View`
  padding: ${({ theme }) => theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => `${theme.colors.surfaceAlt}55`};
`;

const ApkItemContent = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const ApkIconContainer = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}66`};
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const ApkInfoContainer = styled.View`
  flex: 1;
  min-width: 0;
`;

const ListItemHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const ApkNameContainer = styled.View`
  flex: 1;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const ApkName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: 15px;
  line-height: 20px;
`;

const ApkSize = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-weight: 500;
  margin-top: 2px;
`;

const ApkMetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.xs}px;
`;

const ApkPath = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  flex: 1;
  min-width: 0;
`;

const SignatureBadge = styled.View`
  flex-direction: row;
  align-items: center;
  margin-left: ${({ theme }) => theme.spacing.sm}px;
  padding: 4px ${({ theme }) => theme.spacing.sm}px;
  border-radius: 8px;
  background-color: ${({ theme }) => `${theme.colors.primary}22`};
`;

const SignatureBadgeText = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
`;

const Separator = styled.View`
  height: 1px;
  background-color: ${({ theme }) => `${theme.colors.surfaceAlt}33`};
`;

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const APKsRemoverScreen = () => {
  const { startScan, stopScan, isScanning, progress, results, error } = useAPKScanner();
  const theme = useTheme();
  const pulseScale = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isScanning) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true,
      );
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isScanning, pulseScale]);

  const totalInstallers = results.length;

  const apkSizeTotal = useMemo(
    () => results.reduce((sum, apk) => sum + (apk.size || 0), 0),
    [results],
  );

  const signatureMatches = useMemo(
    () => results.filter((apk) => apk.isSignatureMatch).length,
    [results],
  );

  const averageFileSize = useMemo(
    () => (totalInstallers ? apkSizeTotal / totalInstallers : 0),
    [apkSizeTotal, totalInstallers],
  );

  const progressPercent = useMemo(
    () => (progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0),
    [progress],
  );

  const scannedFilesCount = progress.scannedFiles ?? progress.current;
  const totalFilesEstimate = progress.totalFiles ?? progress.total;

  const handleScan = useCallback(() => {
    void startScan();
  }, [startScan]);

  const handleStop = useCallback(() => {
    stopScan();
  }, [stopScan]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const renderApkRow = useCallback<ListRenderItem<ApkFile>>(
    ({ item }) => {
      const displayName = item.name || item.path.split("/").pop() || "Unknown APK";
      return (
        <ApkItem>
          <ApkItemContent>
            <ApkIconContainer>
              <MaterialCommunityIcons
                name="package-variant"
                size={28}
                color={theme.colors.primary}
              />
            </ApkIconContainer>
            <ApkInfoContainer>
              <ListItemHeader>
                <ApkNameContainer>
                  <ApkName numberOfLines={2}>{displayName}</ApkName>
                </ApkNameContainer>
                <ApkSize>{formatBytes(item.size)}</ApkSize>
              </ListItemHeader>
              <ApkMetaRow>
                <ApkPath numberOfLines={1}>{item.path}</ApkPath>
                {item.isSignatureMatch && (
                  <SignatureBadge>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={12}
                      color={theme.colors.primary}
                    />
                    <SignatureBadgeText>verified</SignatureBadgeText>
                  </SignatureBadge>
                )}
              </ApkMetaRow>
            </ApkInfoContainer>
          </ApkItemContent>
        </ApkItem>
      );
    },
    [theme],
  );

  const showSummaryCard =
    !isScanning && (progress.total > 0 || progress.currentFile === "Cancelled" || totalInstallers > 0);
  const scanWasCancelled = progress.currentFile === "Cancelled";
  const showStarterCallout = !isScanning && totalInstallers === 0 && progress.total === 0 && !scanWasCancelled;

  return (
    <Screen>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <AppHeader title="APK Remover" subtitle="installers clean-up" />

          <SummaryRow>
            <SummaryMeta>
              {totalInstallers} installer{totalInstallers !== 1 ? "s" : ""} catalogued
            </SummaryMeta>
            <SummaryMeta accent>
              {formatBytes(apkSizeTotal)} total size
            </SummaryMeta>
          </SummaryRow>

          {showStarterCallout && (
            <Animated.View style={buttonAnimatedStyle}>
              <StartButton onPress={handleScan} activeOpacity={0.85}>
                <StartButtonText>Scan APKs Installers</StartButtonText>
              </StartButton>
            </Animated.View>
          )}

          {isScanning && (
            <ProgressContainer>
              <TimerContainer>
                <TimerText>⏱️ {formatTime(elapsedTime)}</TimerText>
                {scannedFilesCount > 0 && (
                  <FileCountText>
                    {scannedFilesCount.toLocaleString()} /{" "}
                    {totalFilesEstimate > 0 ? totalFilesEstimate.toLocaleString() : "?"} files
                  </FileCountText>
                )}
              </TimerContainer>
              <ProgressBar
                progress={progressPercent}
                currentFile={progress.currentFile}
                stage={progress.stage}
              />
              <StopButton onPress={handleStop} activeOpacity={0.85}>
                <StopButtonText>stop</StopButtonText>
              </StopButton>
            </ProgressContainer>
          )}

          {error && (
            <ErrorContainer>
              <ErrorText>{error}</ErrorText>
            </ErrorContainer>
          )}

          {showSummaryCard && (
            <SummaryCard>
              {scanWasCancelled ? (
                <>
                  <SummaryTitle>scan cancelled</SummaryTitle>
                  <SummaryText>
                    scanned {progress.scannedFiles || progress.current || 0} files before cancellation
                  </SummaryText>
                  <SummaryText>resume when you’re ready</SummaryText>
                </>
              ) : totalInstallers === 0 ? (
                <>
                  <SummaryTitle>No installers found</SummaryTitle>
                  <SummaryText>
                    scanned {progress.total || scannedFilesCount || 0} locations
                  </SummaryText>
                  <SummaryText>downloads are already clean</SummaryText>
                </>
              ) : (
                <>
                  <SummaryTitle>Scan complete</SummaryTitle>
                  <SummaryText>
                    scanned {progress.total || scannedFilesCount || 0} files
                  </SummaryText>
                  <SummaryText>found {totalInstallers} installer{totalInstallers !== 1 ? "s" : ""}</SummaryText>
                </>
              )}
              <RescanButton onPress={handleScan} activeOpacity={0.85}>
                <RescanButtonText>rescan</RescanButtonText>
              </RescanButton>
            </SummaryCard>
          )}


          {totalInstallers > 0 && (
            <ResultsContainer>
              <ResultsTitle>Detected installers</ResultsTitle>
              <ListHeader>
                <ListHeaderTitle>latest sweep</ListHeaderTitle>
                <ListHeaderMeta>
                  {totalInstallers} shown · {formatBytes(apkSizeTotal)}
                </ListHeaderMeta>
              </ListHeader>
              <ListShell>
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.path}
                  scrollEnabled={false}
                  ItemSeparatorComponent={Separator}
                  renderItem={renderApkRow}
                />
              </ListShell>
            </ResultsContainer>
          )}

          <AdPlaceholder />

        </Content>
      </Scroll>
    </Screen>
  );
};

export default APKsRemoverScreen;
