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

