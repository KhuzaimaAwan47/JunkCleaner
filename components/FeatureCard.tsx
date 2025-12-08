import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, useTheme } from "styled-components/native";
import type { Feature } from "../dummydata/features";
import NeumorphicContainer from "./NeumorphicContainer";

type Props = {
  feature: Feature;
  onPress?: () => void;
  progress?: number;
};

const FeatureCard: React.FC<Props> = ({ feature, onPress, progress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const effectiveProgress = Math.max(0, Math.min(1, progress ?? feature.progress ?? 0));

  return (
    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
      <NeumorphicContainer onPress={onPress} padding={20}>
        <View style={styles.cardContent}>
          <View style={[styles.iconWrap, { backgroundColor: `${feature.accent}22` }]}>
            <MaterialCommunityIcons name={feature.icon as any} size={24} color={feature.accent} />
          </View>
          <Text style={styles.title}>{feature.title}</Text>
          <Text style={styles.subtitle}>{feature.subtitle}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${effectiveProgress * 100}%`,
                backgroundColor: feature.accent,
              },
            ]}
          />
        </View>
      </NeumorphicContainer>
    </MotiView>
  );
};

export default FeatureCard;

const createStyles = (theme: DefaultTheme) =>
  StyleSheet.create({
    cardContent: {
      alignItems: "center",
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
      textAlign: "center",
    },
    progressBar: {
      width: "100%",
      height: 8,
      borderRadius: 20,
      backgroundColor: `${theme.colors.surfaceAlt}aa`,
      marginTop: theme.spacing.md,
    },
    progressFill: {
      height: "100%",
      borderRadius: 20,
    },
  });
