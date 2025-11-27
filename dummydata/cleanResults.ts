import { allColors } from "../theme/theme";

export type CleanResultStat = {
  id: string;
  label: string;
  value: string;
  accent: string;
};

export type CleanResultBreakdown = {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: string;
  accent: string;
};

export type CleanResultInsight = {
  id: string;
  label: string;
  value: string;
  accent: string;
};

export const cleanResultStats: CleanResultStat[] = [
  {
    id: "space",
    label: "Space cleaned",
    value: "856 MB",
    accent: allColors.primary,
  },
  {
    id: "apps",
    label: "Apps optimized",
    value: "18 apps",
    accent: allColors.secondary,
  },
  {
    id: "time",
    label: "Scan duration",
    value: "38 sec",
    accent: allColors.warning,
  },
];

export const cleanResultBreakdown: CleanResultBreakdown[] = [
  {
    id: "cache",
    label: "Cache purge",
    value: "312 MB",
    description: "app cache & verbose logs",
    icon: "broom",
    accent: allColors.primary,
  },
  {
    id: "residual",
    label: "Residual files",
    value: "224 MB",
    description: "old installers & split apks",
    icon: "tray-remove",
    accent: allColors.secondary,
  },
  {
    id: "media",
    label: "Temp media",
    value: "140 MB",
    description: "duplicates & low-res clips",
    icon: "image-multiple-outline",
    accent: allColors.accent,
  },
  {
    id: "whatsapp",
    label: "WhatsApp cleanup",
    value: "96 MB",
    description: "voice notes & sent media",
    icon: "whatsapp",
    accent: "#25D366",
  },
];

export const cleanResultInsights: CleanResultInsight[] = [
  {
    id: "battery",
    label: "battery boost",
    value: "+12%",
    accent: allColors.primary,
  },
  {
    id: "cpu",
    label: "cpu idle time",
    value: "+8%",
    accent: allColors.secondary,
  },
  {
    id: "threats",
    label: "risk items removed",
    value: "41",
    accent: allColors.warning,
  },
];





