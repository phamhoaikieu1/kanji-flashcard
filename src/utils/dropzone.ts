// Utilities for Nobi Cloud (Personal Cloud Storage)

export interface Room {
  id: string;
  code: string;
  created_at: string;
  last_active_at: string;
}

export interface RoomFile {
  id: string;
  user_id?: string | null;
  room_id?: string | null;
  room_code?: string | null;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  status: 'active' | 'trash' | 'pending_delete';
  created_at: string;
  expires_at?: string | null;
  deleted_at?: string | null;
}

export interface RoomMessage {
  id: string;
  user_id?: string | null;
  room_id?: string | null;
  room_code?: string | null;
  sender_type?: string;
  content: string;
  message_type: 'text' | 'link' | 'code';
  status?: 'active' | 'trash' | 'pending_delete';
  created_at: string;
  expires_at?: string | null;
  deleted_at?: string | null;
}

export type StreamItem =
  | { kind: 'file'; item: RoomFile }
  | { kind: 'message'; item: RoomMessage };

export type TrashItem =
  | { kind: 'file'; item: RoomFile }
  | { kind: 'message'; item: RoomMessage };

// Giới hạn dung lượng upload (mặc định 50MB, có thể cấu hình qua biến môi trường)
export const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB) || 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Base64URL Encoding (RFC 4648) cho URL phòng với tiền tố nhận diện 'b64_'
export function toBase64Url(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return (
      'b64_' +
      btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );
  } catch {
    return encodeURIComponent(str);
  }
}

// Base64URL Decoding (hỗ trợ cả slug có tiền tố 'b64_' và URL nhập trực tiếp mã thô)
export function fromBase64Url(str: string): string {
  try {
    if (!str.startsWith('b64_')) {
      return decodeURIComponent(str);
    }
    const cleanStr = str.slice(4);
    let base64 = cleanStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }
}

// Định dạng kích thước file dễ đọc
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Định dạng thời gian còn lại trước khi file trong Thùng rác bị xóa vĩnh viễn (30 ngày)
export function formatTrashExpiry(deletedAt: string | null | undefined): { text: string; daysLeft: number; isExpired: boolean } {
  if (!deletedAt) return { text: '30 ngày', daysLeft: 30, isExpired: false };
  const deletedTime = new Date(deletedAt).getTime();
  const purgeTime = deletedTime + 30 * 24 * 60 * 60 * 1000; // 30 ngày
  const now = Date.now();
  const diffMs = purgeTime - now;

  if (diffMs <= 0) {
    return { text: 'Đã hết hạn lưu', daysLeft: 0, isExpired: true };
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return { text: `Tự xóa sau ${days} ngày`, daysLeft: days, isExpired: false };
  }

  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return { text: `Tự xóa sau ${hours}h ${minutes}m`, daysLeft: 0, isExpired: false };
}

// Định dạng giờ:phút ngắn gọn (VD: 14:30)
export function formatTimeOnly(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Định dạng ngày giờ ngắn gọn (VD: 14:30 11/11)
export function formatShortDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${time} ${date}`;
  } catch {
    return dateStr;
  }
}

// Key phân nhóm theo ngày (YYYY-MM-DD local)
export function formatDateKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return 'other';
  }
}

// Mốc phân cách ngày thông minh (Hôm nay, Hôm qua, Thứ X, DD/MM/YYYY)
export function formatDateDivider(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (isToday) return `Hôm nay, ${day}/${month}/${year}`;
    if (isYesterday) return `Hôm qua, ${day}/${month}/${year}`;
    return `${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// Xóa dấu tiếng Việt (chuẩn hóa NFD) để tìm kiếm không dấu "Cực nhạy"
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Kiểm tra xem file có phải là file ảnh xem nhanh được không
export function isImageFile(fileName: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const lower = fileName.toLowerCase();
  return imageExtensions.some((ext) => lower.endsWith(ext));
}

// Biểu tượng icon theo định dạng file
export function getFileIcon(fileName: string, mimeType?: string): string {
  const lower = fileName.toLowerCase();
  if (isImageFile(fileName, mimeType)) return '🖼️';
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return '📕';
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || mimeType?.includes('word')) return '📘';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv') || mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📗';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx') || mimeType?.includes('presentation')) return '📙';
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || lower.endsWith('.tar') || lower.endsWith('.gz')) return '🗜️';
  if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.flac') || mimeType?.startsWith('audio/')) return '🎵';
  if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.mov') || mimeType?.startsWith('video/')) return '🎬';
  if (
    lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.jsx') ||
    lower.endsWith('.json') || lower.endsWith('.html') || lower.endsWith('.css') || lower.endsWith('.py') ||
    lower.endsWith('.sql') || lower.endsWith('.java') || lower.endsWith('.cpp')
  ) return '📝';
  return '📄';
}

// Kiểm tra xem file có thể xem nội dung dạng văn bản / code (UTF-8) không
export function isTextPreviewable(fileName: string, mimeType?: string): boolean {
  if (mimeType) {
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/xml'
    ) {
      return true;
    }
  }
  const textExtensions = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss',
    '.html', '.xml', '.csv', '.log', '.env', '.yaml', '.yml', '.sql', '.py',
    '.java', '.c', '.cpp', '.h', '.sh', '.bat', '.ps1'
  ];
  const lower = fileName.toLowerCase();
  return textExtensions.some((ext) => lower.endsWith(ext));
}

// Kiểm tra nội dung có phải là văn bản dạng bảng / cột (chứa ký tự Tab hoặc định dạng bảng Markdown / ASCII)
export function isTableContent(text: string): boolean {
  if (!text) return false;
  // Chứa ký tự Tab (đặc trưng từ Excel, Sheets, TSV, log phân cột)
  if (text.includes('\t')) return true;

  // Bảng dạng Markdown hoặc ASCII (có ít nhất 2 dòng, chứa dấu gạch đứng | phân tách cột hoặc separator |---|)
  const lines = text.trim().split('\n');
  if (lines.length >= 2) {
    const hasMarkdownTablePipe = lines.filter((l) => /^\s*\|.+\|\s*$/.test(l)).length >= 2;
    const hasTableSeparator = lines.some((l) => /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(l));
    if (hasMarkdownTablePipe || hasTableSeparator) return true;
  }

  return false;
}

// Nhận diện kiểu tin nhắn: 'link' | 'code' | 'text'
export function detectMessageType(text: string): 'link' | 'code' | 'text' {
  const trimmed = text.trim();
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
    return 'link';
  }
  if (trimmed.includes('\n') && (trimmed.startsWith('```') || /^(const|let|var|function|import|export|class|def|public|SELECT|UPDATE|INSERT)\b/m.test(trimmed))) {
    return 'code';
  }
  return 'text';
}
