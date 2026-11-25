'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace('/dashboard');
        return;
      }
      setIsLoading(false);
    };
    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 flex flex-col justify-between font-sans select-none antialiased">
      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-base shadow-sm font-black">
            📚
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            Kanji Flashcard & Nobi Cloud
          </span>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
        >
          Đăng nhập
        </button>
      </header>

      {/* Main Hero Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center space-y-6">

          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-3xl mx-auto shadow-xl shadow-indigo-600/20">
            ☁️
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Học Từ Vựng & Nobi Cloud
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Hệ thống học từ vựng Kanji, Ngữ pháp, Tiếng Trung, Tiếng Anh và lưu trữ cá nhân Nobi Cloud đồng bộ mọi thiết bị.
            </p>
          </div>

          {/* Action Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold rounded-2xl shadow-sm transition active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>Đăng nhập ngay</span>
              <span>→</span>
            </button>

            <button
              onClick={() => router.push('/register')}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200/80 transition active:scale-[0.98]"
            >
              Đăng ký tài khoản mới
            </button>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-500 font-medium">
            <span className="bg-white/80 border border-slate-200/70 px-2.5 py-1 rounded-full shadow-2xs">
              📚 Kanji N5–N1
            </span>
            <span className="bg-white/80 border border-slate-200/70 px-2.5 py-1 rounded-full shadow-2xs">
              📖 Ngữ pháp Nhật
            </span>
            <span className="bg-white/80 border border-slate-200/70 px-2.5 py-1 rounded-full shadow-2xs">
              🏮 HSK & Tiếng Trung
            </span>
            <span className="bg-white/80 border border-slate-200/70 px-2.5 py-1 rounded-full shadow-2xs">
              ☁️ Nobi Cloud cá nhân
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-slate-400 select-none">
        <p className="text-[11px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[9px] font-sans text-slate-300 tracking-widest uppercase mt-0.5">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </footer>
    </div>
  );
}