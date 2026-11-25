'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// Redirect toàn bộ truy cập phòng công khai cũ về Nobi Cloud (yêu cầu đăng nhập)
export default function RedirectRoomPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/cloud');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Đang chuyển tiếp về Nobi Cloud...</p>
      </div>
    </div>
  );
}
