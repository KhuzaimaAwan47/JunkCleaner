import React from "react";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../../routes";

const CacheLogsScreen = () => (
  <FeatureScreenTemplate
    title="Cache Logs"
    subtitle="hidden cache insights"
    accent="#00BFA6"
    statLabel="Cache footprint"
    statValue="1.1 GB"
    summaryLines={["Includes temp CDN downloads", "Safe to remove"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default CacheLogsScreen;
