import React from "react";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { appRoutes } from "../../../routes";
import { router } from "expo-router";

const JunkFileScannerScreen = () => (
  <FeatureScreenTemplate
    title="Junk Scanner"
    subtitle="deep clean cache + temp"
    accent="#FF7A80"
    statLabel="Potential cleanup"
    statValue="2.7 GB"
    summaryLines={["Includes thumbnails & crash logs", "Automation ready"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default JunkFileScannerScreen;
