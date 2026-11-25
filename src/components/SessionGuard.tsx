'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  getOrCreateDeviceId,
  getReadableDeviceName,
  isScreenLocked,
  unlockScreen,
  SCREEN_LOCK_EVENT,
  SCREEN_LOCK_KEY,
} from '@/utils/deviceManager';
import ScreenLockOverlay from './ScreenLockOverlay';

const DEVICE_UPSERT_INTERVAL_MS = 2 * 60 * 1000;

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const lastDeviceUpsertRef = useRef<number>(0);
  const isRevokingRef = useRef(false);

  // Sync screen lock state from localStorage & custom event
  useEffect(() => {
    const syncLock = () => setIsLocked(isScreenLocked());
    syncLock();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === SCREEN_LOCK_KEY) {
        syncLock();
      }
    };

    window.addEventListener(SCREEN_LOCK_EVENT, syncLock);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SCREEN_LOCK_EVENT, syncLock);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Reset the redirect guard when pathname actually changes
  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        setCurrentUser(user ?? null);

        const isAuthPage = pathname === '/login' || pathname === '/register';
        const isPublicPage =
          pathname === '/' || isAuthPage || pathname === '/reset-password';

        if (!user && !isPublicPage && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/login');
          return;
        }

        if (user && isAuthPage && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/dashboard');
          return;
        }
      } catch {
        // getUser failed (network error, etc.) — allow page to render
      }

      if (!cancelled) {
        setIsReady(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);

      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      const isPublicPage =
        currentPath === '/' || isAuthPage || currentPath === '/reset-password';

      if (event === 'SIGNED_OUT' && !isPublicPage && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace('/login');
      } else if (event === 'SIGNED_IN' && isAuthPage && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace('/dashboard');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Register/heartbeat device & subscribe to remote revoke via Supabase Realtime
  useEffect(() => {
    if (!currentUser?.id) return;

    const userId = currentUser.id;
    const deviceId = getOrCreateDeviceId();
    const deviceName = getReadableDeviceName();
    isRevokingRef.current = false;

    const upsertDevice = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastDeviceUpsertRef.current < DEVICE_UPSERT_INTERVAL_MS) {
        return;
      }
      lastDeviceUpsertRef.current = now;

      try {
        await supabase.from('user_devices').upsert(
          {
            user_id: userId,
            device_id: deviceId,
            device_name: deviceName,
            status: 'active',
            last_active_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_id' }
        );
      } catch {
        // Ignore transient network errors during heartbeat
      }
    };

    // Initial upsert on session ready
    upsertDevice(false);

    // Periodic heartbeat every 2 minutes while tab stays open
    const heartbeatTimer = setInterval(() => {
      upsertDevice(false);
    }, DEVICE_UPSERT_INTERVAL_MS);

    const handleRemoteRevoke = async () => {
      if (isRevokingRef.current) return;
      isRevokingRef.current = true;

      unlockScreen();
      await supabase.auth.signOut();
      toast.error('Thiết bị này đã bị đăng xuất từ xa');
      router.replace('/login');
    };

    const channel = supabase
      .channel(`device-watch-${userId}-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_devices',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            if (payload.old?.device_id === deviceId) {
              handleRemoteRevoke();
            }
            return;
          }

          const updated = payload.new;
          if (updated?.device_id === deviceId && updated?.status === 'revoked') {
            handleRemoteRevoke();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(heartbeatTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, router]);

  const handleFullSignOut = useCallback(async () => {
    unlockScreen();
    await supabase.auth.signOut();
    setIsLocked(false);
    toast.success('Đã đăng xuất tài khoản!');
    router.replace('/login');
  }, [router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {children}
      {currentUser && isLocked && (
        <ScreenLockOverlay
          user={currentUser}
          onUnlocked={() => setIsLocked(false)}
          onSignOut={handleFullSignOut}
        />
      )}
    </>
  );
}
