import React from "react";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../../routes";

const OldFilesScreen = () => (
  <FeatureScreenTemplate
    title="Old Files"
    subtitle="> 90 days inactive"
    accent="#FFA45B"
    statLabel="Archive ready"
    statValue="4.3 GB"
    summaryLines={["Sorted by last opened", "Keep vs delete suggestions"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default OldFilesScreen;
