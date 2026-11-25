'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { unlockScreen } from '@/utils/deviceManager';
import { toast } from 'react-hot-toast';

interface ScreenLockOverlayProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
    };
  };
  onUnlocked: () => void;
  onSignOut: () => Promise<void>;
}

export default function ScreenLockOverlay({
  user,
  onUnlocked,
  onSignOut,
}: ScreenLockOverlayProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState(
    user.user_metadata?.display_name || 'Tài khoản của bạn'
  );

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, full_name, username')
          .eq('id', user.id)
          .maybeSingle();

        if (!active || !data) return;
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        const resolvedName =
          data.display_name || data.full_name || data.username;
        if (resolvedName) setDisplayName(resolvedName);
      } catch {
        // Fallback to user_metadata display_name
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [user.id]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Vui lòng nhập mật khẩu để mở khóa!');
      return;
    }
    if (!user.email) {
      toast.error('Không tìm thấy email tài khoản!');
      return;
    }

    setIsUnlocking(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        toast.error('Mật khẩu không chính xác!');
        return;
      }

      unlockScreen();
      setPassword('');
      toast.success('Đã mở khóa màn hình!');
      onUnlocked();
    } catch {
      toast.error('Mật khẩu không chính xác!');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 space-y-5 text-center">
        <div className="flex flex-col items-center space-y-2.5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-black overflow-hidden border-2 border-indigo-100 shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md border-2 border-white">
              🔒
            </span>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {displayName}
            </h2>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[260px]">
              {user.email}
            </p>
          </div>

          <span className="inline-block bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-3 py-1 rounded-full">
            Màn hình đang tạm khóa
          </span>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3 text-left">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Mật khẩu tài khoản
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu để mở khóa"
                autoFocus
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base opacity-60 hover:opacity-100 p-1"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUnlocking}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all text-sm disabled:bg-indigo-300"
          >
            {isUnlocking ? 'Đang xác thực...' : '🔓 Mở khóa'}
          </button>
        </form>

        <button
          type="button"
          onClick={onSignOut}
          className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors underline underline-offset-2"
        >
          Đăng xuất hoàn toàn
        </button>
      </div>
    </div>
  );
}
