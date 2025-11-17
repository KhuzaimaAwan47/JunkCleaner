import React from "react";
import FeatureScreenTemplate from "../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../routes";

const DuplicateImagesScreen = () => (
  <FeatureScreenTemplate
    title="Duplicate Images"
    subtitle="pixel-perfect compare"
    accent="#7E57C2"
    statLabel="Matches found"
    statValue="245 pairs"
    summaryLines={["AI visual diff scored", "Lossless preview"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default DuplicateImagesScreen;
