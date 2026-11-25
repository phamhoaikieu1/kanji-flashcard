'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getOrCreateDeviceId, lockScreen } from '@/utils/deviceManager';

interface UserDeviceRow {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  status: string;
  last_active_at: string;
}

function formatLastActive(isoString: string): string {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Date(isoString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

  // Device OTP state
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number>(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // Device management state
  const [devices, setDevices] = useState<UserDeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [revokingAllOther, setRevokingAllOther] = useState(false);
  const currentDeviceId = typeof window !== 'undefined' ? getOrCreateDeviceId() : '';

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

  const fetchDevices = useCallback(async (userId: string) => {
    setLoadingDevices(true);
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('last_active_at', { ascending: false });

      if (error) throw error;

      const list = (data || []) as UserDeviceRow[];
      const localDeviceId = getOrCreateDeviceId();
      list.sort((a, b) => {
        if (a.device_id === localDeviceId && b.device_id !== localDeviceId) return -1;
        if (b.device_id === localDeviceId && a.device_id !== localDeviceId) return 1;
        return 0;
      });
      setDevices(list);
    } catch {
      // Table might not exist yet or transient error
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchDevices(user.id);
    }
  }, [user?.id, fetchDevices]);

  const handleRevokeDevice = async (targetDevice: UserDeviceRow) => {
    if (!user?.id) return;
    setRevokingDeviceId(targetDevice.device_id);
    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ status: 'revoked' })
        .eq('user_id', user.id)
        .eq('device_id', targetDevice.device_id);

      if (error) throw error;

      setDevices((prev) => prev.filter((d) => d.device_id !== targetDevice.device_id));
      toast.success(`Đã đăng xuất "${targetDevice.device_name}"!`);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đăng xuất thiết bị này!');
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleRevokeAllOtherDevices = async () => {
    if (!user?.id) return;
    setRevokingAllOther(true);
    try {
      const localDeviceId = getOrCreateDeviceId();
      const { error } = await supabase
        .from('user_devices')
        .update({ status: 'revoked' })
        .eq('user_id', user.id)
        .neq('device_id', localDeviceId)
        .eq('status', 'active');

      if (error) throw error;

      setDevices((prev) => prev.filter((d) => d.device_id === localDeviceId));
      toast.success('Đã đăng xuất tất cả thiết bị khác!');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đăng xuất các thiết bị khác!');
    } finally {
      setRevokingAllOther(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Đã đăng xuất tài khoản thành công!');
    router.push('/login');
  };

  useEffect(() => {
    if (!otpCode || otpSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setOtpCode(null);
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpCode, otpSecondsLeft]);

  const handleGenerateOtp = async () => {
    setGeneratingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session?.refresh_token) {
        toast.error('Không tìm thấy phiên đăng nhập hợp lệ. Vui lòng đăng nhập lại!');
        return;
      }

      const { data, error } = await supabase.rpc('generate_device_otp', {
        p_session_payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      });

      if (error) throw error;

      const generatedCode =
        typeof data === 'string'
          ? data
          : data?.otp_code || data?.code || data?.otp || '';

      if (!generatedCode) {
        throw new Error(data?.message || 'Không thể tạo mã OTP!');
      }

      setOtpCode(String(generatedCode).trim());
      setOtpSecondsLeft(60);
      setOtpExpired(false);
      toast.success('Đã tạo mã OTP đăng nhập!');
    } catch (error: any) {
      toast.error(error?.message || 'Lỗi tạo mã OTP!');
    } finally {
      setGeneratingOtp(false);
    }
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

          {/* Đăng nhập thiết bị khác (Mã OTP 1 phút) */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-indigo-950 tracking-tight">
                Đăng nhập thiết bị khác (Mã OTP 1 phút)
              </h4>
              {otpCode && otpSecondsLeft > 0 && (
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${otpSecondsLeft <= 10 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-700'}`}>
                  {otpSecondsLeft}s
                </span>
              )}
            </div>

            {otpCode && otpSecondsLeft > 0 ? (
              <div className="space-y-2.5 text-center py-1">
                <div className="flex items-center justify-center gap-1.5">
                  {otpCode.slice(0, 6).split('').map((digit, idx) => (
                    <span
                      key={idx}
                      className={`w-10 h-12 flex items-center justify-center bg-white border-2 border-indigo-200 rounded-xl text-2xl font-black font-mono text-indigo-700 shadow-xs ${idx === 2 ? 'mr-2' : ''}`}
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-indigo-700">
                  Nhập mã này trên thiết bị mới trong {otpSecondsLeft} giây
                </p>
              </div>
            ) : otpExpired ? (
              <div className="space-y-2.5 text-center py-1">
                <p className="text-xs font-bold text-rose-600">Mã đã hết hạn</p>
                <button
                  type="button"
                  onClick={handleGenerateOtp}
                  disabled={generatingOtp}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-98 transition-all disabled:bg-indigo-300"
                >
                  {generatingOtp ? 'Đang tạo mã...' : '🔄 Lấy mã mới'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateOtp}
                disabled={generatingOtp}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-98 transition-all disabled:bg-indigo-300"
              >
                {generatingOtp ? 'Đang tạo mã...' : '🔑 Lấy mã đăng nhập (6 số)'}
              </button>
            )}

            <p className="text-[10px] text-slate-500 font-medium text-center leading-relaxed">
              Mã chỉ tồn tại 60 giây và tự hủy ngay sau 1 lần sử dụng.
            </p>
          </div>

          {/* Quản lý thiết bị */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 tracking-tight">
                Quản lý thiết bị ({devices.length})
              </h4>
              <button
                type="button"
                onClick={() => user?.id && fetchDevices(user.id)}
                disabled={loadingDevices}
                className="text-[11px] font-bold text-indigo-600 hover:underline disabled:text-slate-400"
              >
                {loadingDevices ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>

            {loadingDevices && devices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Đang tải danh sách thiết bị...</p>
            ) : devices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Chưa có dữ liệu thiết bị nào.</p>
            ) : (
              <div className="space-y-2">
                {devices.map((dev) => {
                  const isCurrent = dev.device_id === currentDeviceId;
                  return (
                    <div
                      key={dev.device_id}
                      className="flex items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-xl px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {dev.device_name || 'Thiết bị không xác định'}
                          </span>
                          {isCurrent && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              Thiết bị này
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Hoạt động: {formatLastActive(dev.last_active_at)}
                        </p>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(dev)}
                          disabled={revokingDeviceId === dev.device_id}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                        >
                          {revokingDeviceId === dev.device_id ? 'Đang xử lý...' : 'Đăng xuất'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {devices.some((d) => d.device_id !== currentDeviceId) && (
              <button
                type="button"
                onClick={handleRevokeAllOtherDevices}
                disabled={revokingAllOther}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 rounded-xl text-xs font-bold transition-all active:scale-98 disabled:opacity-50"
              >
                {revokingAllOther ? 'Đang đăng xuất...' : 'Đăng xuất tất cả thiết bị khác'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => lockScreen()}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center space-x-1"
          >
            <span>🔒 Khóa màn hình ngay</span>
          </button>

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