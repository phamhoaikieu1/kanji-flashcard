'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(''); // 🔥 THÊM MỚI: State lưu Email
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      setEmail(user.email || ''); // Đổ email hiện tại từ Auth vào ô nhập
      const currentUserName = user.user_metadata?.display_name || 'Học viên Kanji';
      setDisplayName(currentUserName);

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          if (profileData.avatar_url) setCurrentAvatarUrl(profileData.avatar_url);
          if (profileData.username) setUsername(profileData.username);
          if (profileData.phone) setPhone(profileData.phone);
          if (profileData.dob) setDob(profileData.dob);
          
          // Quét động cột tên hiển thị
          const nameCol = 'display_name' in profileData ? 'display_name' 
                        : 'full_name' in profileData ? 'full_name' 
                        : 'username' in profileData ? 'username' : 'name';
          if (profileData[nameCol]) setDisplayName(profileData[nameCol]);
        }
      } catch (err) {
        console.error('Lỗi lấy cấu hình profile:', err);
      }
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.');
        return;
      }

      setUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: publicUrl });

      if (updateError) throw updateError;

      setCurrentAvatarUrl(publicUrl);
      toast.success('🎉 Cập nhật ảnh đại diện thành công!');
    } catch (error: any) {
      toast.error(`Lỗi upload ảnh: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      let isEmailChanged = false;

      // 1. Kiểm tra luồng đổi Email bảo mật
      if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        if (!email.includes('@')) {
          toast.error('Định dạng định danh Email mới không hợp lệ!');
          setSavingSettings(false);
          return;
        }
        
        // Gọi lệnh yêu cầu đổi Email lên hệ thống Supabase Auth
        const { error: updateEmailError } = await supabase.auth.updateUser({
          email: email.trim()
        });
        
        if (updateEmailError) throw updateEmailError;
        isEmailChanged = true;
      }

      // 2. Đồng bộ Metadata Auth cho Tên tài khoản
      const { error: updateMetadataError } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (updateMetadataError) throw updateMetadataError;

      // 3. Dò cột tên tương thích trong DB
      const { data: checkCol } = await supabase.from('profiles').select('*').limit(1);
      let nameCol = 'display_name';
      if (checkCol && checkCol.length > 0) {
        const firstRow = checkCol[0];
        if ('display_name' in firstRow) nameCol = 'display_name';
        else if ('full_name' in firstRow) nameCol = 'full_name';
        else if ('username' in firstRow) nameCol = 'username';
        else if ('name' in firstRow) nameCol = 'name';
      }

      // 4. Ghi đè cập nhật đa trường xuống bảng profiles
      const upsertBody: any = { 
        id: user.id,
        email: email.trim(), // Đồng bộ email vào bảng profiles phục vụ tính năng Login đa năng
        username: username.trim(),
        phone: phone.trim(),
        dob: dob || null
      };
      upsertBody[nameCol] = displayName;
      
      const { error: upsertError } = await supabase.from('profiles').upsert(upsertBody);
      if (upsertError) throw upsertError;

      // 5. Kiểm tra đổi mật khẩu (nếu học viên gõ mật khẩu mới)
      if (newPassword.trim() !== '') {
        if (newPassword.length < 6) {
          toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
          setSavingSettings(false);
          return;
        }
        const { error: updatePasswordError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (updatePasswordError) throw updatePasswordError;
      }

      // 6. Trả kết quả thông báo tương ứng theo hành động
      if (isEmailChanged) {
        toast.success('🎉 Đã gửi đường link xác nhận đến địa chỉ Email mới! Bạn hãy mở hộp thư đến để kích hoạt kích hoạt đổi Mail nhé.', { duration: 6000 });
      } else {
        toast.success('🎉 Đã cập nhật cấu hình tài khoản thành công!');
      }

      setNewPassword('');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(`Lỗi cập nhật: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Đã đăng xuất tài khoản thành công!');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none flex flex-col justify-between">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              🔧 Cấu hình hệ thống & Tài khoản
            </h3>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Quay lại ✕
            </button>
          </div>

          {/* Upload Avatar */}
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-300">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 font-bold text-xs">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">Ảnh đại diện</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-0.5 disabled:text-slate-400"
              >
                {uploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
            </div>
          </div>

          {/* Nhắc nhở định kỳ */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-700">⏰ Nhắc nhở học Kanji định kỳ</p>
              <p className="text-[10px] text-slate-400 font-medium">Hệ thống gửi thông báo tự động lúc 12h00 & 20h00</p>
            </div>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${reminderEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${reminderEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Form Thông tin cá nhân nâng cấp */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Đổi tên hiển thị</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* 👉 THÊM MỚI: Ô nhập địa chỉ Email tài khoản */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Địa chỉ Email tài khoản</label>
              <input 
                type="email" 
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Tên đăng nhập (Username)</label>
              <input 
                type="text" 
                placeholder="Ví dụ: trang_yeu_kieu"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Số điện thoại</label>
              <input 
                type="tel" 
                placeholder="Ví dụ: 0987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Ngày tháng năm sinh</label>
              <input 
                type="date" 
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400 text-left"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Mật khẩu mới (Để trống nếu giữ nguyên)</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              disabled={savingSettings}
              onClick={handleSaveSettings}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md active:scale-98 transition-all hover:bg-slate-800 disabled:bg-slate-300"
            >
              {savingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold active:scale-98 transition-all hover:bg-slate-200"
            >
              Hủy
            </button>
          </div>

          <div className="w-full h-px bg-slate-100 my-2" />

          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center space-x-1"
          >
            <span>🚪 Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </main>
  );
}