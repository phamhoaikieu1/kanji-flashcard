'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AdminPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [adminRole, setAdminRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  // Danh sách học viên & Bộ lọc
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form tạo tài khoản mới
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal đổi mật khẩu
  const [resetModalUser, setResetModalUser] = useState<any>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 1. Kiểm tra quyền Admin/Owner khi vào trang
  useEffect(() => {
    const initAdmin = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'owner'].includes(profile.role)) {
        toast.error('Cảnh báo: Bạn không có quyền truy cập trang quản trị!');
        router.push('/dashboard');
        return;
      }

      setCurrentAdmin(user);
      setAdminRole(profile.role);
      await fetchAllUsers(user.id);
      setLoading(false);
    };

    initAdmin();
  }, [router]);

  // 2. Tải danh sách tất cả học viên thông qua API Server (Tránh lỗi RLS)
  const fetchAllUsers = async (adminId?: string) => {
    const activeAdminId = adminId || currentAdmin?.id;
    if (!activeAdminId) return;

    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_USERS',
          requestingUserId: activeAdminId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsersList(data.users);
      } else {
        toast.error(`Không thể lấy danh sách học viên: ${data.error || 'Lỗi không xác định'}`);
      }
    } catch (err: any) {
      console.error('Lỗi khi fetch users:', err);
    }
  };

  // 3. Xử lý Tạo tài khoản học viên mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName || !newEmail || !newPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự trở lên!');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_USER',
          email: newEmail,
          password: newPassword,
          displayName: newDisplayName,
          requestingUserId: currentAdmin.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tạo tài khoản thất bại!');

      toast.success(`🎉 Đã tạo thành công tài khoản cho ${newDisplayName}!`);

      // Sao chép nhanh tin nhắn chuyển giao tài khoản
      const copyText = `Chào ${newDisplayName}! Tài khoản học Kanji & HSK của bạn đã được khởi tạo thành công:\n📧 Email: ${newEmail}\n🔑 Mật khẩu: ${newPassword}\n👉 Đăng nhập ngay tại: https://kanji-flashcard.vercel.app/login`;
      navigator.clipboard.writeText(copyText);
      toast('📋 Đã sao chép tin nhắn bàn giao tài khoản vào Clipboard!', { icon: '✨', duration: 4000 });

      // Reset Form
      setNewDisplayName('');
      setNewEmail('');
      setNewPassword('');
      await fetchAllUsers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // 4. Xử lý Đổi Mật Khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      toast.error('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          userId: resetModalUser.id,
          newPassword: resetPasswordVal,
          requestingUserId: currentAdmin.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đổi mật khẩu thất bại!');

      const nameToDisplay = resetModalUser.full_name || resetModalUser.display_name || 'học viên';
      toast.success(`🔑 Đã đổi mật khẩu cho ${nameToDisplay}!`);
      setResetModalUser(null);
      setResetPasswordVal('');
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // 5. Xử lý Thăng / Hạ cấp Role
  const handleToggleRole = async (targetUser: any, targetNewRole: string) => {
    const targetName = targetUser.full_name || targetUser.display_name || 'Học viên';
    const confirmMsg = targetNewRole === 'admin' 
      ? `Xác nhận bổ nhiệm ${targetName} lên làm ADMIN?`
      : `Xác nhận HẠ CẤP ${targetName} về làm Học viên thường?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROLE',
          userId: targetUser.id,
          newRole: targetNewRole,
          requestingUserId: currentAdmin.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật quyền thất bại!');

      toast.success('Cập nhật quyền thành công!');
      await fetchAllUsers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  // Tạo ngẫu nhiên mật khẩu nhanh
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  // Lọc danh sách học viên
  const filteredUsers = usersList.filter(u => {
    const name = (u.full_name || u.display_name || u.email || '').toLowerCase();
    const id = (u.id || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || id.includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-700 font-extrabold text-sm animate-pulse">Đang xác thực quyền Quản trị...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-100 p-3 md:p-6 font-sans select-none flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-4">
        
        {/* HEADER QUẢN TRỊ */}
        <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200"
              title="Quay về Dashboard"
            >
              ← Dashboard
            </button>
            <div>
              <h1 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5">
                🛡️ TRANG QUẢN TRỊ HỌC VIÊN
              </h1>
              <p className="text-[11px] text-slate-500 font-bold">
                Cấp bậc hiện tại của bạn: <span className="font-extrabold text-indigo-700 uppercase">{adminRole}</span>
              </p>
            </div>
          </div>
        </div>

        {/* FORM TẠO TÀI KHOẢN MỚI */}
        <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>➕</span> <span>Cấp Tài Khoản Mới Cho Học Viên</span>
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên học viên</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Ví dụ: Trang Chuối"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Email đăng nhập</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="hocvien@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-700">Mật khẩu ban đầu</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-extrabold text-indigo-600 hover:underline active:scale-95 transition-transform"
                >
                  ⚡ Tạo nhanh mật khẩu
                </button>
              </div>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập hoặc bấm Tạo nhanh mật khẩu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs shadow-md active:scale-98 transition-all disabled:bg-slate-300"
            >
              {isCreating ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản & Copy Tin Nhắn Bàn Giao'}
            </button>
          </form>
        </div>

        {/* DANH SÁCH TÀI KHOẢN HỌC VIÊN */}
        <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> <span>Danh Sách Học Viên ({filteredUsers.length})</span>
            </h2>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Tìm tên học viên..."
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs outline-none focus:ring-2 focus:ring-slate-800 w-full md:w-52 bg-white"
            />
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-600">Không tìm thấy học viên nào trong hệ thống.</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isMe = u.id === currentAdmin.id;
                const isUserOwner = u.role === 'owner';
                const isUserAdmin = u.role === 'admin';
                const displayName = u.full_name || u.display_name || u.username || 'Học viên';

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between text-xs gap-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center flex-shrink-0 text-xs shadow-sm overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-extrabold text-slate-900 truncate flex items-center gap-1.5 text-xs">
                          <span>{displayName}</span>
                          {isUserOwner && <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-200">OWNER</span>}
                          {isUserAdmin && <span className="bg-indigo-100 text-indigo-900 text-[9px] px-1.5 py-0.5 rounded font-black border border-indigo-200">ADMIN</span>}
                          {isMe && <span className="text-[10px] text-slate-500 font-bold">(Bạn)</span>}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{u.email || u.id}</p>
                      </div>
                    </div>

                    {!isMe && !isUserOwner && (
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Nút Đổi MK */}
                        <button
                          onClick={() => setResetModalUser(u)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 font-extrabold rounded-xl text-[10px] hover:bg-slate-200 transition-colors shadow-sm"
                        >
                          🔑 Đổi MK
                        </button>

                        {/* Nút Thăng / Hạ Admin */}
                        {isUserAdmin ? (
                          adminRole === 'owner' && (
                            <button
                              onClick={() => handleToggleRole(u, 'user')}
                              className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-extrabold rounded-xl text-[10px] hover:bg-rose-100 transition-colors shadow-sm"
                            >
                              ⬇️ Hạ Cấp
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleToggleRole(u, 'admin')}
                            className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold rounded-xl text-[10px] hover:bg-indigo-100 transition-colors shadow-sm"
                          >
                            ⭐ Bổ Nhiệm Admin
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL CẤP LẠI MẬT KHẨU */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">🔑 Cấp Lại Mật Khẩu Mới</h3>
            <p className="text-xs text-slate-600 font-medium">
              Đổi mật khẩu cho học viên: <strong className="text-slate-900">{resetModalUser.full_name || resetModalUser.display_name || 'Học viên'}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                placeholder="Nhập mật khẩu mới (Min 6 ký tự)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                required
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors"
                >
                  {isResetting ? 'Đang lưu...' : 'Lưu Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}