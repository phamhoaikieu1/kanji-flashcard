'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Thêm chữ async ở đây để kích hoạt tính năng chờ Server phản hồi
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name && email && password) {
      // Gọi lệnh tạo tài khoản lên thẳng Server Supabase thật
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name, // Lưu tên của bạn vào bộ nhớ của user trên Server
          },
        },
      });

      // Nếu Server trả về lỗi (ví dụ: email sai định dạng, mật khẩu quá ngắn...)
      if (error) {
        toast.error(`Lỗi đăng ký từ Server: ${error.message}`);
        return;
      }

      toast.success('Đăng ký tài khoản thành công trên Server thật! Tiến về màn hình Đăng nhập.');
      router.push('/login');
    } else {
      toast.error('Vui lòng điền đầy đủ thông tin!');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        
        {/* Tiêu đề */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tạo tài khoản</h1>
          <p className="text-sm text-slate-400">Bắt đầu hành trình chinh phục Kanji</p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tên của bạn</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
              required
            />
          </div>

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
            <div className="relative">
                <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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

          {/* Nút đăng ký */}
          <button
            type="submit"
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide"
          >
            Đăng ký tài khoản
          </button>
        </form>

        {/* Quay lại đăng nhập */}
        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Đã có tài khoản rồi?{' '}
          <button 
            onClick={() => router.push('/login')}
            className="font-bold text-slate-800 hover:underline"
          >
            Đăng nhập ngay
          </button>
        </div>

      </div>
    </main>
  );
}