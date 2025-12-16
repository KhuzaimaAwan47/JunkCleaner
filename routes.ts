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
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];
