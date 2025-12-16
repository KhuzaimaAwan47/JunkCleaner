import * as SQLite from 'expo-sqlite';
import type { DuplicateGroup } from '../app/(Screens)/DuplicateImagesScreen/DuplicateImageScanner';
import type { LargeFileResult } from '../app/(Screens)/LargeFilesScreen/LargeFileScanner';
import type { OldFileInfo } from '../app/(Screens)/OldFilesScreen/OldFilesScanner';
import type { WhatsAppScanResult } from '../app/(Screens)/WhatsAppRemoverScreen/WhatsAppScanner';

export interface FileCacheEntry {
  path: string;
  size: number;
  partialHash: string;
  fullHash: string | null;
  modifiedDate: number;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  if (db) return;

  db = await SQLite.openDatabaseAsync('duplicate_finder.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS file_cache (
      path TEXT PRIMARY KEY,
      size INTEGER NOT NULL,
      partialHash TEXT NOT NULL,
      fullHash TEXT,
      modifiedDate INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_size ON file_cache(size);
    CREATE INDEX IF NOT EXISTS idx_partialHash ON file_cache(partialHash);
    CREATE INDEX IF NOT EXISTS idx_fullHash ON file_cache(fullHash);

    CREATE TABLE IF NOT EXISTS duplicate_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_at INTEGER NOT NULL,
      groups_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_at INTEGER NOT NULL,
      results_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS large_file_scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_at INTEGER NOT NULL,
      results_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS old_file_scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_at INTEGER NOT NULL,
      results_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS smart_scan_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      completed_at INTEGER NOT NULL,
      status_data TEXT NOT NULL
    );
  `);
}

export async function getCachedFile(path: string): Promise<FileCacheEntry | null> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<FileCacheEntry>(
    'SELECT * FROM file_cache WHERE path = ?',
    [path]
  );

  return result || null;
}

export async function saveFileCache(entry: FileCacheEntry): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync(
    `INSERT OR REPLACE INTO file_cache (path, size, partialHash, fullHash, modifiedDate)
     VALUES (?, ?, ?, ?, ?)`,
    [entry.path, entry.size, entry.partialHash, entry.fullHash, entry.modifiedDate]
  );
}

export async function clearCache(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM file_cache');
}

export async function updateFullHash(path: string, fullHash: string): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync(
    'UPDATE file_cache SET fullHash = ? WHERE path = ?',
    [fullHash, path]
  );
}

export async function getFilesByPartialHash(partialHash: string): Promise<FileCacheEntry[]> {
  if (!db) await initDatabase();

  return await db!.getAllAsync<FileCacheEntry>(
    'SELECT * FROM file_cache WHERE partialHash = ?',
    [partialHash]
  );
}

export async function getFilesByFullHash(fullHash: string): Promise<FileCacheEntry[]> {
  if (!db) await initDatabase();

  return await db!.getAllAsync<FileCacheEntry>(
    'SELECT * FROM file_cache WHERE fullHash = ?',
    [fullHash]
  );
}

export async function saveDuplicateGroups(groups: DuplicateGroup[]): Promise<void> {
  if (!db) await initDatabase();

  try {
    // Clear old saved duplicates
    await db!.runAsync('DELETE FROM duplicate_groups');
    
    // Save new duplicates
    const groupsData = JSON.stringify(groups);
    await db!.runAsync(
      'INSERT INTO duplicate_groups (saved_at, groups_data) VALUES (?, ?)',
      [Date.now(), groupsData]
    );
  } catch (error) {
    console.error('Failed to persist duplicate groups:', error);
    throw error;
  }
}

export async function loadDuplicateGroups(): Promise<DuplicateGroup[]> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<{ groups_data: string }>(
    'SELECT groups_data FROM duplicate_groups ORDER BY saved_at DESC LIMIT 1'
  );

  if (!result) {
    return [];
  }

  try {
    return JSON.parse(result.groups_data) as DuplicateGroup[];
  } catch (error) {
    console.error('Failed to parse saved duplicate groups:', error);
    return [];
  }
}

export async function clearDuplicateGroups(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM duplicate_groups');
}

// WhatsApp Scanner Results
export async function saveWhatsAppResults(results: WhatsAppScanResult[]): Promise<void> {
  if (!db) await initDatabase();

  try {
    await db!.runAsync('DELETE FROM whatsapp_scan_results');
    await db!.runAsync(
      'INSERT INTO whatsapp_scan_results (saved_at, results_data) VALUES (?, ?)',
      [Date.now(), JSON.stringify(results)]
    );
  } catch (error) {
    console.error('Failed to persist WhatsApp scan results:', error);
    throw error;
  }
}

export async function loadWhatsAppResults(): Promise<WhatsAppScanResult[]> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<{ results_data: string }>(
    'SELECT results_data FROM whatsapp_scan_results ORDER BY saved_at DESC LIMIT 1'
  );

  if (!result) {
    return [];
  }

  try {
    return JSON.parse(result.results_data) as WhatsAppScanResult[];
  } catch (error) {
    console.error('Failed to parse cached WhatsApp scan results:', error);
    return [];
  }
}

export async function clearWhatsAppResults(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM whatsapp_scan_results');
}

// Large Files Scanner Results
export async function saveLargeFileResults(results: LargeFileResult[]): Promise<void> {
  if (!db) await initDatabase();

  try {
    await db!.runAsync('DELETE FROM large_file_scan_results');
    await db!.runAsync(
      'INSERT INTO large_file_scan_results (saved_at, results_data) VALUES (?, ?)',
      [Date.now(), JSON.stringify(results)]
    );
  } catch (error) {
    console.error('Failed to persist large file scan results:', error);
    throw error;
  }
}

export async function loadLargeFileResults(): Promise<LargeFileResult[]> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<{ results_data: string }>(
    'SELECT results_data FROM large_file_scan_results ORDER BY saved_at DESC LIMIT 1'
  );

  if (!result) {
    return [];
  }

  try {
    return JSON.parse(result.results_data) as LargeFileResult[];
  } catch (error) {
    console.error('Failed to parse cached large file scan results:', error);
    return [];
  }
}

export async function clearLargeFileResults(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM large_file_scan_results');
}

// Old Files Scanner Results
export async function saveOldFileResults(results: OldFileInfo[]): Promise<void> {
  if (!db) await initDatabase();

  try {
    await db!.runAsync('DELETE FROM old_file_scan_results');
    await db!.runAsync(
      'INSERT INTO old_file_scan_results (saved_at, results_data) VALUES (?, ?)',
      [Date.now(), JSON.stringify(results)]
    );
  } catch (error) {
    console.error('Failed to persist old file scan results:', error);
    throw error;
  }
}

export async function loadOldFileResults(): Promise<OldFileInfo[]> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<{ results_data: string }>(
    'SELECT results_data FROM old_file_scan_results ORDER BY saved_at DESC LIMIT 1'
  );

  if (!result) {
    return [];
  }

  try {
    return JSON.parse(result.results_data) as OldFileInfo[];
  } catch (error) {
    console.error('Failed to parse cached old file scan results:', error);
    return [];
  }
}

export async function clearOldFileResults(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM old_file_scan_results');
}

// Smart Scan Status
export interface SmartScanStatus {
  completed: boolean;
  completedAt: number | null;
  scannerProgress: {
    whatsapp: boolean;
    duplicates: boolean;
    largeFiles: boolean;
    oldFiles: boolean;
  };
}

export async function saveSmartScanStatus(status: SmartScanStatus): Promise<void> {
  if (!db) await initDatabase();

  try {
    await db!.runAsync('DELETE FROM smart_scan_status');
    await db!.runAsync(
      'INSERT INTO smart_scan_status (completed_at, status_data) VALUES (?, ?)',
      [Date.now(), JSON.stringify(status)]
    );
  } catch (error) {
    console.error('Failed to persist smart scan status:', error);
    throw error;
  }
}

export async function loadSmartScanStatus(): Promise<SmartScanStatus | null> {
  if (!db) await initDatabase();

  const result = await db!.getFirstAsync<{ status_data: string }>(
    'SELECT status_data FROM smart_scan_status ORDER BY completed_at DESC LIMIT 1'
  );

  if (!result) {
    return null;
  }

  try {
    return JSON.parse(result.status_data) as SmartScanStatus;
  } catch (error) {
    console.error('Failed to parse smart scan status:', error);
    return null;
  }
}

export async function clearSmartScanStatus(): Promise<void> {
  if (!db) await initDatabase();

  await db!.runAsync('DELETE FROM smart_scan_status');
}

// Empty Folders Scanner Results
export interface ScanDataSnapshot {
  whatsappResults: WhatsAppScanResult[];
  duplicateResults: DuplicateGroup[];
  largeFileResults: LargeFileResult[];
  oldFileResults: OldFileInfo[];
}

/**
 * Load the latest scan data for all scanners in one shot.
 */
export async function loadAllScanResults(): Promise<ScanDataSnapshot> {
  if (!db) await initDatabase();

  const [
    whatsappResults,
    duplicateResults,
    largeFileResults,
    oldFileResults,
  ] = await Promise.all([
    loadWhatsAppResults(),
    loadDuplicateGroups(),
    loadLargeFileResults(),
    loadOldFileResults(),
  ]);

  return {
    whatsappResults,
    duplicateResults,
    largeFileResults,
    oldFileResults,
  };
}

/**
 * Check whether any scan data exists in the database.
 */
export async function hasAnyScanData(): Promise<boolean> {
  const snapshot = await loadAllScanResults();

  return (
    snapshot.whatsappResults.length > 0 ||
    snapshot.duplicateResults.length > 0 ||
    snapshot.largeFileResults.length > 0 ||
    snapshot.oldFileResults.length > 0
  );
}
