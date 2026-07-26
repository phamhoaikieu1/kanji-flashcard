'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useAdmin() {
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

  // Modal Khóa Tài Khoản
  const [lockModalUser, setLockModalUser] = useState<any>(null);
  const [lockSettings, setLockSettings] = useState(false);
  const [selectedLockedCourses, setSelectedLockedCourses] = useState<string[]>([]);
  const [lockDuration, setLockDuration] = useState<string>('unlock');
  const [isSavingLock, setIsSavingLock] = useState(false);

  const courseOptions = [
    { code: 'kanji', name: 'Từ vựng Kanji' },
    { code: 'grammar', name: 'Ngữ pháp Tiếng Nhật' },
    { code: 'basic_chinese', name: 'Tiếng Trung Cơ Bản' },
    { code: 'hsk', name: 'Tiếng Trung Nâng Cao (HSK)' },
  ];

  // 1. Kiểm tra quyền Admin/Owner
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

  // 2. Fetch danh sách học viên
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

  // 3. Tạo tài khoản học viên mới
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

      const copyText = `Chào ${newDisplayName}! Tài khoản học Kanji & Tiếng Trung của bạn đã được khởi tạo thành công:\n📧 Email: ${newEmail}\n🔑 Mật khẩu: ${newPassword}\n👉 Đăng nhập ngay tại: https://kanji-flashcard.vercel.app/login`;
      navigator.clipboard.writeText(copyText);
      toast('📋 Đã sao chép tin nhắn bàn giao tài khoản vào Clipboard!', { icon: '✨', duration: 4000 });

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

  // 4. Đổi mật khẩu
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

  // 5. Thăng / Hạ cấp Role
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

  // 6. Mở Modal Cấu hình Khóa
  const openLockModal = (user: any) => {
    setLockModalUser(user);
    setLockSettings(user.is_locked_settings || false);
    setSelectedLockedCourses(user.locked_courses || []);
    
    const isCurrentlyBanned = user.ban_until && new Date(user.ban_until) > new Date();
    setLockDuration(isCurrentlyBanned ? 'forever' : 'unlock');
  };

  // 7. Lưu Trạng Thái Khóa
  const handleSaveLock = async () => {
    setIsSavingLock(true);
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_LOCK_STATUS',
          userId: lockModalUser.id,
          isLockedSettings: lockSettings,
          lockedCourses: selectedLockedCourses,
          banDuration: lockDuration,
          requestingUserId: currentAdmin.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật khóa thất bại!');

      toast.success('🔒 Cập nhật thiết lập khóa thành công!');
      setLockModalUser(null);
      await fetchAllUsers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsSavingLock(false);
    }
  };

  // 8. Xóa Tài Khoản
  const handleDeleteUser = async (targetUser: any) => {
    const isTargetAdmin = targetUser.role === 'admin' || targetUser.role === 'owner';

    if (isTargetAdmin) {
      alert(`⚠️ CẢNH BÁO PHÂN QUYỀN:\nTài khoản "${targetUser.full_name}" đang mang quyền ${targetUser.role.toUpperCase()}.\n\nBạn cần bấm nút "⬇️ Hạ Cấp" về làm Học viên thường trước khi có thể xóa tài khoản này.`);
      return;
    }

    if (!confirm(`🚨 XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN:\nHọc viên: ${targetUser.full_name}\nEmail: ${targetUser.email}\n\nHành động này không thể hoàn tác!`)) return;

    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_USER',
          userId: targetUser.id,
          requestingUserId: currentAdmin.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xóa tài khoản thất bại!');

      toast.success(`🗑️ Đã xóa vĩnh viễn tài khoản ${targetUser.full_name}!`);
      await fetchAllUsers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const filteredUsers = usersList.filter(u => {
    const name = (u.full_name || u.display_name || u.email || '').toLowerCase();
    const id = (u.id || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || id.includes(search);
  });

  return {
    router,
    loading,
    adminRole,
    currentAdmin,
    filteredUsers,
    searchTerm,
    setSearchTerm,
    newDisplayName,
    setNewDisplayName,
    newEmail,
    setNewEmail,
    newPassword,
    setNewPassword,
    isCreating,
    resetModalUser,
    setResetModalUser,
    resetPasswordVal,
    setResetPasswordVal,
    isResetting,
    lockModalUser,
    setLockModalUser,
    lockSettings,
    setLockSettings,
    selectedLockedCourses,
    setSelectedLockedCourses,
    lockDuration,
    setLockDuration,
    isSavingLock,
    courseOptions,
    handleCreateUser,
    handleResetPassword,
    handleToggleRole,
    openLockModal,
    handleSaveLock,
    handleDeleteUser,
    generateRandomPassword,
  };
}