import RNFS from 'react-native-fs';

export interface StorageInfo {
  total: number; // Total storage in GB
  free: number; // Free storage in GB
  used: number; // Used storage in GB
}

/**
 * Get real device storage information
 * Returns total, free, and used storage in GB
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const fsInfo = await RNFS.getFSInfo();
    
    // Convert bytes to GB (1 GB = 1024^3 bytes)
    const BYTES_TO_GB = 1024 * 1024 * 1024;
    const total = (fsInfo.totalSpace || 0) / BYTES_TO_GB;
    const free = (fsInfo.freeSpace || 0) / BYTES_TO_GB;
    const used = total - free;
    
    return {
      total: Math.round(total * 10) / 10, // Round to 1 decimal
      free: Math.round(free * 10) / 10,
      used: Math.round(used * 10) / 10,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    // Return default values if storage info cannot be retrieved
    return {
      total: 0,
      free: 0,
      used: 0,
    };
  }
}

