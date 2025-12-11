import DeviceInfo from 'react-native-device-info';

export interface MemoryInfo {
  total: number; // in GB
  used: number;  // in GB
  free: number;  // in GB
  usage: number; // 0-1 ratio
}

const BYTES_TO_GB = 1024 * 1024 * 1024;

const toGb = (bytes: number | null | undefined): number => {
  if (!bytes || bytes <= 0) return 0;
  return Math.round((bytes / BYTES_TO_GB) * 10) / 10; // 1 decimal place
};

/**
 * Get current device memory usage (best-effort).
 * Falls back gracefully if a platform does not expose used memory.
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  try {
    const totalBytes = await DeviceInfo.getTotalMemory();
    // getUsedMemory is Android-only; guard for undefined
    const usedBytes = typeof DeviceInfo.getUsedMemory === 'function'
      ? await DeviceInfo.getUsedMemory()
      : 0;

    const totalGb = toGb(totalBytes);
    const usedGb = toGb(usedBytes);
    const freeGb = Math.max(0, Math.round((totalGb - usedGb) * 10) / 10);
    const usageRatio = totalGb > 0 ? Math.min(1, Math.max(0, usedGb / totalGb)) : 0;

    return {
      total: totalGb,
      used: usedGb,
      free: freeGb,
      usage: usageRatio,
    };
  } catch (error) {
    console.error('Failed to get memory info:', error);
    return {
      total: 0,
      used: 0,
      free: 0,
      usage: 0,
    };
  }
}

