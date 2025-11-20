import React from "react";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { router } from "expo-router";
import { appRoutes } from "../../../routes";

const WhatsAppRemoverScreen = () => (
  <FeatureScreenTemplate
    title="WhatsApp Clean"
    subtitle="voice notes + media"
    accent="#25D366"
    statLabel="Media weight"
    statValue="3.2 GB"
    summaryLines={["Old status cache", "Forwarded media duplicates"]}
    onScan={() => router.push(appRoutes.resultAnimation)}
  />
);

export default WhatsAppRemoverScreen;
