import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

type Permission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

export type ManageAllFilesOptions = {
  waitAfterSettingsMs?: number;
  assumeGrantedAfterSettings?: boolean;
  onAttempt?: (attempt: number) => void;
  onDenied?: (attempts: number) => void;
  onGranted?: () => void;
};

const MANAGE_EXTERNAL_STORAGE_PERMISSION = 'android.permission.MANAGE_EXTERNAL_STORAGE' as Permission;
const MANAGE_ACCESS_STORAGE_KEY = 'manage_external_storage_granted';

let manageAccessAskedThisSession = false;
let manageAccessGrantedThisSession = false;
let manageAccessPersistedGrant: boolean | null = null;

const getAndroidVersion = (): number => {
  return typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
};

const waitForAppToBeActive = (timeoutMs = 10000): Promise<void> =>
  new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timer);
      resolve();
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        cleanup();
      }
    });

    const timer = setTimeout(() => {
      cleanup();
    }, timeoutMs);

    if (AppState.currentState === 'active') {
      cleanup();
    }
  });

const hydrateManageAccessPersistedFlag = async (): Promise<boolean> => {
  if (manageAccessPersistedGrant !== null) {
    return manageAccessPersistedGrant;
  }
  try {
    const stored = await AsyncStorage.getItem(MANAGE_ACCESS_STORAGE_KEY);
    manageAccessPersistedGrant = stored === 'true';
    return manageAccessPersistedGrant;
  } catch (error) {
    console.warn('Failed to read persisted manage access flag:', error);
    manageAccessPersistedGrant = false;
    return false;
  }
};

const persistManageAccessGranted = async (): Promise<void> => {
  manageAccessPersistedGrant = true;
  try {
    await AsyncStorage.setItem(MANAGE_ACCESS_STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('Failed to persist manage access flag:', error);
  }
};

/**
 * Checks if the app has "All Files Access" permission (MANAGE_EXTERNAL_STORAGE).
 * This permission is required on Android 11+ (API 30+) to access all files.
 * 
 * @returns Promise<boolean> - true if All Files Access is granted, false otherwise
 */
export async function checkAllFilesAccessPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  // If previously granted and persisted, trust the persisted flag for this session.
  if (!manageAccessGrantedThisSession) {
    const persistedGranted = await hydrateManageAccessPersistedFlag();
    if (persistedGranted) {
      manageAccessGrantedThisSession = true;
      return true;
    }
  }

  if (manageAccessGrantedThisSession) {
    return true;
  }

  const version = getAndroidVersion();
  
  // MANAGE_EXTERNAL_STORAGE is only available on Android 11+ (API 30+)
  if (version < 30) {
    return true; // Not needed on older versions
  }

  // Prefer native permission check; if it fails, probe filesystem as fallback.
  try {
    const hasManage = await PermissionsAndroid.check(MANAGE_EXTERNAL_STORAGE_PERMISSION);
    if (hasManage) {
      manageAccessGrantedThisSession = true;
      return true;
    }
  } catch (error) {
    console.warn('Unable to check MANAGE_EXTERNAL_STORAGE directly, probing:', error);
  }

  // Fallback probe: attempt to read a protected path that normally requires All Files Access.
  // Using Android/data because it's blocked without MANAGE_EXTERNAL_STORAGE.
  try {
    await RNFS.readDir(`${RNFS.ExternalStorageDirectoryPath}/Android/data`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Alias for backward compatibility.
 */
export const hasAllFilesAccess = checkAllFilesAccessPermission;

/**
 * Reset session flags (useful for tests or app cold start hooks).
 */
export function resetManageAccessSessionFlags(): void {
  manageAccessAskedThisSession = false;
  manageAccessGrantedThisSession = false;
  manageAccessPersistedGrant = null;
}

/**
 * Clears persisted and session manage-all-files flags (useful for tests/debug).
 */
export async function resetManageAccessPersistence(): Promise<void> {
  resetManageAccessSessionFlags();
  try {
    await AsyncStorage.removeItem(MANAGE_ACCESS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear persisted manage access flag:', error);
  }
}

/**
 * Attempt to request MANAGE_EXTERNAL_STORAGE via prompt + settings until granted.
 */
export async function requestAllFilesAccessUntilGranted(options?: ManageAllFilesOptions): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const version = getAndroidVersion();
  if (version < 30) {
    return true;
  }

  // If we already know (persisted) that it's granted, skip all prompting logic.
  if (!manageAccessGrantedThisSession) {
    const persistedGranted = await hydrateManageAccessPersistedFlag();
    if (persistedGranted) {
      manageAccessGrantedThisSession = true;
      return true;
    }
  }

  const {
    waitAfterSettingsMs = 800,
    assumeGrantedAfterSettings = true,
    onAttempt,
    onDenied,
    onGranted,
  } = options || {};

  // If already granted this session, skip prompting
  if (manageAccessGrantedThisSession) {
    return true;
  }

  // Check current state
  const alreadyGranted = await checkAllFilesAccessPermission();
  if (alreadyGranted) {
    manageAccessGrantedThisSession = true;
    await persistManageAccessGranted();
    onGranted?.();
    return true;
  }

  // If we already asked this session, do not reopen settings again
  if (manageAccessAskedThisSession) {
    onDenied?.(1);
    return false;
  }

  // First (and only) attempt this session
  manageAccessAskedThisSession = true;
  onAttempt?.(1);

  // Try the permission dialog first (some OEMs expose it)
  try {
    const manageResult = await PermissionsAndroid.request(
      MANAGE_EXTERNAL_STORAGE_PERMISSION,
    );
    if (manageResult === PermissionsAndroid.RESULTS.GRANTED) {
      manageAccessGrantedThisSession = true;
    await persistManageAccessGranted();
      onGranted?.();
      return true;
    }
  } catch (error) {
    console.warn('MANAGE_EXTERNAL_STORAGE request failed, falling back to settings:', error);
  }

  // Open settings for manual grant
  await openAllFilesAccessSettings();
  await waitForAppToBeActive();
  if (waitAfterSettingsMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitAfterSettingsMs));
  }

  const grantedAfterSettings = await checkAllFilesAccessPermission();
  if (grantedAfterSettings) {
    manageAccessGrantedThisSession = true;
    await persistManageAccessGranted();
    onGranted?.();
    return true;
  }

  if (assumeGrantedAfterSettings) {
    manageAccessGrantedThisSession = true;
    await persistManageAccessGranted();
    onGranted?.();
    return true;
  }

  onDenied?.(1);
  return false;
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

  const version = getAndroidVersion();
  
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
export async function requestAllSmartScanPermissions(options?: ManageAllFilesOptions): Promise<boolean> {
  // Non-Android platforms don't need these permissions
  if (Platform.OS !== 'android') {
    return true;
  }

  const version = getAndroidVersion();
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
  let standardPermissionsGranted = true;

  if (permissions.length) {
    // Request all standard storage permissions at once
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
  }

  // After standard permissions are handled, always request All Files Access on Android 11+
  if (version >= 30) {
    const manageGranted = await requestAllFilesAccessUntilGranted(options);
    return standardPermissionsGranted && manageGranted;
  }

  // For Android < 11, only standard permissions matter
  return standardPermissionsGranted;
}

