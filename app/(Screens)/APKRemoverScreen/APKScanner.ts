import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Permission } from 'react-native';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import * as RNFS from 'react-native-fs';
import { loadApkScanResults, saveApkScanResults } from '../../../utils/db';

// ============================================================================
// Types
// ============================================================================

export type ApkFileType = 'apk' | 'split' | 'bundle';

export type ApkFile = {
  path: string;
  size: number;
  name: string;
  isSignatureMatch: boolean;
  fileType: ApkFileType;
};

export interface ApkScanProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: 'scanning' | 'hashing';
  scannedFiles?: number;
  totalFiles?: number;
}

type ApkProgressCallback = (progress: ApkScanProgress) => void;
type FileProgressCallback = (fileName: string) => void;

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error('SCAN_CANCELLED');
    error.name = 'SCAN_CANCELLED';
    throw error;
  }
}

// ============================================================================
// Constants
// ============================================================================

const MIN_APK_SIZE = 300 * 1024; // 300KB
const MAX_APK_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
const PREFERRED_MIN_SIZE = 500 * 1024; // 500KB
const PREFERRED_MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..

const ROOT_PATHS = [
  '/storage/emulated/0',
  '/sdcard',
  '/mnt/media_rw',
];

const PRIORITY_DIRECTORIES = [
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/APKs',
  '/storage/emulated/0/Bluetooth',
];

const SENSITIVE_PATHS = [
  '/system',
  '/proc',
  '/sys',
  '/dev',
  '/data/data',
  '/data/user',
  '/data/system',
  '/data/local',
  '/cache',
  '/acct',
  '/config',
];

const RESTRICTED_ROOTS = new Set(
  [
    '/mnt/media_rw',
    '/storage/emulated/0/Android/data',
    '/storage/emulated/0/Android/obb',
    '/sdcard/Android/data',
    '/sdcard/Android/obb',
    '/mnt/media_rw/Android/data',
    '/mnt/media_rw/Android/obb',
  ].map((path) => path.replace(/\/+$/, '')),
);

// Regex patterns for APK filename matching
const APK_PATTERNS = [
  /\.apk$/i,
  /base-.*\.apk$/i,
  /split-.*\.apk$/i,
];

const APK_TYPE_PATTERNS: { regex: RegExp; fileType: ApkFileType }[] = [
  { regex: /split-.*\.apk$/i, fileType: 'split' },
  { regex: /base-.*\.apk$/i, fileType: 'apk' },
  { regex: /\.apk$/i, fileType: 'apk' },
  { regex: /\.apks$/i, fileType: 'bundle' },
  { regex: /\.xapk$/i, fileType: 'bundle' },
  { regex: /\.aab$/i, fileType: 'bundle' },
];

// Additional hints let us surface obvious installers that might have been renamed (e.g. myapp.apk.backup)
// while filtering out WhatsApp DOC/PDF payloads that used to appear because they share the ZIP signature.
const APK_KEYWORD_HINTS = ['.apk', '.apks', '.xapk', '.aab'];

const loggedPathWarnings = new Set<string>();
let managePermissionPromptShown = false;

function getManageAllFilesPermission(): Permission {
  const permissionSet = PermissionsAndroid.PERMISSIONS as Record<string, Permission>;
  return (
    permissionSet?.MANAGE_EXTERNAL_STORAGE ||
    ('android.permission.MANAGE_EXTERNAL_STORAGE' as Permission)
  );
}

function logScanWarning(path: string, error: unknown) {
  if (loggedPathWarnings.has(path)) {
    return;
  }
  loggedPathWarnings.add(path);
  console.warn(`Failed to scan directory ${path}:`, error);
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '');
}

function isRestrictedRoot(path: string): boolean {
  return RESTRICTED_ROOTS.has(normalizePath(path));
}

function getAndroidPackageName(): string | undefined {
  return (
    Constants?.expoConfig?.android?.package ||
    (Constants as any)?.manifest?.android?.package ||
    (Constants as any)?.manifest2?.extra?.expoClient?.androidPackage
  );
}

