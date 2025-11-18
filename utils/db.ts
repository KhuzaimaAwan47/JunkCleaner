import * as SQLite from 'expo-sqlite';
import { DuplicateGroup } from './fileScanner';

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

  // Clear old saved duplicates
  await db!.runAsync('DELETE FROM duplicate_groups');
  
  // Save new duplicates
  const groupsData = JSON.stringify(groups);
  await db!.runAsync(
    'INSERT INTO duplicate_groups (saved_at, groups_data) VALUES (?, ?)',
    [Date.now(), groupsData]
  );
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
