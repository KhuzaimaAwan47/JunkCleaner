import React from "react";
import FeatureScreenTemplate from "../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../routes";

const SmartCleanScreen = () => (
  <FeatureScreenTemplate
    title="Smart Clean"
    subtitle="ai routines ready"
    accent="#6C63FF"
    statLabel="Boost score"
    statValue="92%"
    summaryLines={["Battery safe mode on", "Predictive cleaning enabled"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default SmartCleanScreen;
