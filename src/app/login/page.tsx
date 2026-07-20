'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Mặc định nên bật để UX mobile tốt nhất
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tự động quét xem trước đó có phiên lưu cứng không để chuyển thẳng vào dashboard
  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkActiveSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim() || !password.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    setIsLoggingIn(true);
    let finalEmail = identifier.trim();

    try {
      // TRƯỜNG HỢP 1: Đăng nhập bằng Username hoặc Số điện thoại
      if (!finalEmail.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email') 
          .or(`username.eq.${finalEmail},phone.eq.${finalEmail}`)
          .maybeSingle();

        if (profileError) throw new Error('Lỗi xác thực hệ thống tài khoản.');
        if (!profile) throw new Error('Tên đăng nhập hoặc số điện thoại không tồn tại!');

        if (profile.email) {
          finalEmail = profile.email;
        } else {
          finalEmail = `${finalEmail.toLowerCase()}@kanji.app`;
        }
      }

      // TRƯỜNG HỢP 2: Gọi lệnh đăng nhập từ Supabase Server
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password,
      });

      if (loginError) {
        if (loginError.message === 'Invalid login credentials') {
          throw new Error('Mật khẩu không chính xác!');
        }
        throw loginError;
      }

      // 🔥 XỬ LÝ TRIỆT ĐỂ LƯU PHIÊN:
      // Nếu user KHÔNG chọn "Lưu phiên", ta ép Supabase Auth Token bay màu khi đóng tab bằng sessionSorage phối hợp
      if (!rememberMe) {
        // Chèn cờ đánh dấu xóa session khi tắt trình duyệt
        sessionStorage.setItem('clear_auth_on_close', 'true');
      } else {
        localStorage.setItem('kanji_remember_me', 'true');
      }

      toast.success('🎉 Đăng nhập thành công!');
      router.push('/dashboard');

    } catch (error: any) {
      toast.error(error.message || 'Đăng nhập thất bại, vui lòng thử lại!');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier || !identifier.includes('@')) {
      toast.error('Vui lòng nhập chính xác địa chỉ Email của bạn vào ô đăng nhập phía trên trước!');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(`Lỗi gửi mail khôi phục: ${error.message}`);
    } else {
      toast.success(`Hệ thống đã gửi đường link đặt lại mật khẩu vào hòm thư: ${identifier}.`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      
      <div className="my-auto w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kanji Flashcard</h1>
          <p className="text-sm text-slate-400">Đăng nhập bằng tài khoản, email hoặc sđt</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Tài khoản / Email / Số điện thoại
            </label>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username, email hoặc số điện thoại"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm font-medium"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-60 hover:opacity-100 transition-opacity p-1"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

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
            disabled={isLoggingIn}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide disabled:bg-slate-300"
          >
            {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập →'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Chưa có tài khoản?{' '}
          <button 
            type="button"
            onClick={() => router.push('/register')}
            className="font-bold text-slate-800 hover:underline"
          >
            Tạo tài khoản mới
          </button>
        </div>

      </div>

      {/* 📜 KHỐI CHÂN TRANG TRI ÂN CHÍNH CHỦ */}
      <div className="w-full mt-4 pb-1 text-center flex flex-col items-center justify-center space-y-1 select-none pointer-events-none flex-shrink-0">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[9px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>

    </main>
  );
}