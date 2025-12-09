import { useMemo } from "react";
import type { UnusedAppInfo } from "./UnusedAppsScanner";

export type SectionData = {
  title: string;
  data: UnusedAppInfo[];
};

export const useUnusedAppsGrouping = (apps: UnusedAppInfo[]): SectionData[] => {
  return useMemo<SectionData[]>(() => {
    const unused = apps.filter((app) => app.category === "UNUSED");
    const lowUsage = apps.filter((app) => app.category === "LOW_USAGE");
    const active = apps.filter((app) => app.category === "ACTIVE");

    const sections: SectionData[] = [];
    
    if (unused.length > 0) {
      sections.push({ title: "UNUSED APPS", data: unused });
    }
    if (lowUsage.length > 0) {
      sections.push({ title: "LOW USAGE", data: lowUsage });
    }
    if (active.length > 0) {
      sections.push({ title: "ACTIVE", data: active });
    }

    return sections;
  }, [apps]);
};

