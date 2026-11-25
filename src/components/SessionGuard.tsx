'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  // Reset the redirect guard when pathname actually changes
  // (so a legitimate navigation can trigger a new check)
  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

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

      // ✅ Always mark ready after the check completes
      if (!cancelled) {
        setIsReady(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
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

  // Loading spinner while checking auth — shown only briefly
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
