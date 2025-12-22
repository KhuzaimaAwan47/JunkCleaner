import RNFS from "react-native-fs";
import * as FileSystem from 'expo-file-system/legacy';

// Try to import getApps, but handle if it's not available
let getApps: ((options?: any) => Promise<any[]>) | null = null;
try {
  const appListModule = require("@zecky-dev/react-native-app-list");
  getApps = appListModule.getApps || appListModule.default?.getApps || null;
} catch (error) {
  console.warn('[CachesScanner] Could not import react-native-app-list:', error);
}

export interface CacheItem {
  path: string;
  size: number;
  type: 'corpse' | 'cache';
  packageName?: string; // For corpse items
  modifiedDate?: number;
}

const BATCH_SIZE = 50;

// Get Android data directories dynamically
const getAndroidDataPaths = (): string[] => {
  const paths: string[] = [];
  
  // Use RNFS to get external storage path
  if (RNFS.ExternalStorageDirectoryPath) {
    paths.push(`${RNFS.ExternalStorageDirectoryPath}/Android/data`);
    paths.push(`${RNFS.ExternalStorageDirectoryPath}/Android/obb`);
  }
  
  // Fallback to common paths
  paths.push('/storage/emulated/0/Android/data');
  paths.push('/storage/emulated/0/Android/obb');
  
  // Internal data (may require root, but try anyway)
  paths.push('/data/data');
  
  // Remove duplicates
  return [...new Set(paths)];
};

// Get accessible cache directories (workaround for Android 11+ restrictions)
const getAccessibleCachePaths = (): string[] => {
  const paths: string[] = [];
  
  // App's own cache directory (always accessible)
  if (RNFS.CachesDirectoryPath) {
    paths.push(RNFS.CachesDirectoryPath);
  }
  
  // External cache directory
  if (RNFS.ExternalCachesDirectoryPath) {
    paths.push(RNFS.ExternalCachesDirectoryPath);
  }
  
  // Document directory (may contain cache files)
  if (RNFS.DocumentDirectoryPath) {
    paths.push(RNFS.DocumentDirectoryPath);
  }
  
  // External directory
  if (RNFS.ExternalDirectoryPath) {
    paths.push(RNFS.ExternalDirectoryPath);
  }
  
  // Download directory (may contain cache files)
  if (RNFS.DownloadDirectoryPath) {
    paths.push(RNFS.DownloadDirectoryPath);
  }
  
  // Root external storage (scan for .cache directories)
  if (RNFS.ExternalStorageDirectoryPath) {
    paths.push(RNFS.ExternalStorageDirectoryPath);
  }
  
  return paths.filter(Boolean);
};

// System packages to exclude
const SYSTEM_PACKAGE_PREFIXES = [
  'android.',
  'com.android.',
  'com.google.',
  'com.qualcomm.',
  'com.samsung.',
  'com.huawei.',
  'com.miui.',
  'com.oneplus.',
];

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const isValidPackageName = (name: string): boolean => {
  // Package names follow pattern: com.example.app
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(name);
};

const isSystemPackage = (packageName: string): boolean => {
  return SYSTEM_PACKAGE_PREFIXES.some(prefix => packageName.startsWith(prefix));
};

/**
 * Calculate total size of a directory recursively
 */
