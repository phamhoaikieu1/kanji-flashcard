export const DEVICE_ID_KEY = 'nobi_device_id';
export const SCREEN_LOCK_KEY = 'nobi_screen_locked';
export const SCREEN_LOCK_EVENT = 'nobi:screen-lock-changed';

/**
 * Returns the persistent unique device ID for this browser, generating one if needed.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Parses navigator.userAgent into a human-readable browser + OS label.
 */
export function getReadableDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị không xác định';

  const ua = navigator.userAgent;

  let browser = 'Trình duyệt';
  if (ua.includes('Edg/') || ua.includes('Edge/')) {
    browser = 'Edge';
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browser = 'Opera';
  } else if (ua.includes('CocCoc')) {
    browser = 'Cốc Cốc';
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
  }

  let os = 'Thiết bị khác';
  if (ua.includes('iPhone')) {
    os = 'iPhone';
  } else if (ua.includes('iPad')) {
    os = 'iPad';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return `${browser} trên ${os}`;
}

export function isScreenLocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SCREEN_LOCK_KEY) === 'true';
}

export function lockScreen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCREEN_LOCK_KEY, 'true');
  window.dispatchEvent(new Event(SCREEN_LOCK_EVENT));
}

export function unlockScreen(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SCREEN_LOCK_KEY);
  window.dispatchEvent(new Event(SCREEN_LOCK_EVENT));
}
