import { router } from "expo-router";
import React from "react";
import { useTheme } from "styled-components/native";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { appRoutes } from "../../../routes";

const SmartCleanScreen = () => {
  const theme = useTheme();

  return (
    <FeatureScreenTemplate
      title="Smart Clean"
      subtitle="ai routines ready"
      accent={theme.colors.primary}
      statLabel="Boost score"
      statValue="92%"
      summaryLines={["Battery safe mode on", "Predictive cleaning enabled"]}
      onScan={() => router.push(appRoutes.resultAnimation)}
    />
  );
};

export default SmartCleanScreen;
