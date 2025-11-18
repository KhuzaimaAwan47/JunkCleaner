import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { InteractionManager } from 'react-native';
import { getCachedFile, initDatabase, saveFileCache } from './db';
import { computePartialHash } from './hashUtils';

export interface FileInfo {
  path: string;
  size: number;
  modifiedDate: number;
  uri?: string;
}

export interface DuplicateGroup {
  hash: string;
  files: FileInfo[];
  totalSize: number;
}

export interface ScanProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: 'scanning' | 'hashing';
  scannedFiles?: number;
  totalFiles?: number;
}

export interface ScanOptions {
  signal?: AbortSignal;
}

type ProgressCallback = (progress: ScanProgress) => void;

// Common image file extensions
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
  'tiff', 'tif', 'heic', 'heif', 'raw', 'cr2', 'nef', 'orf',
  'sr2', 'arw', 'dng', 'psd', 'ai', 'eps', 'pcx', 'tga'
]);

function isImageFile(filePath: string): boolean {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.has(extension) : false;
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error('SCAN_CANCELLED');
    error.name = 'SCAN_CANCELLED';
    throw error;
  }
}

initDatabase().catch(console.error);

async function requestPermissions(signal?: AbortSignal): Promise<boolean> {
  throwIfCancelled(signal);
  try {
    const currentStatus = await MediaLibrary.getPermissionsAsync();
    throwIfCancelled(signal);
    if (currentStatus.granted) {
      return true;
    }

    if (currentStatus.canAskAgain) {
      const requestResult = await MediaLibrary.requestPermissionsAsync();
      throwIfCancelled(signal);
      if (requestResult.granted) {
        return true;
      }
      console.warn('Media library permission not granted');
    } else {
      console.warn('Media library permission previously denied');
    }
  } catch (error) {
    console.warn('Media library permission request failed:', error);
  }

  return false;
}

async function scanAppDirectories(
  signal?: AbortSignal,
  onProgress?: (current: number, file: string) => void
): Promise<FileInfo[]> {
  throwIfCancelled(signal);
  const files: FileInfo[] = [];

  const documentDir = (FileSystem as any).documentDirectory;
  const cacheDir = (FileSystem as any).cacheDirectory;

  const directories = [documentDir, cacheDir].filter(Boolean) as string[];

  async function scanDirectory(dir: string): Promise<void> {
    throwIfCancelled(signal);
    try {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      throwIfCancelled(signal);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return;
      }

      const entries = await FileSystem.readDirectoryAsync(dir);
      throwIfCancelled(signal);

      for (const entry of entries) {
        throwIfCancelled(signal);
        const fullPath = `${dir}${entry}`;
        const info = await FileSystem.getInfoAsync(fullPath);
        throwIfCancelled(signal);

        if (!info.exists) {
          continue;
        }

        if (info.isDirectory) {
          await scanDirectory(`${fullPath}/`);
        } else {
          // Only include image files
          if (isImageFile(fullPath)) {
            files.push({
              path: fullPath,
              size: info.size || 0,
              modifiedDate: (info as any).modificationTime || Date.now(),
            });
            onProgress?.(files.length, entry);
          }
        }
      }
    } catch (error) {
      // Re-throw cancellation errors
      if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
        throw error;
      }
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  for (const dir of directories) {
    throwIfCancelled(signal);
    await scanDirectory(dir);
  }

  return files;
}

