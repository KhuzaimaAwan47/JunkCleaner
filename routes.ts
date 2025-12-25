export const appRoutes = {
  splash: "/(Screens)/SplashScreen/SplashScreen",
  onboarding: "/(Screens)/OnboardingScreen/OnboardingScreen",
  home: "/(Screens)/HomeScreen/HomeScreen",
  smartClean: "/(Screens)/SmartCleanScreen/SmartCleanScreen",
  oldFiles: "/(Screens)/OldFilesScreen/OldFilesScreen",
  largeFiles: "/(Screens)/LargeFilesScreen/LargeFilesScreen",
  whatsapp: "/(Screens)/WhatsAppRemoverScreen/WhatsAppRemoverScreen",
  duplicates: "/(Screens)/DuplicateImagesScreen/DuplicateImagesScreen",
  resultAnimation: "/(Screens)/ResultAnimationScreen/ResultAnimationScreen",
  reminder: "/(Screens)/NotificationReminderScreen/NotificationReminderScreen",
  videos: "/(Screens)/VideosScreen/VideosScreen",
  images: "/(Screens)/ImagesScreen/ImagesScreen",
  audios: "/(Screens)/AudiosScreen/AudiosScreen",
  documents: "/(Screens)/DocumentsScreen/DocumentsScreen",
  apkCleaner: "/(Screens)/APKCleanerScreen/APKCleanerScreen",
  caches: "/(Screens)/CachesScreen/CachesScreen",
  storageAnalyzer: "/(Screens)/StorageAnalyzerScreen/StorageAnalyzerScreen",
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];