async function openManageAllFilesPermissionSettings() {
  if (Platform.OS !== 'android') {
    return;
  }

  const packageName = getAndroidPackageName();
  Alert.alert(
    'Grant storage access',
    'Allow JunkCleaner to manage all files in system settings, then return to resume scanning.',
  );

  try {
    if (packageName) {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
        { data: `package:${packageName}` },
      );
      return;
    }

    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.MANAGE_ALL_FILES_ACCESS_PERMISSION,
    );
  } catch (error) {
    console.warn('Unable to launch manage-all-files settings:', error);
  }
}

async function hasManageAllFilesPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || getAndroidApiLevel() < 30) {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.check(getManageAllFilesPermission());
    return granted === true;
  } catch (error) {
    console.warn('Failed to check MANAGE_EXTERNAL_STORAGE:', error);
    return false;
  }
}

async function ensureManageAllFilesPermission(forcePrompt = false): Promise<boolean> {
  const hasPermission = await hasManageAllFilesPermission();
  if (hasPermission) {
    managePermissionPromptShown = false;
    return true;
  }

  if (!forcePrompt && managePermissionPromptShown) {
    return false;
  }

  managePermissionPromptShown = true;
  await openManageAllFilesPermissionSettings();
  return false;
}

// ============================================================================
// Permission Request Logic
// ============================================================================

/**
 * Detects Android API level
 */
function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return Platform.Version as number;
}

/**
 * Checks if a permission is granted
 */
async function checkPermission(permission: string): Promise<boolean> {
  try {
    const result = await PermissionsAndroid.check(permission as any);
    return result === true;
  } catch (error) {
    console.warn(`Failed to check permission ${permission}:`, error);
    return false;
  }
}

/**
 * Requests storage permissions based on Android API level
 * API >= 33: READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO
 * API < 33: READ_EXTERNAL_STORAGE + WRITE_EXTERNAL_STORAGE
 */
type StoragePermissionOptions = {
  forceManagePrompt?: boolean;
};

