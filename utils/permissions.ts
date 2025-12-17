import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

type Permission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

/**
 * Checks if the app has "All Files Access" permission (MANAGE_EXTERNAL_STORAGE).
 * This permission is required on Android 11+ (API 30+) to access all files.
 * 
 * Note: This requires a native module to properly check Environment.isExternalStorageManager().
 * For now, we use a workaround by attempting to access a protected path.
 * 
 * @returns Promise<boolean> - true if All Files Access is granted, false otherwise
 */
export async function checkAllFilesAccessPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
  
  // MANAGE_EXTERNAL_STORAGE is only available on Android 11+ (API 30+)
  if (version < 30) {
    return true; // Not needed on older versions
  }

  // Since we can't directly access Environment.isExternalStorageManager() from JavaScript,
  // we use a workaround: try to access the root external storage directory.
  // If we can read it without errors, we likely have All Files Access permission.
  // This is not 100% reliable but works as a reasonable check.
  
  try {
    // Try to read the root external storage directory
    // On Android 11+, without All Files Access, this will typically fail or return limited results
    await RNFS.readDir(RNFS.ExternalStorageDirectoryPath);
    // If we can read the root directory, we likely have the permission
    // However, this is not foolproof - we'll use it as an indicator
    return true;
  } catch (error) {
    // If reading fails, we likely don't have All Files Access
    // Return false to trigger the permission request
    console.warn('Error checking All Files Access permission (likely not granted):', error);
    return false;
  }
}

/**
 * Opens the Android settings screen for "All Files Access" permission.
 * This navigates directly to the app-specific All Files Access settings page.
 * 
 * @returns Promise<void>
 */
export async function openAllFilesAccessSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
  
  // MANAGE_EXTERNAL_STORAGE is only available on Android 11+ (API 30+)
  if (version < 30) {
    return; // Not needed on older versions
  }

  const packageName = Constants.expoConfig?.android?.package || 'com.khuzaima47.JunkCleaner';
  
  // Open the app-specific All Files Access settings page
  // Using Android Intent action: Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
  // Format: android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION with data: package:com.package.name
  
  const intentAction = 'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION';
  const dataUri = `package:${packageName}`;
  
  try {
    // Use the action string directly with data URI
    await IntentLauncher.startActivityAsync(
      intentAction,
      {
        data: dataUri,
      }
    );
  } catch (error) {
    // Fallback: try the general All Files Access settings page (without package-specific data)
    console.warn('Failed to open app-specific All Files Access settings, trying general settings:', error);
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION'
      );
    } catch (finalError) {
      console.error('All attempts to open All Files Access settings failed:', finalError);
      // Don't throw - allow the flow to continue even if settings can't be opened
    }
  }
}

/**
 * Requests all required permissions for smart scan in a single batch.
 * This ensures all permissions are granted upfront before starting the scan.
 * 
 * @returns Promise<boolean> - true if all permissions are granted, false otherwise
 */
export async function requestAllSmartScanPermissions(): Promise<boolean> {
  // Non-Android platforms don't need these permissions
  if (Platform.OS !== 'android') {
    return true;
  }

  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
  const needsLegacyPermissions = version < 33;

  // Determine which permissions are needed based on Android version
  const permissionCandidates: (Permission | undefined)[] = needsLegacyPermissions
    ? [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]
    : [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  
  // If no permissions are needed, return true
  if (!permissions.length) {
    return true;
  }

  // Request all standard storage permissions at once
  let standardPermissionsGranted = false;
  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    // Check if all standard permissions were granted
    standardPermissionsGranted = permissions.every(
      (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.error('Error requesting standard permissions:', error);
    return false;
  }

  // After standard permissions are handled, always request All Files Access on Android 11+
  // We can't reliably check MANAGE_EXTERNAL_STORAGE from JavaScript without a native module,
  // so we always open the settings screen to ensure the user can grant it
  if (version >= 30) {
    // Automatically open the All Files Access settings screen
    try {
      await openAllFilesAccessSettings();
      // Note: We return true here to allow the scan to proceed
      // The user will grant the permission in settings, and the next scan will have access
      // The actual permission check will happen when trying to access files
      return standardPermissionsGranted;
    } catch (error) {
      console.error('Error opening All Files Access settings:', error);
      // Continue anyway - the user can grant it manually later
      return standardPermissionsGranted;
    }
  }

  // For Android < 11, only standard permissions matter
  return standardPermissionsGranted;
}