async function scanMediaLibrary(
  signal?: AbortSignal,
  onProgress?: (current: number, file: string) => void
): Promise<FileInfo[]> {
  throwIfCancelled(signal);
  const files: FileInfo[] = [];

  try {
    let hasNextPage = true;
    let after: string | undefined;

    while (hasNextPage) {
      throwIfCancelled(signal);
      const { assets, hasNextPage: nextPage, endCursor } = await MediaLibrary.getAssetsAsync({
        first: 1000,
        after,
        mediaType: ['photo'], // Only photos, not videos
      });

      for (const asset of assets) {
        throwIfCancelled(signal);
        try {
          // Double-check it's an image file by extension
          const fileName = asset.filename || asset.uri.split('/').pop() || '';
          if (!isImageFile(fileName)) {
            continue;
          }
          
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          throwIfCancelled(signal);
          const localUri = assetInfo.localUri || asset.uri;
          if (!localUri || !localUri.startsWith('file://')) {
            continue;
          }

          let size = (assetInfo as any).size ?? 0;
          if (!size) {
            try {
              const info = await FileSystem.getInfoAsync(localUri);
              throwIfCancelled(signal);
              size = info.exists && !info.isDirectory ? info.size || 0 : 0;
            } catch (fsError) {
              // Re-throw cancellation errors
              if ((fsError as Error).name === 'SCAN_CANCELLED' || (fsError as any)?.code === 'ABORT_ERR') {
                throw fsError;
              }
              size = 0;
            }
          }

          if (!size) {
            continue;
          }

          files.push({
            path: localUri,
            size,
            modifiedDate: (asset.modificationTime || Date.now() / 1000) * 1000,
            uri: asset.uri,
          });
          
          // Reuse fileName from above, or get from localUri if needed
          const displayFileName = asset.filename || localUri.split('/').pop() || 'Unknown';
          onProgress?.(files.length, displayFileName);
        } catch (assetError) {
          // Re-throw cancellation errors
          if ((assetError as Error).name === 'SCAN_CANCELLED' || (assetError as any)?.code === 'ABORT_ERR') {
            throw assetError;
          }
          console.warn(`Skipping media asset ${asset.id}:`, assetError);
        }
      }

      hasNextPage = nextPage;
      after = endCursor;
    }
  } catch (error) {
    // Re-throw cancellation errors
    if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
      throw error;
    }
    console.warn('Media library scan skipped:', error);
  }

  return files;
}

