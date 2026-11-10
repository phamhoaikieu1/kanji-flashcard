// Utilities for Public Dropzone

export interface Room {
  id: string;
  code: string;
  created_at: string;
  last_active_at: string;
}

export interface RoomFile {
  id: string;
  room_id: string;
  room_code: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  status: 'active' | 'trash' | 'pending_delete';
  created_at: string;
  expires_at: string;
  deleted_at?: string | null;
}

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
      // Nếu không có tiền tố b64_, coi đây là mã thô người dùng gõ trực tiếp trên URL
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

// Định dạng thời gian còn lại (MM:SS) cho file đang hoạt động (15 phút)
export function formatTimeLeft(expiresAt: string): { text: string; isExpired: boolean; secondsLeft: number } {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffSec = Math.floor((expires - now) / 1000);

  if (diffSec <= 0) {
    return { text: '00:00', isExpired: true, secondsLeft: 0 };
  }

  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { text, isExpired: false, secondsLeft: diffSec };
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
