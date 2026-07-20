'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      // Luồng kiểm tra điều hướng thông minh cho PWA
      if (!session && !isAuthPage) {
        router.push('/login');
      } else if (session && isAuthPage) {
        router.push('/dashboard');
      }
      
      setIsReady(true);
    };

    checkSession();

    // Lắng nghe sự kiện Auth thay đổi (Tránh chết session khi app chạy ngầm trên iOS)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && isAuthPage) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  // Loading nhẹ trong tích tắc chờ iPhone nạp dữ liệu lưu phiên, chống vỡ layout
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}