const calculateDirectorySize = async (dirPath: string): Promise<number> => {
  if (!dirPath || typeof dirPath !== 'string') {
    return 0;
  }

  let totalSize = 0;
  const queue: string[] = [dirPath];
  const visited = new Set<string>(); // Prevent infinite loops

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir || visited.has(currentDir)) continue;
    visited.add(currentDir);

    try {
      // Try expo-file-system first
      let dirEntries: string[] = [];
      let useExpo = false;
      
      try {
        const uriPath = currentDir.startsWith('file://') ? currentDir : `file://${currentDir}`;
        dirEntries = await FileSystem.readDirectoryAsync(uriPath);
        useExpo = true;
      } catch {
        // Fallback to RNFS
        try {
          const rnfsEntries = await RNFS.readDir(currentDir);
          dirEntries = rnfsEntries.map(e => e.name);
          useExpo = false;
        } catch {
          // Skip directories we can't access
          continue;
        }
      }

      if (!dirEntries || dirEntries.length === 0) {
        continue;
      }

      const batches = chunkArray(dirEntries, BATCH_SIZE);
      
      // Process batches in parallel (up to 2 at a time for size calculation)
      for (let i = 0; i < batches.length; i += 2) {
        const batchGroup = batches.slice(i, i + 2);
        await Promise.all(
          batchGroup.map(async (batch) => {
            await Promise.all(
              batch.map(async (entryName) => {
                try {
                  if (!entryName || typeof entryName !== 'string') return;
                  
                  const entryPath = `${currentDir}/${entryName}`;
                  const uriPath = entryPath.startsWith('file://') ? entryPath : `file://${entryPath}`;
                  
                  if (useExpo) {
                    try {
                      const info = await FileSystem.getInfoAsync(uriPath);
                      if (info.exists) {
                        if (info.isDirectory) {
                          if (!visited.has(entryPath)) {
                            queue.push(entryPath);
                          }
                        } else if (typeof info.size === 'number') {
                          totalSize += info.size;
                        }
                      }
                    } catch {
                      // Skip entries we can't access
                    }
                  } else {
                    try {
                      const stat = await RNFS.stat(entryPath);
                      if (stat.isFile() && typeof stat.size === 'number') {
                        totalSize += stat.size;
                      } else if (stat.isDirectory() && entryPath) {
                        if (!visited.has(entryPath)) {
                          queue.push(entryPath);
                        }
                      }
                    } catch {
                      // Skip entries we can't access
                    }
                  }
                } catch (error) {
                  // Skip files/dirs we can't access
                }
              })
            );
          })
        );
      }
    } catch (error) {
      // Skip directories we can't access
    }
  }

  return totalSize;
};

/**
 * Get list of installed package names
 */
const getInstalledPackages = async (): Promise<Set<string>> => {
  if (!getApps) {
    console.warn('[CachesScanner] getApps function not available, using fallback mode');
    return new Set<string>();
  }
  
  try {
    const apps = await getApps();
    const packageSet = new Set<string>();
    
    console.log(`[CachesScanner] Retrieved ${apps?.length || 0} apps from getApps()`);
    
    if (!apps || !Array.isArray(apps)) {
      console.warn('[CachesScanner] getApps() did not return an array:', apps);
      return new Set<string>();
    }
    
    apps.forEach((app: any) => {
      // Handle different possible property names
      const packageName = app.packageName || app.package || app.package_name;
      if (packageName && typeof packageName === 'string') {
        packageSet.add(packageName);
      }
    });
    
    console.log(`[CachesScanner] Extracted ${packageSet.size} package names`);
    return packageSet;
  } catch (error) {
    console.error('[CachesScanner] Failed to get installed apps:', error);
    return new Set<string>();
  }
};

/**
 * Scan for corpse directories (data from uninstalled apps)
 */
