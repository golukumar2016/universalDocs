export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, digitGroups)).toFixed(1)} ${units[digitGroups]}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index !== -1 ? filename.substring(index + 1).toLowerCase() : '';
}

export function getMimeTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase().replace('.', '');
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext] || 'application/octet-stream';
}
