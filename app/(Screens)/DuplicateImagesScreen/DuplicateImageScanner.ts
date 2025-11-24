import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { ReactNode, createContext, createElement, useContext } from 'react';
import { InteractionManager } from 'react-native';
import { ScannerState, useDuplicateScanner } from '../../../hooks/useDuplicateScanner';
import { getCachedFile, initDatabase, saveFileCache } from '../../../utils/db';

interface ScannerContextType extends ScannerState {
  startScan: () => Promise<void>;
  stopScan: () => void;
  reset: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const scanner = useDuplicateScanner();

  return createElement(ScannerContext.Provider, { value: scanner }, children);
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB
const BASE64_ENCODING = ((FileSystem as any).EncodingType?.Base64 ?? 'base64') as 'base64';

function bufferToWordArray(buffer: Buffer) {
  const words = [];
  for (let i = 0; i < buffer.length; i += 4) {
    words.push(
      (buffer[i] << 24) |
        ((buffer[i + 1] ?? 0) << 16) |
        ((buffer[i + 2] ?? 0) << 8) |
        (buffer[i + 3] ?? 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, buffer.length);
}

async function readFileAsBuffer(
  filePath: string,
  options?: { position?: number; length?: number }
): Promise<Buffer> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: BASE64_ENCODING as any,
    ...(options?.position !== undefined && options?.length !== undefined
      ? { position: options.position, length: options.length }
      : {}),
  });

  return Buffer.from(base64, 'base64');
}

/**
 * Chunked Hashing (Partial Hashing) - Computes hash using first and last 1MB chunks
 * For files <= 2MB, hashes the entire file
 */
export async function computePartialHash(filePath: string): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists || fileInfo.isDirectory) {
      throw new Error('File does not exist or is a directory');
    }

    const fileSize = fileInfo.size || 0;

    if (fileSize === 0) {
      throw new Error('Cannot hash empty file');
    }

    if (fileSize <= 2 * CHUNK_SIZE) {
      const fileData = await readFileAsBuffer(filePath);
      const wordArray = bufferToWordArray(fileData);
      return CryptoJS.SHA1(wordArray).toString();
    }

    const firstChunk = await readFileAsBuffer(filePath, {
      position: 0,
      length: CHUNK_SIZE,
    });

    const lastChunkStart = fileSize - CHUNK_SIZE;
    const lastChunk = await readFileAsBuffer(filePath, {
      position: lastChunkStart,
      length: CHUNK_SIZE,
    });

    const combinedData = Buffer.concat([firstChunk, lastChunk]);

    const wordArray = bufferToWordArray(combinedData);
    const partialHash = CryptoJS.SHA1(wordArray).toString();

    return partialHash;
  } catch (error) {
    console.error(`Error computing partial hash for ${filePath}:`, error);
    throw error;
  }
}

globalThis.Buffer = globalThis.Buffer || Buffer;

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
        mediaType: ['photo'],
      });

      for (const asset of assets) {
        throwIfCancelled(signal);
        try {
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
          
          const displayFileName = asset.filename || localUri.split('/').pop() || 'Unknown';
          onProgress?.(files.length, displayFileName);
        } catch (assetError) {
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
  const PROGRESS_UPDATE_INTERVAL = 100;

  const scanProgressCallback = (current: number, fileName: string) => {
    const now = Date.now();
    if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL || current % 50 === 0) {
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

  const appFilesPromise = scanAppDirectories(signal, scanProgressCallback);
  const mediaFilesPromise = hasMediaLibraryPermission 
    ? scanMediaLibrary(signal, scanProgressCallback) 
    : Promise.resolve<FileInfo[]>([]);

  if (!hasMediaLibraryPermission) {
    console.warn('Skipping media library scan due to missing permissions');
  }

  const [appFilesResult, mediaFilesResult] = await Promise.allSettled([
    appFilesPromise,
    mediaFilesPromise,
  ]);
  
  throwIfCancelled(signal);
  
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
    total: validFiles.length * 2,
    currentFile: 'Grouping by size...',
    stage: 'scanning',
    scannedFiles: validFiles.length,
    totalFiles: validFiles.length,
  });

  const sizeGroups = new Map<number, FileInfo[]>();
  for (const file of validFiles) {
    throwIfCancelled(signal);
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
  let workDone = validFiles.length;
  let processedFiles = 0;

  for (const group of candidateGroups) {
    throwIfCancelled(signal);
    for (const file of group) {
      throwIfCancelled(signal);
      if (!isImageFile(file.path)) {
        continue;
      }
      processedFiles++;

      try {
        const currentSize = file.size;
        const currentModified = file.modifiedDate;
        
        let partialHash: string;
        
        try {
          const cached = await getCachedFile(file.path);
          
          if (
            cached &&
            cached.partialHash &&
            cached.modifiedDate === currentModified &&
            cached.size === currentSize
          ) {
            partialHash = cached.partialHash;
          } else {
            throwIfCancelled(signal);
            partialHash = await computePartialHash(file.path);
            
            saveFileCache({
              path: file.path,
              size: currentSize,
              partialHash,
              fullHash: null,
              modifiedDate: currentModified,
            }).catch(() => {});
          }
        } catch (hashError) {
          console.error(`Failed to hash file ${file.path}:`, hashError);
          workDone++;
          continue;
        }

        if (!partialHashGroups.has(partialHash)) {
          partialHashGroups.set(partialHash, []);
        }
        partialHashGroups.get(partialHash)!.push(file);

        workDone++;
        
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
        if ((error as Error).name === 'SCAN_CANCELLED' || (error as any)?.code === 'ABORT_ERR') {
          throw error;
        }
        console.error(`Error processing file ${file.path}:`, error);
        workDone++;
      }
    }
  }

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

export default function DuplicateImageScanner() {
  return null;
}