const scanCorpses = async (
  installedPackages: Set<string>,
  androidDataPath: string
): Promise<CacheItem[]> => {
  const results: CacheItem[] = [];

  try {
    // Try expo-file-system first (better for Android scoped storage)
    let dirEntries: string[] = [];
    try {
      const uriPath = androidDataPath.startsWith('file://') ? androidDataPath : `file://${androidDataPath}`;
      dirEntries = await FileSystem.readDirectoryAsync(uriPath);
    } catch (expoError) {
      // Fallback to react-native-fs
      try {
        const rnfsEntries = await RNFS.readDir(androidDataPath);
        dirEntries = rnfsEntries.map(e => e.name);
      } catch (rnfsError: any) {
        const errorMsg = rnfsError?.message || String(rnfsError);
        console.warn(`[CachesScanner] Cannot read directory ${androidDataPath}:`, errorMsg);
        return results;
      }
    }
    
    if (!dirEntries || dirEntries.length === 0) {
      console.log(`[CachesScanner] No entries found in ${androidDataPath}`);
      return results;
    }
    
    console.log(`[CachesScanner] Found ${dirEntries.length} entries in ${androidDataPath}`);
    
    const batches = chunkArray(dirEntries, BATCH_SIZE);
    // Process batches in parallel (up to 3 at a time for better performance)
    for (let i = 0; i < batches.length; i += 3) {
      const batchGroup = batches.slice(i, i + 3);
      await Promise.all(
        batchGroup.map(async (batch) => {
          await Promise.all(
            batch.map(async (dirName) => {
              try {
                if (!dirName || typeof dirName !== 'string') return;
                
                const entryPath = `${androidDataPath}/${dirName}`;
                const uriPath = entryPath.startsWith('file://') ? entryPath : `file://${entryPath}`;
                
                // Check if it's a directory
                let isDir = false;
                try {
                  const info = await FileSystem.getInfoAsync(uriPath);
                  isDir = info.exists && info.isDirectory;
                } catch {
                  try {
                    const stat = await RNFS.stat(entryPath);
                    isDir = stat.isDirectory();
                  } catch {
                    return;
                  }
                }
                
                if (!isDir) return;
                
                // Check if this looks like a package name
                if (!isValidPackageName(dirName)) return;
                
                // Check if it's a system package (skip even if uninstalled)
                if (isSystemPackage(dirName)) return;
                
                // Check if package is not installed (corpse)
                if (installedPackages.has(dirName)) return;

                try {
                  const size = await calculateDirectorySize(entryPath);
                  if (size > 0) {
                    let modifiedDate: number | undefined = undefined;
                    try {
                      const info = await FileSystem.getInfoAsync(uriPath);
                      if (info.modificationTime) {
                        modifiedDate = info.modificationTime * 1000;
                      }
                    } catch {
                      try {
                        const stat = await RNFS.stat(entryPath);
                        if (stat.mtime) {
                          modifiedDate = stat.mtime.getTime ? stat.mtime.getTime() : stat.mtime;
                        }
                      } catch {
                        // Use undefined if stat fails
                      }
                    }
                    
                    results.push({
                      path: entryPath,
                      size,
                      type: 'corpse',
                      packageName: dirName,
                      modifiedDate,
                    });
                  }
                } catch (error) {
                  console.warn(`[CachesScanner] Failed to process corpse directory ${entryPath}:`, error);
                }
              } catch (entryError) {
                console.warn(`[CachesScanner] Error processing entry:`, entryError);
                // Continue with next entry
              }
            })
          );
        })
      );
    }
  } catch (error) {
    console.warn(`[CachesScanner] Failed to scan corpses in ${androidDataPath}:`, error);
  }

  return results;
};

/**
 * Scan for cache directories in installed apps
 * If installedPackages is empty, scan all directories (fallback mode)
 */
