'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  
  // Trạng thái đếm ngược Cooldown (chống spam)
  const [cooldown, setCooldown] = useState(0);

  // Xử lý đếm ngược theo thời gian thực
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRegisterNotice = (e: React.FormEvent) => {
    e.preventDefault();

    // Nếu đang trong thời gian chờ cooldown thì chặn ngay
    if (cooldown > 0) return;

    // 1. Dọn dẹp tất cả thông báo cũ (tránh dồn clone đè màn hình)
    toast.dismiss();

    // 2. Bật duy nhất 1 thông báo chuẩn
    toast(
      '🔒 Đăng ký tự do đã đóng!\nHãy liên hệ với Sensei Trang Dang để nhận tài khoản nhé.',
      {
        duration: 4000,
        icon: '💌',
        id: 'register-notice-toast', // ID cố định giúp đè Toast cũ
        style: {
          borderRadius: '1rem',
          background: '#0f172a',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
      }
    );

    // 3. Kích hoạt đếm ngược 8 giây chống bấm liên tục
    setCooldown(8);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        {/* Tiêu đề */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Cấp Tài Khoản</h1>
          <p className="text-sm text-slate-400">Hệ thống quản lý học viên nội bộ</p>
        </div>

        {/* Khung thông báo Khóa Đăng Ký */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-amber-800 font-extrabold text-xs">
            <span className="text-base">🔒</span>
            <span>TÍNH NĂNG ĐĂNG KÝ TỰ DO ĐÃ ĐÓNG</span>
          </div>
          <p className="text-[11px] text-amber-700/90 font-medium leading-relaxed">
            Hệ thống hiện chỉ nhận cấp tài khoản thủ công. Vui lòng liên hệ trực tiếp với{' '}
            <span className="font-extrabold text-amber-900 underline">Sensei Trang Dang</span> để nhận thông tin đăng nhập!
          </p>
        </div>

        {/* Form hướng dẫn - 100% Client Logic, Không gọi Supabase */}
        <form onSubmit={handleRegisterNotice} className="space-y-4 opacity-75">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tên của bạn</label>
            <input 
              type="text" 
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none text-sm bg-slate-50/50 cursor-not-allowed"
              readOnly
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
            <input 
              type="email" 
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none text-sm bg-slate-50/50 cursor-not-allowed"
              readOnly
            />
          </div>

          {/* Nút bấm có trạng thái Cooldown thông minh */}
          <button
            type="submit"
            disabled={cooldown > 0}
            className={`w-full py-3.5 font-bold rounded-xl shadow-md transition-all text-sm tracking-wide flex items-center justify-center gap-2 ${
              cooldown > 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-98'
            }`}
          >
            {cooldown > 0 ? (
              <span>⏳ Vui lòng chờ {cooldown}s...</span>
            ) : (
              <>
                <span>💬</span>
                <span>Yêu cầu cấp tài khoản</span>
              </>
            )}
          </button>
        </form>

        {/* Nút quay lại đăng nhập */}
        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Đã có tài khoản được cấp?{' '}
          <button 
            onClick={() => router.push('/login')}
            className="font-bold text-indigo-600 hover:underline"
          >
            Đăng nhập ngay →
          </button>
        </div>

      </div>

      {/* Footer tri ân */}
      <div className="text-center mt-6 select-none pointer-events-none">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
      </div>
    </main>
  );
}