import React from "react";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../../routes";

const LargeFilesScreen = () => (
  <FeatureScreenTemplate
    title="Large Files"
    subtitle="focus on 512mb+"
    accent="#FFB347"
    statLabel="Top offenders"
    statValue="7 videos"
    summaryLines={["Sorted by size", "Lossless preview cards"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default LargeFilesScreen;
