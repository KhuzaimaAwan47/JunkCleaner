export function formatDate(timestamp: number): string {
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  if (isNaN(date.getTime())) return 'unknown date';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

export function getFileSource(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('whatsapp')) return 'From:WhatsApp';
  if (lowerPath.includes('android')) return 'From:Android';
  if (lowerPath.includes('dcim') || lowerPath.includes('camera')) return 'From:Camera';
  if (lowerPath.includes('downloads')) return 'From:Downloads';
  return 'From:Android';
}

export function guessOriginalPath(files: { path: string }[]): string | null {
  if (!files.length) {
    return null;
  }
  const normalizedKeywords = ['sdcard', 'downloads', 'dcim', 'camera', 'whatsapp'];
  for (const keyword of normalizedKeywords) {
    const match = files.find((file) => file.path.toLowerCase().includes(keyword));
    if (match) {
      return match.path;
    }
  }
  const nonSystem = files.find((file) => !file.path.toLowerCase().includes('android/data'));
  return (nonSystem || files[0]).path;
}

export function ensurePreviewUri(path: string): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('data:')) {
    return path;
  }
  return `file://${path}`;
}

export function formatTimestamp(timestamp: number): string {
  // Handle both seconds and milliseconds timestamps
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  if (isNaN(date.getTime())) return 'unknown date';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

const PREVIEW_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".mpg", ".mpeg"];

export function isPreviewableAsset(path: string): boolean {
  const lower = path.toLowerCase();
  return PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isVideoFile(path: string): boolean {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isImageFile(path: string): boolean {
  return isPreviewableAsset(path);
}

export function getFileTypeIcon(path: string): string {
  const lower = path.toLowerCase();
  
  // Image files
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/)) {
    return 'image';
  }
  
  // Video files
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/)) {
    return 'video';
  }
  
  // Audio files
  if (lower.match(/\.(mp3|m4a|aac|wav|flac|ogg|wma)$/)) {
    return 'music';
  }
  
  // Documents
  if (lower.endsWith('.pdf')) return 'file-pdf-box';
  if (lower.match(/\.(doc|docx)$/)) return 'file-word-box';
  if (lower.match(/\.(xls|xlsx)$/)) return 'file-excel-box';
  if (lower.match(/\.(ppt|pptx)$/)) return 'file-powerpoint-box';
  if (lower.endsWith('.txt')) return 'file-document-outline';
  if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'folder-zip';
  
  return 'file-outline';
}

export function formatModifiedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}

export function formatAgeDays(days: number): string {
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths > 0) {
      return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

export function isPreviewableMedia(path: string): boolean {
  const lower = path.toLowerCase();
  const PREVIEWABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.mp4', '.mov'];
  return PREVIEWABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

