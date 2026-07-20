'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  // Trạng thái quản lý BXH thực tế và Bottom Sheet xem chéo profile
  const [rankingTab, setRankingTab] = useState<'streak' | 'words'>('streak');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const rankingTabRef = useRef(rankingTab);
  rankingTabRef.current = rankingTab;

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      const currentUserName = user.user_metadata?.display_name || 'Học viên Kanji';
      setDisplayName(currentUserName);

      try {
        // 1. Kéo dữ liệu thuộc bài từ bảng user_memorized_cards
        const { data: memorizedData, error } = await supabase
          .from('user_memorized_cards')
          .select('user_id');

        if (error) throw error;

        const userCounts: { [key: string]: number } = {};
        memorizedData?.forEach((item: any) => {
          userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
        });

        // 2. Kéo toàn bộ dữ liệu từ bảng profiles để ánh xạ Avatar & Streak cứng từ Server
        const { data: profileData } = await supabase.from('profiles').select('*');
        
        let nameCol = 'display_name';
        if (profileData && profileData.length > 0) {
          const firstRow = profileData[0];
          if ('display_name' in firstRow) nameCol = 'display_name';
          else if ('full_name' in firstRow) nameCol = 'full_name';
          else if ('username' in firstRow) nameCol = 'username';
          else if ('name' in firstRow) nameCol = 'name';
        }

        const profileMap: { [key: string]: { name: string; avatar: string; streak: number } } = {};
        profileData?.forEach((p: any) => {
          if (p.id) {
            profileMap[p.id] = {
              name: p[nameCol] || '',
              avatar: p.avatar_url || '',
              streak: p.streak || 0
            };
          }
        });

        // Đồng bộ hiển thị Avatar cá nhân lên Header
        if (profileMap[user.id]?.avatar) {
          setCurrentAvatarUrl(profileMap[user.id].avatar);
        }

        // 3. Tạo cấu trúc mảng xếp hạng chuẩn (Kèm Avatar và Streak từ Server)
        const realLeaderboard = Object.keys(userCounts).map((uid) => {
          const isMe = uid === user.id;
          const pData = profileMap[uid] || {};
          
          return {
            id: uid,
            display_name: pData.name || (isMe ? currentUserName : `Học viên ẩn danh (${uid.substring(0, 4)})`),
            avatar_url: pData.avatar || '',
            streak: pData.streak || 0,
            total_words: userCounts[uid],
            is_current: isMe
          };
        });

        // Tối ưu hóa Inline Sorting phía Client-side
        if (rankingTab === 'streak') {
          realLeaderboard.sort((a, b) => b.streak - a.streak);
        } else {
          realLeaderboard.sort((a, b) => b.total_words - a.total_words);
        }
        
        setLeaderboardData(realLeaderboard);

      } catch (err: any) {
        console.error('Lỗi tính toán BXH thật:', err.message);
      }

      setLoading(false);
    };

    checkUserAndFetchData();
  }, [router, rankingTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ dữ liệu tài khoản...</p>
      </div>
    );
  }

  const levels = [
    { code: 'N5', label: 'Tiếng Nhật N5' },
    { code: 'N4', label: 'Tiếng Nhật N4' },
    { code: 'N3', label: 'Tiếng Nhật N3' },
    { code: 'N2', label: 'Tiếng Nhật N2' },
    { code: 'N1', label: 'Tiếng Nhật N1' },
  ];

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none flex flex-col justify-between">
      
      <div className="w-full max-w-md mx-auto space-y-5">
        
        {/* 👤 KHỐI 1: Header thông tin người dùng */}
        <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-inner overflow-hidden border border-slate-200">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                Chào {displayName}! 👋
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{user?.email}</p>
            </div>
          </div>
          
          {/* Nút cài đặt chuyển tiếp hướng luồng sang Route hệ thống độc lập */}
          <button 
            onClick={() => router.push('/settings')}
            className="p-2.5 rounded-xl border transition-all active:scale-95 bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767a1.123 1.123 0 0 0-.417 1.03c.004.074.006.148.006.222 0 .074-.002.148-.006.222a1.123 1.123 0 0 0 .417 1.03l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.646-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.074-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767a1.122 1.122 0 0 0 .416-1.03c-.004-.074-.006-.148-.006-.222s.002-.148.006-.222a1.122 1.122 0 0 0-.416-1.03l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>

        {/* 🏆 KHỐI 2: Bảng Xếp Hạng Đua Top DỮ LIỆU THẬT */}
        <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              🏆 Bảng Xếp Hạng
            </h3>
            <div className="flex p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
              <button 
                onClick={() => setRankingTab('streak')}
                className={`px-2.5 py-1 rounded-md transition-all ${rankingTab === 'streak' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'}`}
              >
                Chuỗi 🔥
              </button>
              <button 
                onClick={() => setRankingTab('words')}
                className={`px-2.5 py-1 rounded-md transition-all ${rankingTab === 'words' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'}`}
              >
                Số từ 💬
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-[11px] font-bold text-slate-400 py-2">Chưa có ai học từ nào ở đây cả hêt!</p>
            ) : (
              leaderboardData.map((player, index) => (
                <div 
                  key={player.id} 
                  onClick={() => setSelectedProfile(player)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold cursor-pointer active:scale-[0.98] transition-all hover:shadow-sm ${
                    player.is_current 
                      ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' 
                      : 'bg-slate-50/50 border-slate-100 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-slate-400 w-4 font-black">{index + 1}.</span>
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt="Ava" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">{player.display_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="truncate max-w-[140px]">{player.display_name}</span>
                  </div>
                  <div>
                    {rankingTab === 'streak' ? (
                      <span className="text-amber-600 flex items-center gap-0.5">🔥 {player.streak} ngày</span>
                    ) : (
                      <span className="text-indigo-600 flex items-center gap-0.5 font-mono">💬 {player.total_words} từ / 100</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🎯 KHỐI 3: Khu vực chọn Trình độ mục tiêu */}
        <div className="text-center pt-2 pb-1">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Chọn Trình Độ Mục Tiêu</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn rèn luyện Kanji cấp độ nào?</p>
        </div>

        <div className="w-full flex flex-col space-y-3">
          {levels.map((lvl) => (
            <button
              key={lvl.code}
              onClick={() => {
                toast.success(`Đang mở kho thẻ bài ${lvl.code}...`);
                router.push(`/flashcard?level=${lvl.code}`);
              }}
              className="w-full bg-white py-4 px-5 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] active:shadow-inner transition-all hover:border-slate-200 flex items-center justify-between text-left group"
            >
              <span className="text-sm font-extrabold text-slate-700 group-hover:text-slate-900 transition-colors">
                {lvl.label}
              </span>
              <span className="text-slate-300 group-hover:text-slate-500 transition-colors font-bold">
                →
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* 📜 KHỐI 4: Chân trang tri ân Sensei Trang Dang */}
      <div className="w-full mt-8 pb-1 text-center flex flex-col items-center justify-center space-y-1 select-none pointer-events-none flex-shrink-0">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[9px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>
      
      {/* 🚀 KHỐI 5: Bottom Sheet Xem Profile Chéo (Client Interaction 0-Byte Network) */}
      <AnimatePresence>
        {selectedProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProfile(null)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative">
                  {selectedProfile.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-slate-400">{selectedProfile.display_name.charAt(0).toUpperCase()}</span>
                  )}
                  {selectedProfile.is_current && (
                    <div className="absolute bottom-0 right-0 bg-indigo-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[10px]">✨</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-800">{selectedProfile.display_name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {selectedProfile.is_current ? 'Hồ sơ của bạn' : 'Học viên Kanji'}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full justify-center pt-4">
                  <div className="bg-amber-50 rounded-2xl p-4 flex-1 text-center border border-amber-100/50 shadow-sm">
                    <p className="text-3xl font-black text-amber-500 mb-1">🔥 {selectedProfile.streak}</p>
                    <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-wider">Chuỗi ngày</p>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-4 flex-1 text-center border border-indigo-100/50 shadow-sm">
                    <p className="text-3xl font-black text-indigo-500 mb-1 font-mono">{selectedProfile.total_words}</p>
                    <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-wider">Từ đã thuộc</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="w-full mt-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200"
                >
                  Đóng hồ sơ
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}