export async function scanForDuplicates(
  onProgress?: ProgressCallback,
  options?: ScanOptions
): Promise<DuplicateGroup[]> {
  const signal = options?.signal;
  throwIfCancelled(signal);
  const hasMediaLibraryPermission = await requestPermissions(signal);
  await initDatabase();

  let lastProgressUpdate = Date.now();
  const PROGRESS_UPDATE_INTERVAL = 100; // Update progress every 100ms (reduced frequency for performance)

  // Track scanning progress with better estimation
  const scanProgressCallback = (current: number, fileName: string) => {
    const now = Date.now();
    // Update less frequently during scanning to reduce overhead
    if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL || current % 50 === 0) {
      // Estimate total: scanned files + estimated duplicates (assume 10% have duplicates)
      const estimatedTotal = Math.max(current + 100, current * 1.1);
      onProgress?.({
        current: current,
        total: estimatedTotal,
        currentFile: fileName,
        stage: 'scanning',
        scannedFiles: current,
        totalFiles: estimatedTotal,
      });
      lastProgressUpdate = now;
    }
  };

  onProgress?.({
    current: 0,
    total: 100,
    currentFile: 'Scanning directories...',
    stage: 'scanning',
    scannedFiles: 0,
    totalFiles: 100,
  });

  // Start scanning in parallel
  const appFilesPromise = scanAppDirectories(signal, scanProgressCallback);
  const mediaFilesPromise = hasMediaLibraryPermission 
    ? scanMediaLibrary(signal, scanProgressCallback) 
    : Promise.resolve<FileInfo[]>([]);

  if (!hasMediaLibraryPermission) {
    console.warn('Skipping media library scan due to missing permissions');
  }

  // Use Promise.allSettled to handle cancellation better
  const [appFilesResult, mediaFilesResult] = await Promise.allSettled([
    appFilesPromise,
    mediaFilesPromise,
  ]);
  
  throwIfCancelled(signal);
  
  // Check if any promise was rejected due to cancellation
  if (appFilesResult.status === 'rejected') {
    const error = appFilesResult.reason;
    if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
      throw error;
    }
  }
  if (mediaFilesResult.status === 'rejected') {
    const error = mediaFilesResult.reason;
    if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
      throw error;
    }
  }
  
  const appFiles = appFilesResult.status === 'fulfilled' ? appFilesResult.value : [];
  const mediaFiles = mediaFilesResult.status === 'fulfilled' ? mediaFilesResult.value : [];
  
  const allFiles = [...appFiles, ...mediaFiles];
  const validFiles = allFiles.filter(file => file.size > 0 && isImageFile(file.path));

  onProgress?.({
    current: validFiles.length,
    total: validFiles.length * 2, // Scanning + hashing phases
    currentFile: 'Grouping by size...',
    stage: 'scanning',
    scannedFiles: validFiles.length,
    totalFiles: validFiles.length,
  });

  // Group by size (quick operation)
  const sizeGroups = new Map<number, FileInfo[]>();
  for (const file of validFiles) {
    throwIfCancelled(signal);
    // Additional check: ensure it's an image file
    if (!isImageFile(file.path)) {
      continue;
    }
    if (!sizeGroups.has(file.size)) {
      sizeGroups.set(file.size, []);
    }
    sizeGroups.get(file.size)!.push(file);
  }

  const candidateGroups = Array.from(sizeGroups.values()).filter(group => group.length > 1);
  const hashWorkTotal = candidateGroups.reduce((sum, group) => sum + group.length, 0);
  const totalWork = validFiles.length + hashWorkTotal;

  const partialHashGroups = new Map<string, FileInfo[]>();
  let workDone = validFiles.length; // Start from scanned files count
  let processedFiles = 0;

  // Process candidate files (only files that have same-size duplicates)
  for (const group of candidateGroups) {
    throwIfCancelled(signal);
    for (const file of group) {
      throwIfCancelled(signal);
      // Additional check: ensure it's an image file
      if (!isImageFile(file.path)) {
        continue;
      }
      processedFiles++;

      try {
        // Use existing file info from scanning phase (faster - avoid redundant file system calls)
        const currentSize = file.size;
        const currentModified = file.modifiedDate;
        
        // Check cache first, then compute hash if needed
        let partialHash: string;
        
        try {
          const cached = await getCachedFile(file.path);
          
          if (
            cached &&
            cached.partialHash &&
            cached.modifiedDate === currentModified &&
            cached.size === currentSize
          ) {
            // Use cached hash
            partialHash = cached.partialHash;
          } else {
            // Compute hash
            throwIfCancelled(signal);
            partialHash = await computePartialHash(file.path);
            
            // Save to cache (fire and forget to not block)
            saveFileCache({
              path: file.path,
              size: currentSize,
              partialHash,
              fullHash: null,
              modifiedDate: currentModified,
            }).catch(() => {
              // Silently fail cache save - not critical
            });
          }
        } catch (hashError) {
          // Skip file if hash computation fails
          console.error(`Failed to hash file ${file.path}:`, hashError);
          workDone++;
          continue;
        }

        // Group by hash
        if (!partialHashGroups.has(partialHash)) {
          partialHashGroups.set(partialHash, []);
        }
        partialHashGroups.get(partialHash)!.push(file);

        workDone++;
        
        // Update progress periodically (less frequent for better performance)
        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL || processedFiles % 5 === 0) {
          onProgress?.({
            current: workDone,
            total: totalWork,
            currentFile: file.path.split('/').pop() || file.path,
            stage: 'hashing',
            scannedFiles: validFiles.length,
            totalFiles: validFiles.length,
          });
          lastProgressUpdate = now;
        }

        // Yield to UI thread less frequently to improve performance
        // Also check for cancellation during yield
        if (processedFiles % 20 === 0) {
          throwIfCancelled(signal);
          await new Promise<void>(resolve => {
            InteractionManager.runAfterInteractions(() => {
              throwIfCancelled(signal);
              resolve();
            });
          });
        }
      } catch (error) {
        // Re-throw cancellation errors
        if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
          throw error;
        }
        console.error(`Error processing file ${file.path}:`, error);
        workDone++;
      }
    }
  }

  // Create duplicate groups from partial hash groups
  const duplicateGroups: DuplicateGroup[] = [];
  const partialGroupsToProcess = Array.from(partialHashGroups.entries()).filter(([, files]) => files.length > 1);

  for (const [partialHash, files] of partialGroupsToProcess) {
    throwIfCancelled(signal);
    duplicateGroups.push({
      hash: partialHash,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    });
  }

  onProgress?.({
    current: totalWork,
    total: totalWork,
    currentFile: 'Complete',
    stage: 'hashing',
    scannedFiles: validFiles.length,
    totalFiles: validFiles.length,
  });

  return duplicateGroups;
}
