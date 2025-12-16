import { PermissionsAndroid, Platform } from 'react-native';

type Permission = (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

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

  // Request all permissions at once
  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    // Check if all permissions were granted
    const allGranted = permissions.every(
      (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
    );
    
    return allGranted;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

