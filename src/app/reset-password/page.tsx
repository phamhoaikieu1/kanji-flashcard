'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không trùng khớp!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    setLoading(true);

    // Gọi lệnh cập nhật mật khẩu mới lên Server Supabase
    // Lúc này Supabase đã tự động nhận diện phiên đổi mật khẩu từ cái 'code' trên URL
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(`Lỗi cập nhật mật khẩu: ${error.message}`);
    } else {
      toast.success('Đổi mật khẩu mới thành công! Hãy đăng nhập lại bằng mật khẩu mới.');
      router.push('/login');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Mật khẩu mới</h1>
          <p className="text-sm text-slate-400">Nhập mật khẩu mới bảo mật cho tài khoản của bạn</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mật khẩu mới</label>
            <div className="relative">
            <input 
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
                required
            />
            <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-60 hover:opacity-100 transition-opacity p-1"
            >
                {showNewPassword ? '👁️' : '🙈'}
            </button>
            </div>
          </div>

        <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nhập lại mật khẩu mới</label>
        <div className="relative">
            <input 
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
            required
            />
            <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-60 hover:opacity-100 transition-opacity p-1"
            >
            {showConfirmPassword ? '👁️' : '🙈'}
            </button>
        </div>
        </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide disabled:bg-slate-400"
          >
            {loading ? 'Đang cập nhật...' : 'Xác nhận thay đổi →'}
          </button>
        </form>

      </div>
    </main>
  );
}