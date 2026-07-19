'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 font-sans text-center select-none">
      <div className="w-full max-w-md space-y-8">
        
        {/* Icon & App Name */}
        <div className="space-y-3">
          <div className="text-6xl animate-bounce">🏮</div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            Kanji Flashcard
          </h1>
          <p className="text-base text-slate-500 font-medium px-4">
            Ứng dụng thông minh giúp bạn ghi nhớ 2000 chữ Kanji qua phương pháp vuốt chạm ngắt quãng - Desgined by <span className="font-bold text-slate-800">Trang Dang</span> (Spaced Repetition System)
          </p>
        </div>

        {/* Tính năng nổi bật tóm tắt */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 text-left space-y-3 shadow-sm">
          <div className="flex items-center space-x-3 text-sm text-slate-600 font-semibold">
            <span>✨</span> <span>Đầy đủ trình độ từ N5 đến N1</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-slate-600 font-semibold">
            <span>🧠</span> <span>Thuật toán SRS nhắc nhở thông minh</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-slate-600 font-semibold">
            <span>📱</span> <span>Cài đặt làm tiện ích mượt mà trên iPhone</span>
          </div>
        </div>

        {/* Nút Hành Động */}
        <div className="space-y-3 pt-4">
          <button
            onClick={() => router.push('/register')}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-slate-800 tracking-wide text-base"
          >
            Bắt đầu học ngay →
          </button>
          
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-transparent text-slate-700 font-bold rounded-2xl active:scale-98 transition-all hover:bg-slate-50 tracking-wide text-sm border border-slate-200"
          >
            Tôi đã có tài khoản
          </button>
        </div>

      </div>
    </main>
  );
}