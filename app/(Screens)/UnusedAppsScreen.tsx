import React from "react";
import FeatureScreenTemplate from "../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../routes";

const UnusedAppsScreen = () => (
  <FeatureScreenTemplate
    title="Unused Apps"
    subtitle="> 45 days idle"
    accent="#F06292"
    statLabel="Inactive apps"
    statValue="11 apps"
    summaryLines={["Sorted by battery usage", "Last opened markers"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default UnusedAppsScreen;
