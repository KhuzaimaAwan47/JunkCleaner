export const appRoutes = {
  splash: "/(Screens)/SplashScreen",
  onboarding: "/(Screens)/OnboardingScreen",
  home: "/(Screens)/HomeScreen",
  junkScanner: "/(Screens)/JunkFileScannerScreen",
  smartClean: "/(Screens)/SmartCleanScreen",
  cacheLogs: "/(Screens)/CacheLogsScreen",
  oldFiles: "/(Screens)/OldFilesScreen",
  largeFiles: "/(Screens)/LargeFilesScreen",
  apks: "/(Screens)/APKsRemoverScreen",
  unusedApps: "/(Screens)/UnusedAppsScreen",
  whatsapp: "/(Screens)/WhatsAppRemoverScreen",
  duplicates: "/(Screens)/DuplicateImagesScreen",
  storageDashboard: "/(Screens)/StorageDashboardScreen",
  resultAnimation: "/(Screens)/ResultAnimationScreen",
  reminder: "/(Screens)/NotificationReminderScreen",
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];
