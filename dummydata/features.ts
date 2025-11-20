import { appRoutes } from "../routes";
import type { AppRoute } from "../routes";

export type Feature = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: AppRoute;
  accent: string;
  progress: number;
};

export const featureCards: Feature[] = [
  {
    id: 'junk',
    title: 'Junk Files',
    subtitle: 'Temporary leftovers',
    icon: 'delete-empty-outline',
    route: appRoutes.junkScanner,
    accent: '#FF7A80',
    progress: 0.62,
  },
  {
    id: 'smart',
    title: 'Smart Clean',
    subtitle: '1-tap optimizer',
    icon: 'magic-staff',
    route: appRoutes.smartClean,
    accent: '#6C63FF',
    progress: 0.48,
  },
  {
    id: 'cache',
    title: 'Cache Logs',
    subtitle: 'Hidden cache',
    icon: 'file-cabinet',
    route: appRoutes.cacheLogs,
    accent: '#00BFA6',
    progress: 0.44,
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
    id: 'large',
    title: 'Large Files',
    subtitle: '> 512 MB',
    icon: 'file-search-outline',
    route: appRoutes.largeFiles,
    accent: '#FFB347',
    progress: 0.57,
  },
  {
    id: 'apk',
    title: 'APKs',
    subtitle: 'Installers',
    icon: 'android',
    route: appRoutes.apks,
    accent: '#00D1FF',
    progress: 0.36,
  },
  {
    id: 'unused',
    title: 'Unused Apps',
    subtitle: 'Dormant 45d',
    icon: 'apps',
    route: appRoutes.unusedApps,
    accent: '#F06292',
    progress: 0.51,
  },
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
    id: 'storage',
    title: 'Storage IQ',
    subtitle: 'Usage trends',
    icon: 'chart-bell-curve',
    route: appRoutes.storageDashboard,
    accent: '#64B5F6',
    progress: 0.82,
  },
];

export const storageStats = {
  total: 256,
  used: 173,
  system: 32,
  junk: 2.7,
  recommended: ['Compress large videos', 'Delete duplicate screenshots', 'Clear WhatsApp voice notes'],
};