const scanAppCaches = async (
  installedPackages: Set<string>,
  androidDataPath: string,
  fallbackMode: boolean = false
): Promise<CacheItem[]> => {
  const results: CacheItem[] = [];

  try {
    // Try expo-file-system first (better for Android scoped storage)
    let dirEntries: string[] = [];
    let readError: any = null;
    
    try {
      // Convert path to file:// URI format for expo-file-system
      const uriPath = androidDataPath.startsWith('file://') ? androidDataPath : `file://${androidDataPath}`;
      console.log(`[CachesScanner] Trying expo-file-system with URI: ${uriPath}`);
      dirEntries = await FileSystem.readDirectoryAsync(uriPath);
      console.log(`[CachesScanner] expo-file-system succeeded, found ${dirEntries.length} entries`);
    } catch (expoError: any) {
      readError = expoError;
      console.warn(`[CachesScanner] expo-file-system failed:`, expoError?.message || String(expoError));
      
      // Fallback to react-native-fs
      try {
        console.log(`[CachesScanner] Trying react-native-fs fallback for: ${androidDataPath}`);
        const rnfsEntries = await RNFS.readDir(androidDataPath);
        dirEntries = rnfsEntries.map(e => e.name);
        console.log(`[CachesScanner] react-native-fs succeeded, found ${dirEntries.length} entries`);
      } catch (rnfsError: any) {
        const errorMsg = rnfsError?.message || String(rnfsError);
        console.warn(`[CachesScanner] Both file systems failed. expo: ${readError?.message}, rnfs: ${errorMsg}`);
        
        // Android 11+ scoped storage restriction - these directories are protected
        // Even with MANAGE_EXTERNAL_STORAGE, /Android/data and /Android/obb are restricted
        if (androidDataPath.includes('/Android/data') || androidDataPath.includes('/Android/obb')) {
          console.warn(`[CachesScanner] Cannot access ${androidDataPath} due to Android scoped storage restrictions. This directory requires special permissions or root access.`);
        }
        return results;
      }
    }
    
    if (!dirEntries || dirEntries.length === 0) {
      console.log(`[CachesScanner] No entries found in ${androidDataPath}`);
      return results;
    }
    
    console.log(`[CachesScanner] Scanning ${dirEntries.length} directories for caches in ${androidDataPath} (fallback: ${fallbackMode})`);
    
    const batches = chunkArray(dirEntries, BATCH_SIZE);
    let processedCount = 0;
    let cacheFoundCount = 0;
    
    // Process batches in parallel (up to 3 at a time)
    for (let i = 0; i < batches.length; i += 3) {
      const batchGroup = batches.slice(i, i + 3);
      await Promise.all(
        batchGroup.map(async (batch) => {
          await Promise.all(
            batch.map(async (dirName) => {
              try {
                if (!dirName || typeof dirName !== 'string') return;
                
                const entryPath = `${androidDataPath}/${dirName}`;
                const uriPath = entryPath.startsWith('file://') ? entryPath : `file://${entryPath}`;
                
                // Check if it's a directory using expo-file-system
                let isDir = false;
                try {
                  const info = await FileSystem.getInfoAsync(uriPath);
                  isDir = info.exists && info.isDirectory;
                } catch {
                  // Fallback to RNFS
                  try {
                    const stat = await RNFS.stat(entryPath);
                    isDir = stat.isDirectory();
                  } catch {
                    return; // Skip if we can't determine
                  }
                }
                
                if (!isDir) return;
                
                // In fallback mode, scan all valid package names
                // Otherwise, only scan installed packages
                if (!fallbackMode && !installedPackages.has(dirName)) return;
                
                // Skip if not a valid package name
                if (!isValidPackageName(dirName)) return;
                
                // Skip system packages
                if (isSystemPackage(dirName)) return;

                processedCount++;

                // Look for cache subdirectory
                const cachePath = `${entryPath}/cache`;
                const cacheUriPath = cachePath.startsWith('file://') ? cachePath : `file://${cachePath}`;
                
                try {
                  // Check if cache directory exists using expo-file-system
                  let cacheExists = false;
                  let cacheInfo: FileSystem.FileInfo | null = null;
                  
                  try {
                    cacheInfo = await FileSystem.getInfoAsync(cacheUriPath);
                    cacheExists = cacheInfo.exists && cacheInfo.isDirectory;
                  } catch {
                    // Fallback to RNFS
                    try {
                      const cacheStat = await RNFS.stat(cachePath);
                      cacheExists = cacheStat.isDirectory();
                    } catch {
                      // Cache doesn't exist, skip
                      return;
                    }
                  }
                  
                  if (cacheExists) {
                    const size = await calculateDirectorySize(cachePath);
                    if (size > 0) {
                      cacheFoundCount++;
                      const modifiedDate = cacheInfo?.modificationTime 
                        ? cacheInfo.modificationTime * 1000 
                        : undefined;
                      
                      results.push({
                        path: cachePath,
                        size,
                        type: 'cache',
                        packageName: dirName,
                        modifiedDate,
                      });
                    }
                  }
                } catch (cacheError) {
                  // Cache directory doesn't exist or can't be accessed
                  // This is normal, skip silently
                }
              } catch (entryError) {
                console.warn(`[CachesScanner] Error processing entry:`, entryError);
                // Continue with next entry
              }
            })
          );
        })
      );
    }
    
    console.log(`[CachesScanner] Processed ${processedCount} packages, found ${cacheFoundCount} with cache data`);
  } catch (error) {
    console.warn(`[CachesScanner] Failed to scan caches in ${androidDataPath}:`, error);
  }

  return results;
};

/**
 * Scan accessible directories for cache files (workaround for Android 11+)
 */
