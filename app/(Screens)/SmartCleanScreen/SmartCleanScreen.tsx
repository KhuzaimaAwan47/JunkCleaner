import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import DeviceInfo from "react-native-device-info";
import { useTheme } from "styled-components/native";
import FeatureScreenTemplate from "../../../components/FeatureScreenTemplate";
import { appRoutes } from "../../../routes";

type MemoryStats = {
  used?: number;
  total?: number;
};

const formatMemory = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return "Loading...";
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)} MB`;
};

const SmartCleanScreen = () => {
  const theme = useTheme();
  const [memory, setMemory] = useState<MemoryStats>({});

  useEffect(() => {
    let mounted = true;

    const loadMemory = async () => {
      try {
        const [used, total] = await Promise.all([
          DeviceInfo.getUsedMemory(),
          DeviceInfo.getTotalMemory(),
        ]);

        if (mounted) {
          setMemory({ used, total });
        }
      } catch (error) {
        console.warn("Failed to fetch memory stats", error);
      }
    };

    loadMemory();

    return () => {
      mounted = false;
    };
  }, []);

  const supportStats = useMemo(
    () => [
      { label: "Used memory", value: formatMemory(memory.used) },
      { label: "Total memory", value: formatMemory(memory.total) },
    ],
    [memory.used, memory.total]
  );

  const smartFeatures = useMemo(
    () => [
      { label: "Battery safe mode", status: "On" },
      { label: "Predictive cleaning", status: "Enabled" },
      { label: "Adaptive cache removal", status: "Ready" },
      { label: "Background health checks", status: "Auto" },
    ],
    []
  );

  return (
    <FeatureScreenTemplate
      title="Smart Clean"
      subtitle="ai routines ready"
      accent={theme.colors.primary}
      statLabel="Boost score"
      statValue="92%"
      supportStats={supportStats}
      featureItems={smartFeatures}
      summaryLines={[
        "Battery safe mode on",
        "Predictive cleaning enabled",
        "Memory optimized with AI routines",
      ]}
      onScan={() => router.push(appRoutes.resultAnimation)}
    />
  );
};

export default SmartCleanScreen;
