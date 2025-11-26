import { useCallback, useRef, useState } from 'react';
import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

export type ApkFileType = 'apk' | 'bundle';

export type ApkFile = {
  path: string;
  size: number;
  name: string;
  fileType: ApkFileType;
  isSignatureMatch: boolean;
};

export interface ApkScanProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: 'scanning' | 'hashing';
  scannedFiles?: number;
  totalFiles?: number;
}

const INSTALLER_DIRS = [
  '/storage/emulated/0/Download',
  '/storage/emulated/0/',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/Android/data',
  '/storage/emulated/0/Android/media',
  '/storage/emulated/0/Android/obb',
];

const INSTALLER_EXTENSIONS = ['.apk', '.apks', '.xapk', '.obb'];

const CANCELLED_ERROR = 'SCAN_CANCELLED';

const initialProgress: ApkScanProgress = {
  current: 0,
  total: 0,
  currentFile: '',
  stage: 'scanning',
  scannedFiles: 0,
  totalFiles: 0,
};

const isInstallerFile = (path: string): boolean => {
  const lower = path.toLowerCase();
  return INSTALLER_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const shouldQueueDirectory = (path: string): boolean => {
  return (
    path.includes('Download') ||
    path.includes('obb') ||
    path.includes('Android') ||
    path.includes('Documents')
  );
};

const inferFileType = (path: string): ApkFileType => {
  return path.toLowerCase().endsWith('.apk') ? 'apk' : 'bundle';
};

type ScanInstallerOptions = {
  onProgress?: (processed: number, currentFile: string) => void;
  isCancelled?: () => boolean;
};

const throwIfCancelled = (options?: ScanInstallerOptions) => {
  if (options?.isCancelled?.()) {
    const error = new Error(CANCELLED_ERROR);
    error.name = CANCELLED_ERROR;
    throw error;
  }
};

const isPermissionGranted = async (permission?: Permission | null): Promise<boolean> => {
  if (!permission) {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.check(permission as never);
    return granted === true;
  } catch {
    return false;
  }
};

const filterAvailablePermissions = (permissions: Array<Permission | undefined | null>) =>
  permissions.filter((perm): perm is Permission => Boolean(perm));

export const askStoragePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
  const isAndroid13Plus = apiLevel >= 33;
  const isAndroid10Plus = apiLevel >= 29;

  const permissionCandidates = isAndroid13Plus
    ? [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ]
    : [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        isAndroid10Plus ? undefined : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

  const permissions = filterAvailablePermissions(permissionCandidates);
  if (permissions.length === 0) {
    return true;
  }

  try {
    const alreadyGranted = await Promise.all(
      permissions.map(permission => isPermissionGranted(permission)),
    );
    if (alreadyGranted.every(Boolean)) {
      return true;
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(permission => results[permission] === 'granted');
  } catch {
    return false;
  }
};

export const scanInstallerFiles = async (
  options?: ScanInstallerOptions,
): Promise<ApkFile[]> => {
  const results = new Map<string, ApkFile>();
  const visited = new Set<string>();
  const queue = [...INSTALLER_DIRS];
  let processed = 0;

  while (queue.length > 0) {
    throwIfCancelled(options);

    const dir = queue.pop()!;
    if (visited.has(dir)) {
      continue;
    }
    visited.add(dir);

    let contents: RNFS.ReadDirItem[];
    try {
      contents = await RNFS.readDir(dir);
    } catch {
      continue;
    }

    for (const item of contents) {
      throwIfCancelled(options);

      const itemPath = item.path;
      const itemName = item.name || itemPath.split('/').pop() || 'entry';
      processed += 1;
      options?.onProgress?.(processed, itemName);

      if (item.isDirectory()) {
        if (shouldQueueDirectory(itemPath)) {
          queue.push(itemPath);
        }
        continue;
      }

      if (isInstallerFile(itemPath)) {
        const size = Number(item.size) || 0;
        results.set(itemPath, {
          path: itemPath,
          size,
          name: itemName,
          fileType: inferFileType(itemPath),
          isSignatureMatch: false,
        });
      }
    }
  }

  return Array.from(results.values());
};

export function useAPKScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ApkScanProgress>(initialProgress);
  const [results, setResults] = useState<ApkFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const stopScan = useCallback(() => {
    if (!isScanning) {
      cancelRef.current = true;
      return;
    }

    cancelRef.current = true;
    setIsScanning(false);
    setProgress(prev => ({
      ...prev,
      currentFile: 'Cancelled',
    }));
  }, [isScanning]);

  const startScan = useCallback(async (): Promise<void> => {
    if (isScanning) {
      return;
    }

    cancelRef.current = false;
    setError(null);
    setResults([]);
    setProgress({
      ...initialProgress,
      currentFile: 'Scanning installers...',
    });
    setIsScanning(true);

    const granted = await askStoragePermissions();
    if (!granted) {
      setIsScanning(false);
      setProgress(prev => ({
        ...prev,
        currentFile: 'Permission required',
      }));
      setError('storage access denied. enable permissions to scan downloads.');
      return;
    }

    try {
      const files = await scanInstallerFiles({
        onProgress: (current, currentFile) => {
          if (cancelRef.current) {
            return;
          }

          setProgress(prev => ({
            current,
            total: Math.max(prev.total, current + 100),
            currentFile,
            stage: 'scanning',
            scannedFiles: current,
            totalFiles: Math.max(prev.totalFiles ?? 0, current + 100),
          }));
        },
        isCancelled: () => cancelRef.current,
      });

      if (cancelRef.current) {
        setIsScanning(false);
        setResults([]);
        setProgress(prev => ({
          ...prev,
          currentFile: 'Cancelled',
        }));
        return;
      }

      setResults(files);
      setProgress({
        current: files.length,
        total: files.length || 1,
        currentFile: 'Complete',
        stage: 'hashing',
        scannedFiles: files.length,
        totalFiles: files.length || 1,
      });
      setIsScanning(false);
    } catch (err) {
      const errorObj = err as Error;
      if (errorObj.name === CANCELLED_ERROR) {
        setProgress(prev => ({
          ...prev,
          currentFile: 'Cancelled',
        }));
      } else {
        console.error('APK scan failed:', errorObj);
        setError(errorObj.message || 'unknown error occurred while scanning installers');
      }
      setIsScanning(false);
    }
  }, [isScanning]);

  return {
    startScan,
    stopScan,
    scanForApks: startScan,
    loading: isScanning,
    isScanning,
    progress,
    results,
    error,
  };
}

export default function APKScannerPlaceholder() {
  return null;
}

