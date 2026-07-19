'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // Trạng thái lưu phiên đăng nhập
  const [showPassword, setShowPassword] = useState(false);

  // Thêm chữ async để xử lý bất đồng bộ với Server
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email && password) {
      // 1. Gọi lệnh đăng nhập tài khoản bằng Email/Password lên Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        toast.error(`Lỗi đăng nhập: ${error.message}`);
        return;
      }

      toast.success('Đăng nhập Server thật thành công!');

      // 2. Cơ chế lưu phiên đăng nhập dựa trên checkbox rememberMe của bạn
      if (rememberMe) {
        localStorage.setItem('is_logged_in', 'true');
      } else {
        sessionStorage.setItem('is_logged_in', 'true');
      }

      router.push('/dashboard'); // Tiến thẳng vào màn hình Chọn trình độ
    } else {
      toast.error('Vui lòng điền đầy đủ thông tin!');
    }
  };

  // 3. Hàm xử lý Quên mật khẩu - Gửi mail khôi phục thật tự động từ Supabase
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Vui lòng nhập Email của bạn vào ô nhập phía trên trước để hệ thống biết gửi mã về đâu!');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`, // Mới
    });

    if (error) {
      toast.error(`Lỗi gửi mail khôi phục: ${error.message}`);
    } else {
      toast.success(`Hệ thống đã gửi một đường link đặt lại mật khẩu vào hòm thư: ${email}. Bạn hãy kiểm tra hộp thư đến (hoặc thư rác) nhé!`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kanji Flashcard</h1>
          <p className="text-sm text-slate-400">Đăng nhập để tiếp tục tiến trình học</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mật khẩu</label>
            {/* Thêm relative ở thẻ bọc ngoài */}
            <div className="relative">
                <input 
                type={showPassword ? 'text' : 'password'} // Thay đổi type động ở đây
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
                required
                />
                {/* Nút bấm con mắt nằm đè lên góc phải ô input */}
                <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-60 hover:opacity-100 transition-opacity p-1"
                >
                {showPassword ? '👁️' : '🙈'}
                </button>
            </div>
          </div>

          {/* Ô checkbox Lưu phiên + Nút Quên mật khẩu */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-800 accent-slate-900"
              />
              <span className="text-xs font-semibold text-slate-500">Lưu phiên đăng nhập</span>
            </label>

            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide"
          >
            Đăng nhập →
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Chưa có tài khoản?{' '}
          <button 
            onClick={() => router.push('/register')}
            className="font-bold text-slate-800 hover:underline"
          >
            Tạo tài khoản mới
          </button>
        </div>

      </div>
    </main>
  );
}