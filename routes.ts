export const appRoutes = {
  splash: "/(Screens)/SplashScreen/SplashScreen",
  onboarding: "/(Screens)/OnboardingScreen/OnboardingScreen",
  home: "/(Screens)/HomeScreen/HomeScreen",
  junkScanner: "/(Screens)/JunkFileScannerScreen/JunkFileScannerScreen",
  smartClean: "/(Screens)/SmartCleanScreen/SmartCleanScreen",
  cacheLogs: "/(Screens)/CacheLogsScreen/CacheLogsScreen",
  oldFiles: "/(Screens)/OldFilesScreen/OldFilesScreen",
  largeFiles: "/(Screens)/LargeFilesScreen/LargeFilesScreen",
  apks: "/(Screens)/APKRemoverScreen/APKsRemoverScreen",
  unusedApps: "/(Screens)/UnusedAppsScreen/UnusedAppsScreen",
  whatsapp: "/(Screens)/WhatsAppRemoverScreen/WhatsAppRemoverScreen",
  duplicates: "/(Screens)/DuplicateImagesScreen/DuplicateImagesScreen",
  storageDashboard: "/(Screens)/StorageDashboardScreen/StorageDashboardScreen",
  resultAnimation: "/(Screens)/ResultAnimationScreen/ResultAnimationScreen",
  reminder: "/(Screens)/NotificationReminderScreen/NotificationReminderScreen",
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];
