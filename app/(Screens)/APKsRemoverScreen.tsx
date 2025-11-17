import React from "react";
import FeatureScreenTemplate from "../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../routes";

const APKsRemoverScreen = () => (
  <FeatureScreenTemplate
    title="APK Remover"
    subtitle="installers clean-up"
    accent="#00D1FF"
    statLabel="APK stash"
    statValue="18 files"
    summaryLines={["Safe duplicates flagged", "Build versions detected"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default APKsRemoverScreen;
