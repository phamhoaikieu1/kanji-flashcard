'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

const OTP_FAIL_COUNT_KEY = 'nobi_otp_fail_count';
const OTP_LOCK_UNTIL_KEY = 'nobi_otp_lock_until';
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_DURATION_MS = 60_000;

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Mặc định nên bật để UX mobile tốt nhất
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // OTP login state
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpLockSeconds, setOtpLockSeconds] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Tự động quét xem trước đó có phiên lưu cứng không để chuyển thẳng vào dashboard
  useEffect(() => {
    const hasRedirectedRef = { current: false };
    const checkActiveSession = async () => {
      const { data: { user } } = await supabase.auth.getUser(); // fresh check
      if (user && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace('/dashboard');
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

  // Sync OTP lockout timer from sessionStorage
  useEffect(() => {
    const syncLockout = () => {
      const lockUntilRaw = sessionStorage.getItem(OTP_LOCK_UNTIL_KEY);
      if (!lockUntilRaw) {
        setOtpLockSeconds(0);
        return;
      }
      const remainingMs = Number(lockUntilRaw) - Date.now();
      if (remainingMs > 0) {
        setOtpLockSeconds(Math.ceil(remainingMs / 1000));
      } else {
        sessionStorage.removeItem(OTP_LOCK_UNTIL_KEY);
        sessionStorage.removeItem(OTP_FAIL_COUNT_KEY);
        setOtpLockSeconds(0);
      }
    };

    syncLockout();
    const interval = setInterval(syncLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus first OTP box when switching to OTP mode
  useEffect(() => {
    if (loginMode === 'otp') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    }
  }, [loginMode]);

  const handleVerifyOtp = async (codeOverride?: string) => {
    const otpCode = (codeOverride ?? otpDigits.join('')).trim();
    if (otpLockSeconds > 0) {
      toast.error(`Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${otpLockSeconds} giây!`);
      return;
    }
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('Vui lòng nhập đủ 6 chữ số OTP!');
      return;
    }
    if (isVerifyingOtp) return;

    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.rpc('verify_device_otp', {
        p_otp_code: otpCode,
      });

      if (error) throw error;

      if (data?.success === true && data?.session_payload) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session_payload.access_token,
          refresh_token: data.session_payload.refresh_token,
        });
        if (sessionError) throw sessionError;

        sessionStorage.removeItem(OTP_FAIL_COUNT_KEY);
        sessionStorage.removeItem(OTP_LOCK_UNTIL_KEY);
        toast.success('Đăng nhập thành công!');
        router.replace('/dashboard');
        return;
      }

      // Failed verification
      const nextFails = Number(sessionStorage.getItem(OTP_FAIL_COUNT_KEY) || '0') + 1;
      sessionStorage.setItem(OTP_FAIL_COUNT_KEY, String(nextFails));

      if (nextFails >= MAX_OTP_ATTEMPTS) {
        const lockUntil = Date.now() + OTP_LOCK_DURATION_MS;
        sessionStorage.setItem(OTP_LOCK_UNTIL_KEY, String(lockUntil));
        setOtpLockSeconds(Math.ceil(OTP_LOCK_DURATION_MS / 1000));
        toast.error('Nhập sai quá 5 lần liên tiếp! Tạm khóa trong 60 giây.');
      } else {
        toast.error(data?.message || 'Mã OTP không chính xác hoặc đã hết hạn!');
      }

      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } catch (error: any) {
      toast.error(error?.message || 'Xác thực OTP thất bại, vui lòng thử lại!');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    // Handle multi-digit input (e.g. mobile autofill / quick paste)
    if (clean.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 && index + i < 6; i++) {
        if (clean[i]) next[index + i] = clean[i];
      }
      setOtpDigits(next);
      const focusIdx = Math.min(index + clean.length, 5);
      otpInputRefs.current[focusIdx]?.focus();
      const joined = next.join('');
      if (joined.length === 6) {
        handleVerifyOtp(joined);
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    } else {
      const joined = next.join('');
      if (joined.length === 6) {
        handleVerifyOtp(joined);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = '';
        setOtpDigits(next);
      } else if (index > 0) {
        const next = [...otpDigits];
        next[index - 1] = '';
        setOtpDigits(next);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    const focusIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      
      <div className="my-auto w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kanji Flashcard</h1>
          <p className="text-sm text-slate-400">
            {loginMode === 'password'
              ? 'Đăng nhập bằng tài khoản, email hoặc sđt'
              : 'Nhập mã OTP 6 số từ thiết bị đã đăng nhập'}
          </p>
        </div>

        {loginMode === 'password' ? (
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

            <button
              type="button"
              onClick={() => setLoginMode('otp')}
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-100 transition-all text-xs tracking-wide"
            >
              🔢 Đăng nhập bằng mã OTP 6 số
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center">
                Mã OTP 6 chữ số
              </label>
              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    disabled={isVerifyingOtp || otpLockSeconds > 0}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-13 text-center text-xl font-black font-mono text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Mở Cài đặt trên thiết bị đã đăng nhập để lấy mã (hiệu lực 60 giây).
              </p>
            </div>

            {otpLockSeconds > 0 && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl px-3 py-2 text-center">
                Tạm khóa do nhập sai quá 5 lần. Thử lại sau {otpLockSeconds}s.
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingOtp || otpLockSeconds > 0 || otpDigits.join('').length < 6}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all hover:bg-indigo-700 text-sm tracking-wide disabled:bg-slate-300"
            >
              {otpLockSeconds > 0
                ? `Tạm khóa (${otpLockSeconds}s)`
                : isVerifyingOtp
                ? 'Đang xác thực mã...'
                : 'Xác nhận đăng nhập →'}
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setOtpDigits(['', '', '', '', '', '']);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs"
            >
              ← Đăng nhập bằng mật khẩu
            </button>
          </form>
        )}

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