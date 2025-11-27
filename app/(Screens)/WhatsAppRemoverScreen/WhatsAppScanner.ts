import * as FileSystem from 'expo-file-system/legacy';

export type WhatsAppFileType =
  | 'Statuses'
  | 'Images'
  | 'Video'
  | 'VoiceNotes'
  | 'Audio'
  | 'Documents'
  | 'Stickers'
  | 'Backups'
  | 'Junk'
  | 'Other';

export interface WhatsAppScanResult {
  path: string;
  size: number;
  modified: number | null;
  type: WhatsAppFileType;
}

export interface WhatsAppSummary {
  totalCount: number;
  totalSize: number;
  byType: Record<WhatsAppFileType, { count: number; size: number }>;
}

const BASES: string[] = [
  // Android 11+ (scoped storage) paths
  'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp',
  'file:///storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business',
  // Legacy path (Android 10 and below or devices with broad storage access)
  'file:///storage/emulated/0/WhatsApp',
];
const TARGETS: string[] = [
  'Media/.Statuses',
  'Media/WhatsApp Images',
  'Media/WhatsApp Video',
  'Media/WhatsApp Voice Notes',
  'Media/WhatsApp Audio',
  'Media/WhatsApp Documents',
  'Media/WhatsApp Stickers',
  'Backups',
];

const joinPath = (root: string, child: string) =>
  `${root.replace(/\/+$/, '')}/${child.replace(/^\/+/, '')}`;

const classify = (path: string): WhatsAppFileType => {
  const normalized = path.toLowerCase();
  if (normalized.includes('.statuses')) return 'Statuses';
  if (normalized.includes('images')) return 'Images';
  if (normalized.includes('video')) return 'Video';
  if (normalized.includes('voice')) return 'VoiceNotes';
  if (normalized.includes('audio')) return 'Audio';
  if (normalized.includes('documents')) return 'Documents';
  if (normalized.includes('stickers')) return 'Stickers';
  if (normalized.includes('backups')) return 'Backups';
  if (normalized.endsWith('.tmp') || normalized.includes('.nomedia')) return 'Junk';
  return 'Other';
};

const listFiles = async (dir: string) => {
  try {
    return await FileSystem.readDirectoryAsync(dir);
  } catch {
    return [];
  }
};

const statPath = async (path: string) => {
  try {
    return await FileSystem.getInfoAsync(path);
  } catch {
    return { exists: false } as FileSystem.FileInfo;
  }
};

export async function scanWhatsApp(): Promise<WhatsAppScanResult[]> {
  const results: WhatsAppScanResult[] = [];
  const existingBases = await Promise.all(
    BASES.map(async (base) => {
      const info = await statPath(base);
      return info.exists && info.isDirectory ? base : null;
    }),
  );
  const activeBases = existingBases.filter((base): base is string => Boolean(base));

  if (!activeBases.length) {
    throw new Error('whatsapp storage folder not found or inaccessible');
  }

  for (const base of activeBases) {
    for (const target of TARGETS) {
      const targetPath = joinPath(base, target);
      const entries = await listFiles(targetPath);
      if (!entries.length) {
        continue;
      }

      const snapshots = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = joinPath(targetPath, entry);
          const info = await statPath(fullPath);
          return { fullPath, info };
        }),
      );

      for (const { fullPath, info } of snapshots) {
        if (!info.exists || info.isDirectory) {
          continue;
        }
        const type = classify(fullPath);
        if (target.includes('Media') && type === 'Other') {
          continue;
        }
        results.push({
          path: fullPath,
          size: info.size ?? 0,
          modified: info.modificationTime ?? null,
          type,
        });
      }
    }
  }

  return results.sort((a, b) => b.size - a.size);
}

export async function deleteSelected(files: WhatsAppScanResult[]): Promise<void> {
  if (!files.length) {
    return;
  }
  await Promise.all(
    files.map((file) => FileSystem.deleteAsync(file.path, { idempotent: true })),
  );
}

export const summarizeWhatsApp = (files: WhatsAppScanResult[]): WhatsAppSummary => {
  const base: WhatsAppSummary['byType'] = {
    Statuses: { count: 0, size: 0 },
    Images: { count: 0, size: 0 },
    Video: { count: 0, size: 0 },
    VoiceNotes: { count: 0, size: 0 },
    Audio: { count: 0, size: 0 },
    Documents: { count: 0, size: 0 },
    Stickers: { count: 0, size: 0 },
    Backups: { count: 0, size: 0 },
    Junk: { count: 0, size: 0 },
    Other: { count: 0, size: 0 },
  };

  let totalSize = 0;
  files.forEach((file) => {
    const bucket = base[file.type];
    bucket.count += 1;
    bucket.size += file.size;
    totalSize += file.size;
  });

  return {
    totalCount: files.length,
    totalSize,
    byType: base,
  };
};


