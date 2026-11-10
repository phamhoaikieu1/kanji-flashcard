'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toBase64Url } from '@/utils/dropzone';
import toast from 'react-hot-toast';

export default function PublicDropzoneHome() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'join' | 'create' | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user);
      }
    });
  }, []);

  // Xử lý Vào phòng
  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = roomCode;

    if (!code || code.length === 0) {
      toast.error('Vui lòng nhập mã phòng!');
      return;
    }
    if (code.length > 6) {
      toast.error('Mã phòng chỉ được tối đa 6 ký tự!');
      return;
    }

    setIsLoading(true);
    setActionType('join');

    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('id, code')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        console.error('Error finding room:', error);
        toast.error('Lỗi khi kiểm tra phòng. Vui lòng thử lại!');
        return;
      }

      if (!room) {
        toast.error(`Phòng "${code}" chưa tồn tại.`);
        return;
      }

      const slug = toBase64Url(code);
      router.push(`/room/${slug}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  // Xử lý Tạo phòng (INSERT trực tiếp với UNIQUE constraint để chống race condition)
  const handleCreateRoom = async () => {
    const code = roomCode;

    if (!code || code.length === 0) {
      toast.error('Vui lòng nhập mã phòng (1–6 ký tự)!');
      return;
    }
    if (code.length > 6) {
      toast.error('Mã phòng chỉ được từ 1 đến 6 ký tự!');
      return;
    }

    setIsLoading(true);
    setActionType('create');

    try {
      const { error } = await supabase
        .from('rooms')
        .insert({ code })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          toast.error(`Mã phòng "${code}" đã tồn tại. Vui lòng chọn mã khác hoặc bấm "Vào phòng".`);
        } else {
          toast.error(`Không thể tạo phòng: ${error.message}`);
        }
        return;
      }

      toast.success(`Đã tạo phòng "${code}"!`);
      const slug = toBase64Url(code);
      router.push(`/room/${slug}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans select-none antialiased">
      {/* Top Navigation */}
      <header className="w-full max-w-4xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
            PD
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">
            Public Dropzone
          </span>
          <span className="text-[11px] font-medium bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300/40">
            15m Expiry
          </span>
        </div>

        <div>
          {sessionUser ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition active:scale-95"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition active:scale-95"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center space-y-5">
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Share files instantly.
          </h1>

          {/* Room Code Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <form onSubmit={handleJoinRoom} className="space-y-3.5">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Mã phòng..."
                  autoFocus
                  className="w-full px-4 py-3.5 text-center text-2xl font-black text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-slate-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                  {roomCode.length}/6
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="submit"
                  disabled={isLoading || !roomCode}
                  className="w-full py-3 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  {isLoading && actionType === 'join' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Vào phòng</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={isLoading || !roomCode}
                  className="w-full py-3 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  {isLoading && actionType === 'create' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>+ Tạo phòng</span>
                  )}
                </button>
              </div>
            </form>

            {/* Note */}
            <div className="pt-1 text-[11px] text-slate-400 font-medium">
              1–6 ký tự · Phân biệt hoa/thường
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Spacer for Visual Balance */}
      <div className="py-5" />
    </div>
  );
}