export async function requestStoragePermissions(
  options: StoragePermissionOptions = {},
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const apiLevel = getAndroidApiLevel();

  try {
    if (apiLevel >= 33) {
      // Android 13+ (API 33+)
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

      // Check if all permissions are already granted
      const allGranted = await Promise.all(
        permissions.map(perm => checkPermission(perm))
      );

      if (allGranted.every(granted => granted)) {
        return true;
      }

      // Request permissions
      const result = await PermissionsAndroid.requestMultiple(permissions);

      // Check if all permissions were granted
      const allPermissionsGranted = permissions.every(
        permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allPermissionsGranted) {
        return false;
      }

      return ensureManageAllFilesPermission(options.forceManagePrompt);
    } else {
      // Android 12 and below (API < 33)
      const readPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const writePermission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

      // Check if permissions are already granted
      const readGranted = await checkPermission(readPermission);
      const writeGranted = await checkPermission(writePermission);

      if (readGranted && writeGranted) {
        return true;
      }

      // Request permissions
      const permissions = [readPermission];
      if (apiLevel < 29) {
        // WRITE_EXTERNAL_STORAGE is not needed on API 29+
        permissions.push(writePermission);
      }

      const result = await PermissionsAndroid.requestMultiple(permissions);

      const readResult = result[readPermission];
      const writeResult =
        apiLevel < 29 ? result[writePermission] : PermissionsAndroid.RESULTS.GRANTED;

      const granted =
        readResult === PermissionsAndroid.RESULTS.GRANTED &&
        writeResult === PermissionsAndroid.RESULTS.GRANTED;

      if (!granted) {
        return false;
      }

      if (apiLevel >= 30) {
        return ensureManageAllFilesPermission(options.forceManagePrompt);
      }

      return true;
    }
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

/**
 * Checks if storage permissions are granted
 */
async function hasStoragePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const apiLevel = getAndroidApiLevel();

  try {
    const requiresManagePermission = apiLevel >= 30;
    if (apiLevel >= 33) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

      const results = await Promise.all(
        permissions.map(perm => checkPermission(perm))
      );

      const granted = results.every(result => result);
      if (!granted) {
        return false;
      }

      return requiresManagePermission ? hasManageAllFilesPermission() : true;
    } else {
      const readPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const writePermission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      const readGranted = await checkPermission(readPermission);
      const writeGranted = apiLevel < 29 ? await checkPermission(writePermission) : true;

      if (!readGranted || !writeGranted) {
        return false;
      }

      return requiresManagePermission ? hasManageAllFilesPermission() : true;
    }
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// ============================================================================
// Algorithm 3: APK Signature Detection
// ============================================================================

/**
 * Reads the first 4 bytes of a file to check for ZIP signature
 */
async function checkZipSignature(filePath: string): Promise<boolean> {
  try {
    const bytes = await RNFS.read(filePath, 4, 0, 'base64');
    const buffer = Buffer.from(bytes, 'base64');
    return buffer.equals(ZIP_SIGNATURE);
  } catch {
    // If we can't read the file, assume it's not a valid APK
    return false;
  }
}

// ============================================================================
// Algorithm 2: Regex Filename Matching
// ============================================================================

/**
 * Checks if filename matches APK patterns
 */
function matchesApkPattern(filename: string): boolean {
  return APK_PATTERNS.some(pattern => pattern.test(filename));
}

type ClassificationResult =
  | { isInstaller: false }
  | { isInstaller: true; fileType: ApkFileType };

function classifyInstallerCandidate(filename: string): ClassificationResult {
  const normalized = (filename || '').toLowerCase();
  if (!normalized) {
    return { isInstaller: false };
  }

  for (const { regex, fileType } of APK_TYPE_PATTERNS) {
    if (regex.test(normalized)) {
      return { isInstaller: true, fileType };
    }
  }

  for (const hint of APK_KEYWORD_HINTS) {
    if (normalized.includes(hint)) {
      const hintedType: ApkFileType = hint === '.apk' ? 'apk' : 'bundle';
      return { isInstaller: true, fileType: hintedType };
    }
  }

  return { isInstaller: false };
}

// ============================================================================
// Algorithm 5: Size Heuristic Filtering
// ============================================================================

/**
 * Checks if file size is within acceptable APK range
 * Signature match overrides size rule
 */
function isValidApkSize(size: number, isSignatureMatch: boolean): boolean {
  // Signature match overrides size rule
  if (isSignatureMatch) {
    return size >= MIN_APK_SIZE && size <= MAX_APK_SIZE;
  }

  // For non-signature matches, use preferred size range
  return size >= PREFERRED_MIN_SIZE && size <= PREFERRED_MAX_SIZE;
}

// ============================================================================
// Algorithm 4: Priority Directory Scanning
// ============================================================================

/**
 * Scans priority directories first
 */
async function scanPriorityDirectories(
  signal?: AbortSignal,
  onFileProcessed?: FileProgressCallback,
): Promise<ApkFile[]> {
  const results: ApkFile[] = [];

  for (const dir of PRIORITY_DIRECTORIES) {
    if (signal?.aborted) break;

    try {
      throwIfCancelled(signal);
      const exists = await RNFS.exists(dir);
      if (!exists) continue;

      const files = await scanDirectory(dir, signal, onFileProcessed);
      results.push(...files);
    } catch (error) {
      logScanWarning(dir, error);
    }
  }

  // Android/data access is blocked on modern Android versions without MANAGE_EXTERNAL_STORAGE,
  // so we skip scanning it to avoid noisy errors. When elevated access is supported, this block
  // can be reintroduced with SAF or the all-files permission workflow.

  return results;
}

// ============================================================================
// Algorithm 1: BFS Directory Traversal
// ============================================================================

/**
 * Checks if a path should be skipped (sensitive/system paths)
 */
function shouldSkipPath(path: string): boolean {
  return SENSITIVE_PATHS.some(sensitive => path.startsWith(sensitive));
}

/**
 * Scans a single directory (used for priority directories)
 */
async function scanDirectory(
  dirPath: string,
  signal?: AbortSignal,
  onFileProcessed?: FileProgressCallback,
): Promise<ApkFile[]> {
  const results: ApkFile[] = [];

  if (signal?.aborted || shouldSkipPath(dirPath) || isRestrictedRoot(dirPath)) {
    return results;
  }

  try {
    throwIfCancelled(signal);
    const exists = await RNFS.exists(dirPath);
    if (!exists) {
      return results;
    }

    const stat = await RNFS.stat(dirPath);
    if (!stat.isDirectory()) {
      return results;
    }

    const entries = await RNFS.readDir(dirPath);

    for (const entry of entries) {
      if (signal?.aborted) break;

      try {
        throwIfCancelled(signal);
        if (entry.isDirectory()) {
          // Recursively scan subdirectories for priority directories
          const subResults = await scanDirectory(entry.path, signal, onFileProcessed);
          results.push(...subResults);
        } else if (entry.isFile()) {
          // Process file
          const apkFile = await processFile(
            entry.path,
            entry.name,
            Number(entry.size) || 0
          );
          if (apkFile) {
            results.push(apkFile);
          }
          onFileProcessed?.(entry.name || entry.path);
        }
      } catch {
        // Skip unreadable files/directories
        continue;
      }
    }
  } catch (error) {
    // Skip unreadable directories
    logScanWarning(dirPath, error);
  }

  return results;
}

/**
 * Processes a single file to check if it's an APK
 */
async function processFile(
  filePath: string,
  fileName: string,
  fileSize: number
): Promise<ApkFile | null> {
  const classification = classifyInstallerCandidate(fileName);
  if (!classification.isInstaller) {
    return null;
  }

  let normalizedSize = fileSize;

  if (!normalizedSize || Number.isNaN(normalizedSize)) {
    try {
      const fileInfo = await RNFS.stat(filePath);
      normalizedSize = Number(fileInfo.size) || 0;
    } catch {
      normalizedSize = 0;
    }
  }

  if (!normalizedSize) {
    return null;
  }
  // Algorithm 2: Regex filename matching
  const matchesPattern = matchesApkPattern(fileName);

  // Algorithm 3: APK signature detection
  let isSignatureMatch = false;
  if (!matchesPattern) {
    isSignatureMatch = await checkZipSignature(filePath);
  } else {
    // If it matches pattern, also verify signature
    isSignatureMatch = await checkZipSignature(filePath);
  }

  // Algorithm 5: Size heuristic filtering
  const isValidSize = isValidApkSize(normalizedSize, isSignatureMatch);

  // Accept file if:
  // 1. Matches pattern OR has signature match
  // 2. AND passes size validation
  if ((matchesPattern || isSignatureMatch) && isValidSize) {
    return {
      path: filePath,
      size: normalizedSize,
      name: fileName,
      isSignatureMatch,
      fileType: classification.fileType,
    };
  }

  return null;
}

/**
 * BFS traversal starting from root paths using queue-based approach
 */
async function bfsTraversal(
  signal?: AbortSignal,
  onFileProcessed?: FileProgressCallback,
): Promise<ApkFile[]> {
  const results: ApkFile[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Initialize queue with root paths
  for (const rootPath of ROOT_PATHS) {
    if (signal?.aborted) break;
    
    try {
      throwIfCancelled(signal);
      const exists = await RNFS.exists(rootPath);
      if (
        exists &&
        !visited.has(rootPath) &&
        !shouldSkipPath(rootPath) &&
        !isRestrictedRoot(rootPath)
      ) {
        queue.push(rootPath);
        visited.add(rootPath);
      }
    } catch (error) {
      logScanWarning(rootPath, error);
    }
  }

  // Process queue
  while (queue.length > 0 && !signal?.aborted) {
    const currentDir = queue.shift()!;

    try {
      throwIfCancelled(signal);
      const exists = await RNFS.exists(currentDir);
      if (!exists) {
        continue;
      }

      const stat = await RNFS.stat(currentDir);
      if (!stat.isDirectory()) {
        continue;
      }

      const entries = await RNFS.readDir(currentDir);

      for (const entry of entries) {
        if (signal?.aborted) break;

        try {
          throwIfCancelled(signal);
          if (entry.isDirectory()) {
            // Add directory to queue for BFS traversal
            if (
              !visited.has(entry.path) &&
              !shouldSkipPath(entry.path) &&
              !isRestrictedRoot(entry.path)
            ) {
              visited.add(entry.path);
              queue.push(entry.path);
            }
          } else if (entry.isFile()) {
            // Process file
            const apkFile = await processFile(
              entry.path,
              entry.name,
              Number(entry.size) || 0
            );
            if (apkFile) {
              results.push(apkFile);
            }
            onFileProcessed?.(entry.name || entry.path);
          }
        } catch {
          // Skip unreadable files/directories
          continue;
        }
      }
    } catch (error) {
      // Skip unreadable directories
      logScanWarning(currentDir, error);
    }
  }

  return results;
}

// ============================================================================
// Main Scanning Function
// ============================================================================

/**
 * Scans for APK files using all 5 algorithms
 */
async function scanForApkFiles(
  signal?: AbortSignal,
  onProgress?: ApkProgressCallback,
): Promise<ApkFile[]> {
  const allResults: ApkFile[] = [];
  const seenPaths = new Set<string>();
  let processedFiles = 0;
  let lastProgressUpdate = 0;

  const emitProgress = (fileName: string) => {
    processedFiles += 1;
    if (!onProgress) {
      return;
    }

    const now = Date.now();
    if (now - lastProgressUpdate < 100 && processedFiles % 25 !== 0) {
      return;
    }

    lastProgressUpdate = now;
    const estimatedTotal = Math.max(processedFiles + 200, Math.floor(processedFiles * 1.15));

    onProgress({
      current: processedFiles,
      total: estimatedTotal,
      currentFile: fileName || 'Scanning storage...',
      stage: 'scanning',
      scannedFiles: processedFiles,
      totalFiles: estimatedTotal,
    });
  };

  const emitStage = (message: string) => {
    if (!onProgress) {
      return;
    }

    const baseline = Math.max(processedFiles, 1);
    onProgress({
      current: baseline,
      total: baseline,
      currentFile: message,
      stage: 'hashing',
      scannedFiles: processedFiles,
      totalFiles: baseline,
    });
  };

  // Algorithm 4: Priority directory scanning (scan FIRST)
  if (!signal?.aborted) {
    const priorityResults = await scanPriorityDirectories(signal, emitProgress);
    throwIfCancelled(signal);
    for (const file of priorityResults) {
      if (!seenPaths.has(file.path)) {
        seenPaths.add(file.path);
        allResults.push(file);
      }
    }
  }

  // Algorithm 1: BFS directory traversal (scan remaining directories)
  if (!signal?.aborted) {
    const bfsResults = await bfsTraversal(signal, emitProgress);
    throwIfCancelled(signal);
    for (const file of bfsResults) {
      if (!seenPaths.has(file.path)) {
        seenPaths.add(file.path);
        allResults.push(file);
      }
    }
  }

  emitStage('Cataloging installers...');

  return allResults;
}

// ============================================================================
// Public API: useAPKScanner Hook
// ============================================================================

export function useAPKScanner() {
  const initialProgress: ApkScanProgress = {
    current: 0,
    total: 0,
    currentFile: '',
    stage: 'scanning',
    scannedFiles: 0,
    totalFiles: 0,
  };

  const [state, setState] = useState<{
    isScanning: boolean;
    progress: ApkScanProgress;
    results: ApkFile[];
    error: string | null;
  }>({
    isScanning: false,
    progress: initialProgress,
    results: [],
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);
  const lastProgressUpdateRef = useRef(0);
  const hasLoadedCachedResults = useRef(false);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (hasLoadedCachedResults.current) {
      return;
    }

    const hydrateCachedResults = async () => {
      try {
        const cachedResults = await loadApkScanResults();
        if (cachedResults.length > 0) {
          setState(prev => ({
            ...prev,
            results: cachedResults,
            progress: {
              ...prev.progress,
              current: cachedResults.length,
              total: cachedResults.length,
              currentFile: 'cached installers',
              stage: 'hashing',
              scannedFiles: cachedResults.length,
              totalFiles: cachedResults.length,
            },
            error: null,
          }));
        }
      } catch (error) {
        console.error('Failed to load cached APK scan results:', error);
      } finally {
        hasLoadedCachedResults.current = true;
      }
    };

    void hydrateCachedResults();
  }, []);

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    let granted = await hasStoragePermissions();
    if (granted) {
      return true;
    }

    granted = await requestStoragePermissions();
    if (!granted) {
      granted = await requestStoragePermissions({ forceManagePrompt: true });
    }

    return granted;
  }, []);

  const handleProgressUpdate = useCallback((progressUpdate: ApkScanProgress) => {
    if (isCancelledRef.current) {
      return;
    }

    const now = Date.now();
    if (
      progressUpdate.stage === 'scanning' &&
      now - lastProgressUpdateRef.current < 60 &&
      progressUpdate.current % 15 !== 0
    ) {
      return;
    }

    lastProgressUpdateRef.current = now;
    setState(prev => ({
      ...prev,
      progress: {
        ...progressUpdate,
        total: progressUpdate.total || progressUpdate.current || 1,
      },
    }));
  }, []);

  const stopScan = useCallback(() => {
    if (!state.isScanning && !abortControllerRef.current) {
      return;
    }

    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isScanning: false,
      progress: {
        ...prev.progress,
        currentFile: 'Cancelled',
      },
    }));
  }, [state.isScanning]);

  const startScan = useCallback(async (): Promise<void> => {
    if (state.isScanning) {
      return;
    }

    isCancelledRef.current = false;
    lastProgressUpdateRef.current = 0;

    setState({
      isScanning: true,
      progress: {
        current: 0,
        total: 0,
        currentFile: 'Preparing storage...',
        stage: 'scanning',
        scannedFiles: 0,
        totalFiles: 0,
      },
      results: [],
      error: null,
    });

    const hasPerms = await ensurePermissions();
    if (!hasPerms) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: 'storage access denied. enable permissions to scan downloads.',
      }));
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apkFiles = await scanForApkFiles(controller.signal, handleProgressUpdate);
      if (isCancelledRef.current) {
        return;
      }

      setState(prev => ({
        ...prev,
        isScanning: false,
        results: apkFiles,
        progress: {
          current: apkFiles.length,
          total: apkFiles.length || prev.progress.total || 1,
          currentFile: 'Complete',
          stage: 'hashing',
          scannedFiles: apkFiles.length,
          totalFiles: apkFiles.length || prev.progress.total || 1,
        },
        error: null,
      }));

      try {
        await saveApkScanResults(apkFiles);
      } catch (error) {
        console.error('Failed to save APK scan results:', error);
      }
    } catch (error) {
      if ((error as Error).name === 'SCAN_CANCELLED') {
        setState(prev => ({
          ...prev,
          isScanning: false,
          results: [],
          progress: {
            ...prev.progress,
            currentFile: 'Cancelled',
          },
          error: null,
        }));
      } else {
        console.error('APK scan failed:', error);
        setState(prev => ({
          ...prev,
          isScanning: false,
          results: [],
          error: error instanceof Error ? error.message : 'unknown error occurred',
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [ensurePermissions, handleProgressUpdate, state.isScanning]);

  return {
    startScan,
    stopScan,
    scanForApks: startScan,
    loading: state.isScanning,
    isScanning: state.isScanning,
    progress: state.progress,
    results: state.results,
    error: state.error,
  };
}

export default function APKScannerPlaceholder() {
  return null;
}

