import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { DefaultTheme, useTheme } from "styled-components/native";
import AppHeader from "../../../components/AppHeader";
import NeumorphicContainer from "../../../components/NeumorphicContainer";
import ScreenWrapper from "../../../components/ScreenWrapper";
import formatBytes from "../../../constants/formatBytes";
import type { RootState } from "../../../redux-code/store";
import { appRoutes } from "../../../routes";
import { calculateFeatureStats } from "../../../utils/featureStatsCalculator";
import { calculateFileCategoryFeatures } from "../../../utils/fileCategoryCalculator";

type CategoryCard = {
  id: string;
  title: string;
  icon: string;
  route: string;
  count: number;
  size: number;
  accent: string;
};

const StorageAnalyzerScreen: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Get all scan results from Redux
  const largeFileResults = useSelector((state: RootState) => state.appState.largeFileResults);
  const oldFileResults = useSelector((state: RootState) => state.appState.oldFileResults);
  const videosResults = useSelector((state: RootState) => state.appState.videosResults);
  const imagesResults = useSelector((state: RootState) => state.appState.imagesResults);
  const audiosResults = useSelector((state: RootState) => state.appState.audiosResults);
  const documentsResults = useSelector((state: RootState) => state.appState.documentsResults);
  const apkResults = useSelector((state: RootState) => state.appState.apkResults);

  // Calculate stats for each category
  const featureStats = useMemo(() => {
    return calculateFeatureStats({
      largeFileResults,
      oldFileResults,
      apkResults,
    });
  }, [largeFileResults, oldFileResults, apkResults]);

  const fileCategoryFeatures = useMemo(() => {
    return calculateFileCategoryFeatures(
      {
        largeFileResults,
        oldFileResults,
        videosResults,
        imagesResults,
        audiosResults,
        documentsResults,
        apkResults,
      },
      theme
    );
  }, [largeFileResults, oldFileResults, videosResults, imagesResults, audiosResults, documentsResults, apkResults, theme]);

  // Build category cards
  const categoryCards = useMemo<CategoryCard[]>(() => {
    const cards: CategoryCard[] = [];

    // Large Files
    const largeStats = featureStats.large;
    cards.push({
      id: "large",
      title: "Large Files",
      icon: "file-search-outline",
      route: appRoutes.largeFiles,
      count: largeStats?.count ?? 0,
      size: largeStats?.size ?? 0,
      accent: "#FFB347",
    });

    // Old Files
    const oldStats = featureStats.old;
    cards.push({
      id: "old",
      title: "Old Files",
      icon: "archive-clock-outline",
      route: appRoutes.oldFiles,
      count: oldStats?.count ?? 0,
      size: oldStats?.size ?? 0,
      accent: "#FFA45B",
    });

    // File Categories (Videos, Images, Audios, Documents)
    fileCategoryFeatures.forEach((feature) => {
      let count = 0;
      let size = 0;

      // Calculate directly from results arrays
      if (feature.id.includes("videos") || feature.title === "Videos") {
        count = videosResults.length;
        size = videosResults.reduce((sum, f) => sum + f.size, 0);
      } else if (feature.id.includes("images") || feature.title === "Images") {
        count = imagesResults.length;
        size = imagesResults.reduce((sum, f) => sum + f.size, 0);
      } else if (feature.id.includes("audio") || feature.title === "Audio") {
        count = audiosResults.length;
        size = audiosResults.reduce((sum, f) => sum + f.size, 0);
      } else if (feature.id.includes("documents") || feature.title === "Documents") {
        count = documentsResults.length;
        size = documentsResults.reduce((sum, f) => sum + f.size, 0);
      }

      cards.push({
        id: feature.id,
        title: feature.title,
        icon: feature.icon,
        route: feature.route,
        count,
        size,
        accent: feature.accent,
      });
    });

    // APKs
    const apkStats = featureStats.apk;
    cards.push({
      id: "apk",
      title: "APKs",
      icon: "android",
      route: appRoutes.apkCleaner,
      count: apkStats?.count ?? 0,
      size: apkStats?.size ?? 0,
      accent: "#00D1FF",
    });

    return cards;
  }, [featureStats, fileCategoryFeatures, videosResults, imagesResults, audiosResults, documentsResults]);

  const handleCategoryPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScreenWrapper style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <View style={styles.headerContainer}>
          <AppHeader title="Storage Analyzer" />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {categoryCards.map((card) => (
            <NeumorphicContainer
              key={card.id}
              onPress={() => handleCategoryPress(card.route)}
              padding={theme.spacing.lg}
              style={styles.categoryCard}
            >
              <View style={styles.categoryCardContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${card.accent}22` }]}>
                  <MaterialCommunityIcons
                    name={card.icon as any}
                    size={24}
                    color={card.accent}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{card.title}</Text>
                  <Text style={styles.categoryStats}>
                    {card.count} files • {formatBytes(card.size)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textMuted}
                />
              </View>
            </NeumorphicContainer>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default StorageAnalyzerScreen;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 2,
    },
    categoryCard: {
      marginBottom: theme.spacing.md,
    },
    categoryCardContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginBottom: 4,
    },
    categoryStats: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
    },
  });

