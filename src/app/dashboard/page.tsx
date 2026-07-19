'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  // --- CHÈN THÊM LOGIC VÀO ĐÂY ---
  const [user, setUser] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- CHÈN THÊM LOGIC BXH VÀO ĐÂY ---
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'streak' | 'words'>('streak');
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Tự động chọn cột tính điểm dựa trên Tab đang mở
      const columnToSort = leaderboardType === 'streak' ? 'streak' : 'words_learned';

      const { data } = await supabase
        .from('profiles')
        .select('full_name, streak, words_learned') 
        .order(columnToSort, { ascending: false }) 
        .limit(3);

      if (data) setLeaderboard(data);
    };
    fetchLeaderboard();
  }, [leaderboardType]); // Chạy lại hàm khi bấm đổi Tab
  // --- HẾT ĐOẠN LOGIC BXH ---

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setNewName(user.user_metadata?.full_name || '');
      } else {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const updates: any = {};
    if (newName && newName !== user?.user_metadata?.full_name) updates.data = { full_name: newName };
    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('Mật khẩu mới phải từ 6 ký tự trở lên!');
        setLoading(false);
        return;
      }
      updates.password = newPassword;
    }
    if (Object.keys(updates).length === 0) {
      toast.error('Bạn chưa thay đổi thông tin nào cả!');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser(updates);
    setLoading(false);
    if (error) {
      toast.error(`Lỗi cập nhật: ${error.message}`);
    } else {
      toast.success('Cập nhật thông tin thành công!');
      setNewPassword('');
      setIsSettingsOpen(false);
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
    }
  };
  // --- HẾT ĐOẠN CHÈN LOGIC ---
  const handleSelectLevel = (lvl: string) => {
    toast.success(`Đã chọn trình độ ${lvl}! Tiến vào kho thẻ bài.`);
    // Sau này chúng ta sẽ truyền level này sang trang flashcard để lọc từ
    router.push(`/flashcard?level=${lvl}`);
  };

  const handleLogout = async () => {
    // 1. Gọi lệnh xóa phiên đăng nhập trên Server Supabase
    await supabase.auth.signOut();
    
    // 2. Xóa các vết lưu phiên ở frontend cũ
    localStorage.removeItem('is_logged_in');
    sessionStorage.removeItem('is_logged_in');
    localStorage.removeItem('current_logged_in_user');
    
    toast.success('Đã đăng xuất tài khoản an toàn!');
    router.push('/'); // Quay về trang Landing ban đầu
  };
  
  // --- LOGIC XIN QUYỀN VÀ ĐĂNG KÝ KHUNG GIỜ NHẮC NHỞ ---
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Trình duyệt của bạn không hỗ trợ tính năng thông báo!');
      return;
    }

    // 1. Xin quyền hiển thị trên màn hình khóa iPhone/Android/PC
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. Giả lập hoặc lấy Token đăng ký (Web Push Subscription)
      const fakeToken = `token_${Math.random().toString(36).substr(2, 9)}`;

      // 3. Lưu token lên Supabase kèm theo ID của user đang đăng nhập
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{ user_id: user?.id, subscription_token: fakeToken }]);

      if (error) {
        toast.error('Không thể lưu cài đặt nhắc nhở!');
      } else {
        toast.success('🔔 Đã đặt lịch thành công! App sẽ nhắc bạn học vào 12h00 và 20h00 hàng ngày.');
      }
    } else {
      toast.error('Bạn đã từ chối cấp quyền thông báo mất rồi!');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans select-none">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* CHÈN HEADER CÁ NHÂN HÓA VÀ FORM VÀO ĐÂY */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between text-left">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white text-lg font-black shrink-0">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-800 text-sm truncate">
                Chào {user?.user_metadata?.full_name || 'Học viên'}! 👋
              </h3>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-sm shrink-0"
          >
            ⚙️
          </button>
        </div>
        {/* NÚT KÍCH HOẠT NHẮC NHỞ 12H & 8H TỐI */}
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2"
        >
          <span>⏰</span>
          <span>Bật nhắc nhở học Kanji (12h00 & 20h00)</span>
        </button>
        {isSettingsOpen && (
          <form onSubmit={handleUpdateProfile} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md space-y-4 text-left">
            <h4 className="font-bold text-slate-800 text-sm">🔧 Cài đặt tài khoản</h4>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Đổi tên hiển thị</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mật khẩu mới (Để trống nếu giữ nguyên)</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs shadow hover:bg-slate-800 disabled:bg-slate-300">
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-3 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">
                Hủy
              </button>
            </div>
          </form>
        )}
        {/* HẾT ĐOẠN CHÈN UI */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800">Chọn Trình Độ Mục Tiêu</h2>
          <p className="text-sm text-slate-400">Hôm nay bạn muốn rèn luyện Kanji cấp độ nào?</p>
        </div>

        {/* Danh sách nút chọn Level */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => handleSelectLevel(lvl)}
              className="w-full py-4 bg-white border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-bold text-lg rounded-2xl shadow-sm hover:shadow-md active:scale-99 transition-all flex items-center justify-between px-6 group"
            >
              <span>Tiếng Nhật {lvl}</span>
              <span className="text-slate-300 group-hover:text-slate-800 transition-colors">→</span>
            </button>
          ))}
        </div>
          {/* --- THAY TOÀN BỘ CÁI HỘP BXH CŨ BẰNG HỘP ĐA NĂNG NÀY --- */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-left space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-slate-800 text-sm flex items-center space-x-2">
              <span>🏆</span> <span>Bảng Xếp Hạng</span>
            </h4>
            
            {/* Thanh điều hướng chuyển đổi Tab */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLeaderboardType('streak')}
                className={`px-2.5 py-1 rounded-md transition-all ${leaderboardType === 'streak' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                Chuỗi 🔥
              </button>
              <button
                type="button"
                onClick={() => setLeaderboardType('words')}
                className={`px-2.5 py-1 rounded-md transition-all ${leaderboardType === 'words' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                Số từ 🧠
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Đang cập nhật danh sách...</p>
            ) : (
              leaderboard.map((player, index) => (
                <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">
                      {player.full_name || 'Học viên ẩn danh'}
                    </span>
                  </div>
                  
                  {/* Hiển thị số ngày hoặc số từ động theo Tab đang mở */}
                  {leaderboardType === 'streak' ? (
                    <span className="text-xs font-bold text-amber-500">🔥 {player.streak} ngày</span>
                  ) : (
                    <span className="text-xs font-bold text-indigo-500">🧠 {player.words_learned || 0} từ</span>
                  )}
                </div>
              ))
            )}
            </div>
            </div>
            {/* --- HẾT PHẦN HỘP BXH --- */}
        {/* Nút đăng xuất quay về */}
        <button 
          onClick={handleLogout}
          className="text-xs font-bold text-rose-500 hover:underline pt-4 block mx-auto"
        >
          Đăng xuất tài khoản
        </button>

      </div>
    </main>
  );
}