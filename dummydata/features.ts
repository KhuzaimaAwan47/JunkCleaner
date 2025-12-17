import type { AppRoute } from "../routes";
import { appRoutes } from "../routes";
import { allColors } from "../theme/theme";

export type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: AppRoute;
  accent: string;
  progress: number;
};

// Order here mirrors smart scan sequence for consistent UI: WhatsApp → Duplicates → Large → Old → (extras)
export const featureCards: Feature[] = [
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    subtitle: 'Media bloat',
    icon: 'whatsapp',
    route: appRoutes.whatsapp,
    accent: '#25D366',
    progress: 0.65,
  },
  {
    id: 'duplicate',
    title: 'Duplicates',
    subtitle: 'Twin photos',
    icon: 'image-multiple-outline',
    route: appRoutes.duplicates,
    accent: '#7E57C2',
    progress: 0.28,
  },
  {
    id: 'large',
    title: 'Large Files',
    subtitle: '> 512 MB',
    icon: 'file-search-outline',
    route: appRoutes.largeFiles,
    accent: '#FFB347',
    progress: 0.57,
  },
  {
    id: 'old',
    title: 'Old Files',
    subtitle: 'Beyond 90 days',
    icon: 'archive-clock-outline',
    route: appRoutes.oldFiles,
    accent: '#FFA45B',
    progress: 0.73,
  },
  {
    id: 'smart',
    title: 'Smart Clean',
    subtitle: '1-tap optimizer',
    icon: 'magic-staff',
    route: appRoutes.smartClean,
    accent: allColors.primary,
    progress: 0.48,
  },
  {
    id: 'apk',
    title: 'APK Cleaner',
    subtitle: 'Remove installers',
    icon: 'android',
    route: appRoutes.apkCleaner,
    accent: '#00D1FF',
    progress: 0.0,
  },
];

export const storageStats = {
  total: 256,
  used: 173,
  system: 32,
  junk: 2.7,
  recommended: ['Compress large videos', 'Delete duplicate screenshots', 'Clear WhatsApp voice notes'],
};