const scanAccessibleCaches = async (): Promise<CacheItem[]> => {
  const results: CacheItem[] = [];
  const accessiblePaths = getAccessibleCachePaths();
  
  console.log(`[CachesScanner] Scanning ${accessiblePaths.length} accessible paths for cache files`);
  
  for (const basePath of accessiblePaths) {
    try {
      // Recursively scan for cache directories and files
      const queue: string[] = [basePath];
      const visited = new Set<string>();
      
      while (queue.length > 0 && visited.size < 1000) { // Limit depth to prevent infinite loops
        const currentPath = queue.shift();
        if (!currentPath || visited.has(currentPath)) continue;
        visited.add(currentPath);
        
        try {
          let entries: string[] = [];
          try {
            const uriPath = currentPath.startsWith('file://') ? currentPath : `file://${currentPath}`;
            entries = await FileSystem.readDirectoryAsync(uriPath);
          } catch {
            try {
              const rnfsEntries = await RNFS.readDir(currentPath);
              entries = rnfsEntries.map(e => e.name);
            } catch {
              continue;
            }
          }
          
          for (const entryName of entries) {
            if (!entryName || entryName.startsWith('.')) continue;
            
            const entryPath = `${currentPath}/${entryName}`;
            const uriPath = entryPath.startsWith('file://') ? entryPath : `file://${entryPath}`;
            
            // Check if it's a cache directory or file
            const lowerName = entryName.toLowerCase();
            const isCacheDir = lowerName.includes('cache') || lowerName.includes('.cache');
            const isCacheFile = lowerName.endsWith('.cache') || lowerName.endsWith('.tmp');
            
            if (isCacheDir || isCacheFile) {
              try {
                let info: FileSystem.FileInfo | null = null;
                try {
                  info = await FileSystem.getInfoAsync(uriPath);
                } catch {
                  try {
                    const stat = await RNFS.stat(entryPath);
                    if (stat.isDirectory()) {
                      const size = await calculateDirectorySize(entryPath);
                      if (size > 0) {
                        results.push({
                          path: entryPath,
                          size,
                          type: 'cache',
                          modifiedDate: stat.mtime ? (stat.mtime.getTime ? stat.mtime.getTime() : stat.mtime) : undefined,
                        });
                      }
                    } else if (stat.isFile() && stat.size > 0) {
                      results.push({
                        path: entryPath,
                        size: stat.size,
                        type: 'cache',
                        modifiedDate: stat.mtime ? (stat.mtime.getTime ? stat.mtime.getTime() : stat.mtime) : undefined,
                      });
                    }
                  } catch {
                    continue;
                  }
                  continue;
                }
                
                if (info && info.exists) {
                  if (info.isDirectory) {
                    const size = await calculateDirectorySize(entryPath);
                    if (size > 0) {
                      results.push({
                        path: entryPath,
                        size,
                        type: 'cache',
                        modifiedDate: info.modificationTime ? info.modificationTime * 1000 : undefined,
                      });
                    }
                  } else if (typeof info.size === 'number' && info.size > 0) {
                    results.push({
                      path: entryPath,
                      size: info.size,
                      type: 'cache',
                      modifiedDate: info.modificationTime ? info.modificationTime * 1000 : undefined,
                    });
                  }
                }
              } catch {
                continue;
              }
            } else {
              // Continue scanning subdirectories
              if (!visited.has(entryPath) && visited.size < 1000) {
                queue.push(entryPath);
              }
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn(`[CachesScanner] Error scanning accessible path ${basePath}:`, error);
    }
  }
  
  return results;
};

/**
 * Main scan function - combines CorpseFinder and AppCleaner
 */
export const scanCaches = async (): Promise<CacheItem[]> => {
  const results: CacheItem[] = [];
  console.log('[CachesScanner] Starting cache scan...');

  try {
    // Get installed packages
    const installedPackages = await getInstalledPackages();
    const fallbackMode = installedPackages.size === 0;
    console.log(`[CachesScanner] Found ${installedPackages.size} installed packages (fallback mode: ${fallbackMode})`);
    
    // Get Android data paths dynamically
    const androidDataPaths = getAndroidDataPaths();
    console.log(`[CachesScanner] Scanning ${androidDataPaths.length} Android data paths:`, androidDataPaths);
    
    let androidDataAccessible = false;
    
    // Note: Android 11+ (API 30+) restricts access to /Android/data and /Android/obb
    // Even with MANAGE_EXTERNAL_STORAGE, these directories are protected by scoped storage
    // We'll try to access them but expect failures on Android 11+
    
    // Scan each Android data path
    for (const androidDataPath of androidDataPaths) {
      try {
        console.log(`[CachesScanner] Attempting to access: ${androidDataPath}`);
        
        // Check if path exists - try both file systems
        let pathExists = false;
        let isDirectory = false;
        
        try {
          const uriPath = androidDataPath.startsWith('file://') ? androidDataPath : `file://${androidDataPath}`;
          const info = await FileSystem.getInfoAsync(uriPath);
          pathExists = info.exists;
          isDirectory = info.isDirectory;
        } catch {
          try {
            const stat = await RNFS.stat(androidDataPath);
            pathExists = true;
            isDirectory = stat.isDirectory();
          } catch {
            console.log(`[CachesScanner] ${androidDataPath} does not exist or cannot be accessed`);
            continue;
          }
        }
        
        if (!pathExists || !isDirectory) {
          console.log(`[CachesScanner] ${androidDataPath} is not a directory, skipping`);
          continue;
        }

        console.log(`[CachesScanner] Successfully accessed: ${androidDataPath}`);

        // Scan for corpses (uninstalled app data) - only if we have package list
        if (!fallbackMode) {
          console.log(`[CachesScanner] Scanning for corpses in ${androidDataPath}...`);
          const corpses = await scanCorpses(installedPackages, androidDataPath);
          console.log(`[CachesScanner] Found ${corpses.length} corpses in ${androidDataPath}`);
          results.push(...corpses);
        }

        // Scan for caches (installed app caches)
        // Only scan in /Android/data, not /Android/obb
        if (androidDataPath.includes('/Android/data')) {
          console.log(`[CachesScanner] Scanning for caches in ${androidDataPath}...`);
          const caches = await scanAppCaches(installedPackages, androidDataPath, fallbackMode);
          console.log(`[CachesScanner] Found ${caches.length} caches in ${androidDataPath}`);
          results.push(...caches);
          if (caches.length > 0) {
            androidDataAccessible = true;
          }
        }
      } catch (error: any) {
        // Path doesn't exist or can't be accessed (e.g., requires root or scoped storage restriction)
        const errorMsg = error?.message || String(error);
        
        // Check if this is a scoped storage restriction
        if (androidDataPath.includes('/Android/data') || androidDataPath.includes('/Android/obb')) {
          console.warn(`[CachesScanner] Cannot access ${androidDataPath} - Android 11+ scoped storage restriction. These directories are protected even with MANAGE_EXTERNAL_STORAGE.`);
        } else {
          console.warn(`[CachesScanner] Cannot access ${androidDataPath}:`, errorMsg);
        }
        // Continue to next path
        continue;
      }
    }
    
    console.log(`[CachesScanner] Android data scan complete. Found ${results.length} items from Android data paths`);
    
    // If Android data paths are not accessible (Android 11+), scan accessible locations as fallback
    if (!androidDataAccessible || results.length === 0) {
      console.log('[CachesScanner] Android data paths not accessible, scanning accessible cache locations...');
      const accessibleCaches = await scanAccessibleCaches();
      console.log(`[CachesScanner] Found ${accessibleCaches.length} cache items in accessible locations`);
      results.push(...accessibleCaches);
    }
    
    console.log(`[CachesScanner] Scan complete. Found ${results.length} total cache items`);
  } catch (error) {
    console.error('[CachesScanner] Error scanning caches:', error);
    throw error;
  }

  return results.sort((a, b) => b.size - a.size);
};

/**
 * Delete cache items (directories)
 */
export const deleteCacheItems = async (items: CacheItem[]): Promise<void> => {
  await Promise.allSettled(
    items.map(async (item) => {
      try {
        // Use unlink for files, but we're dealing with directories
        // RNFS.unlink should work for directories too
        await RNFS.unlink(item.path);
      } catch (error) {
        console.warn(`Failed to delete ${item.path}:`, error);
        throw error;
      }
    })
  );
};

export default scanCaches;

