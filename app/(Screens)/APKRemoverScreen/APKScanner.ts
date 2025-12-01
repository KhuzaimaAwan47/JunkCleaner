import type { Permission } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

export type ApkFile = {
  path: string;
  size: number;
  name: string;
};

const BATCH_SIZE = 25;
const APK_EXTENSIONS = ['.apk', '.apks', '.xapk', '.split.apk'];

const buildApkRootPaths = (): string[] => {
  const base = RNFS.ExternalStorageDirectoryPath;
  if (!base) return [];

  const paths = [
    base,
    `${base}/Download`,
    `${base}/Documents`,
    `${base}/Android/data`,
    `${base}/Android/media`,
  ];

  // Also check /sdcard/ if different from base
  if (base !== '/sdcard' && base !== '/storage/emulated/0') {
    paths.push('/sdcard');
  }

  return paths.filter(Boolean);
};

const SKIP_FOLDERS = [
  'dcim',
  'pictures',
  'movies',
  'music',
  'camera',
  'alarms',
  'ringtones',
  'notifications',
  'podcasts',
];

const WHATSAPP_SKIP_PATTERNS = [
  /whatsapp\/media\/whatsapp images/i,
  /whatsapp\/media\/whatsapp video/i,
  /whatsapp\/media\/whatsapp audio/i,
  /whatsapp\/media\/wallpaper/i,
  /whatsapp\/media\/\.statuses/i,
];

const WHATSAPP_ALLOW_PATTERNS = [
  /whatsapp\/media\/whatsapp documents/i,
  /whatsapp\/media\/whatsapp voice notes/i,
  /whatsapp\/shared/i,
  /whatsapp\/backups/i,
  /whatsapp\/databases/i,
];

const shouldSkipPath = (path: string): boolean => {
  const lower = path.toLowerCase();
  const pathParts = lower.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';

  // Check general skip folders
  if (SKIP_FOLDERS.includes(lastPart)) {
    return true;
  }

  // Check WhatsApp skip patterns
  if (WHATSAPP_SKIP_PATTERNS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  // Skip system/proc paths
  if (lower.includes('/proc/') || lower.includes('/system/') || lower.includes('/dev/')) {
    return true;
  }

  return false;
};

const shouldAllowWhatsAppPath = (path: string): boolean => {
  const lower = path.toLowerCase();
  return WHATSAPP_ALLOW_PATTERNS.some((pattern) => pattern.test(lower));
};

const isApkFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return APK_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const safeReadDir = async (directory: string): Promise<RNFS.ReadDirItem[]> => {
  try {
    return await RNFS.readDir(directory);
  } catch {
    return [];
  }
};

const ensureStatInfo = async (entry: RNFS.ReadDirItem): Promise<number> => {
  let size = typeof entry.size === 'number' && !Number.isNaN(entry.size) ? entry.size : 0;

  if (!size) {
    try {
      const info = await RNFS.stat(entry.path);
      size = info.size ?? size;
    } catch {
      // Use default
    }
  }

  return size;
};

const ensurePerms = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
  const needsLegacyPermissions = version < 33;

  const permissionCandidates: (Permission | undefined)[] = needsLegacyPermissions
    ? [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]
    : [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

  const permissions = permissionCandidates.filter(Boolean) as Permission[];
  if (!permissions.length) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
};

export async function scanForAPKs(): Promise<ApkFile[]> {
  const hasAccess = await ensurePerms();
  if (!hasAccess) {
    return [];
  }

  const rootPaths = buildApkRootPaths();
  const results: ApkFile[] = [];
  const queue = [...rootPaths];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const batch: string[] = [];
    for (let i = 0; i < BATCH_SIZE && queue.length > 0; i++) {
      const path = queue.shift();
      if (path && !visited.has(path)) {
        batch.push(path);
      }
    }

    await Promise.allSettled(
      batch.map(async (currentDir) => {
        if (visited.has(currentDir) || shouldSkipPath(currentDir)) {
          return;
        }
        visited.add(currentDir);

        const entries = await safeReadDir(currentDir);
        if (!entries.length) {
          return;
        }

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const shouldSkip = shouldSkipPath(entry.path);
            const isWhatsAppAllowed = shouldAllowWhatsAppPath(entry.path);

            // Allow WhatsApp paths even if they match skip patterns
            if (!shouldSkip || isWhatsAppAllowed) {
              if (!visited.has(entry.path)) {
                queue.push(entry.path);
              }
            }
          } else if (entry.isFile()) {
            if (isApkFile(entry.name)) {
              const size = await ensureStatInfo(entry);
              results.push({
                path: entry.path,
                size,
                name: entry.name,
              });
            }
          }
        }
      }),
    );
  }

  // Sort by size (largest first)
  return results.sort((a, b) => b.size - a.size);
}

export async function deleteApkFile(path: string): Promise<void> {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) return;
    await RNFS.unlink(path);
  } catch {
    // Ignore permission errors
  }
}

export default { scanForAPKs, deleteApkFile };
