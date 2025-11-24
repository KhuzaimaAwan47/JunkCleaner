import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ListRenderItem } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, } from "react-native-reanimated";
import { useTheme } from "styled-components/native";
import AdPlaceholder from "../../../components/AdPlaceholder";
import AppHeader from "../../../components/AppHeader";
import ProgressBar from "../../../components/ProgressBar";
import formatBytes from "../../../constants/formatBytes";
import formatTime from "../../../constants/formatTime";
import { apkRemoverScreenStyles } from "../../../styles/GlobalStyles";
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
  ListHeader,
  ListHeaderTitle,
  ListHeaderMeta,
  ListShell,
  ApkItem,
  ApkItemContent,
  ApkIconContainer,
  ApkInfoContainer,
  ListItemHeader,
  ApkNameContainer,
  ApkName,
  ApkSize,
  ApkMetaRow,
  ApkPath,
  SignatureBadge,
  SignatureBadgeText,
  Separator,
} = apkRemoverScreenStyles;

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
