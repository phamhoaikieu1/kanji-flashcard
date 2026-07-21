'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  // Trạng thái quản lý BXH, Profile và Modal Chọn Cấp Độ
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [totalSystemCards, setTotalSystemCards] = useState<number>(0);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState<boolean>(false);

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
        // 1. Đếm tổng số card_id trong hệ thống
        const { count: totalCards } = await supabase
          .from('flashcards')
          .select('card_id', { count: 'exact', head: true });
        
        if (totalCards) {
          setTotalSystemCards(totalCards);
        }

        // 2. Kéo dữ liệu thuộc bài
        const { data: memorizedData, error } = await supabase
          .from('user_memorized_cards')
          .select('user_id, card_id');

        if (error) throw error;

        const userCounts: { [key: string]: number } = {};
        memorizedData?.forEach((item: any) => {
          userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
        });

        // 3. Kéo dữ liệu profiles
        const { data: profileData } = await supabase.from('profiles').select('*');
        
        let nameCol = 'display_name';
        if (profileData && profileData.length > 0) {
          const firstRow = profileData[0];
          if ('display_name' in firstRow) nameCol = 'display_name';
          else if ('full_name' in firstRow) nameCol = 'full_name';
          else if ('username' in firstRow) nameCol = 'username';
          else if ('name' in firstRow) nameCol = 'name';
        }

        const profileMap: { [key: string]: { name: string; avatar: string } } = {};
        profileData?.forEach((p: any) => {
          if (p.id) {
            profileMap[p.id] = {
              name: p[nameCol] || '',
              avatar: p.avatar_url || ''
            };
          }
        });

        if (profileMap[user.id]?.avatar) {
          setCurrentAvatarUrl(profileMap[user.id].avatar);
        }

        // 4. Gom danh sách xếp hạng
        const allUserIds = Array.from(
          new Set([...Object.keys(userCounts), ...Object.keys(profileMap), user.id])
        );

        const realLeaderboard = allUserIds
          .map((uid) => {
            const isMe = uid === user.id;
            const pData = profileMap[uid] || {};
            
            return {
              id: uid,
              display_name: pData.name || (isMe ? currentUserName : `Học viên ẩn danh (${uid.substring(0, 4)})`),
              avatar_url: pData.avatar || '',
              total_words: userCounts[uid] || 0,
              is_current: isMe
            };
          })
          .sort((a, b) => b.total_words - a.total_words);

        setLeaderboardData(realLeaderboard);

      } catch (err: any) {
        console.error('Lỗi tính toán BXH:', err.message);
      }

      setLoading(false);
    };

    checkUserAndFetchData();
  }, [router]);

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

  // Hàm hỗ trợ mở Hồ sơ Cá nhân từ Header
  const handleOpenMyProfile = () => {
    const myWords = leaderboardData.find(p => p.is_current)?.total_words || 0;
    setSelectedProfile({
      id: user.id,
      display_name: displayName,
      avatar_url: currentAvatarUrl,
      total_words: myWords,
      is_current: true
    });
  };

  return (
    <main className="h-[100dvh] w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none flex flex-col justify-between overflow-hidden relative">
      
      <div className="w-full max-w-md mx-auto space-y-4 flex-grow flex flex-col justify-start">
        
        {/* 👤 KHỐI 1: Header thông tin người dùng (Bấm vào Avatar / Tên để mở Hồ sơ) */}
        <div className="w-full bg-white p-3.5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-shrink-0">
          <div 
            onClick={handleOpenMyProfile}
            className="flex items-center space-x-3 cursor-pointer group p-1 -m-1 rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-inner overflow-hidden border border-slate-200 flex-shrink-0">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                Chào {displayName}! 👋
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">{user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/settings')}
            className="p-2.5 rounded-xl border transition-all active:scale-95 bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767a1.123 1.123 0 0 0-.417 1.03c.004.074.006.148.006.222 0 .074-.002.148-.006.222a1.123 1.123 0 0 0 .417 1.03l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.25 1.25 0 0 0-.646-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.074-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767a1.122 1.122 0 0 0 .416-1.03c-.004-.074-.006-.148-.006-.222s.002-.148.006-.222a1.122 1.122 0 0 0-.416-1.03l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>

        {/* 🏆 KHỐI 2: Bảng Xếp Hạng Đua Top SỐ TỪ THUỘC (Cuộn nội bộ vừa vặn) */}
        <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col max-h-[380px] flex-shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-50 flex-shrink-0">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              🏆 Bảng Xếp Hạng Từ Vựng
            </h3>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
              Cập nhật Realtime
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto pt-2 pr-1 flex-grow no-scrollbar">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-[11px] font-bold text-slate-400 py-4">Chưa có ai học từ nào ở đây cả hết!</p>
            ) : (
              leaderboardData.map((player, index) => (
                <div 
                  key={player.id} 
                  onClick={() => setSelectedProfile(player)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold cursor-pointer active:scale-[0.98] transition-all hover:shadow-sm ${
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
                    <span className="truncate max-w-[130px]">{player.display_name}</span>
                  </div>
                  <div>
                    <span className="text-indigo-600 flex items-center gap-0.5 font-mono text-[11px]">
                      💬 {player.total_words} {totalSystemCards > 0 ? `/ ${totalSystemCards}` : 'từ'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🎯 KHỐI 3: NÚT GỘP CHỌN TRÌNH ĐỘ MỤC TIÊU */}
        <div className="w-full pt-1 flex-shrink-0">
          <button
            onClick={() => setIsLevelModalOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 px-5 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">🎯</span>
              <div className="text-left">
                <p className="text-xs font-extrabold">Chọn Trình Độ Mục Tiêu</p>
                <p className="text-[10px] text-slate-300 font-medium">Bấm để chọn cấp độ từ N5 đến N1</p>
              </div>
            </div>
            <span className="text-slate-300 group-hover:translate-x-1 transition-transform font-bold text-sm">
              →
            </span>
          </button>
        </div>

      </div>

      {/* 💬 KHỐI NÚT CHAT CỐ ĐỊNH (Floating Action Button ở góc dưới bên phải) */}
      <div className="fixed bottom-12 right-5 z-30">
        <button
          onClick={() => router.push('/chat')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-2xl active:scale-90 transition-all flex items-center justify-center border-2 border-white/20 group"
          title="Trung tâm nhắn tin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.596.596 0 0 1-.722-.544v-.057c0-.288.09-.567.258-.797a6.32 6.32 0 0 0 1.22-3.141C4.81 15.01 4 13.58 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-xs pl-0 group-hover:pl-2">
            Nhắn tin
          </span>
        </button>
      </div>

      {/* 📜 KHỐI 4: Chân trang tri ân Sensei Trang Dang */}
      <div className="w-full text-center flex flex-col items-center justify-center space-y-0.5 select-none pointer-events-none flex-shrink-0 pt-2 pb-1">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[8px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>

      {/* 🎯 POPUP BOTTOM SHEET: CHỌN TRÌNH ĐỘ (MỚI) */}
      <AnimatePresence>
        {isLevelModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLevelModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              
              <div className="text-center mb-5">
                <h3 className="text-base font-black text-slate-800">🎯 Chọn Trình Độ Mục Tiêu</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn rèn luyện Kanji cấp độ nào?</p>
              </div>

              <div className="w-full flex flex-col space-y-2.5 mb-4">
                {levels.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsLevelModalOpen(false);
                      toast.success(`Đang mở kho thẻ bài ${lvl.code}...`);
                      router.push(`/flashcard?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 py-3.5 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group"
                  >
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {lvl.label}
                    </span>
                    <span className="text-slate-300 group-hover:text-indigo-500 transition-colors font-bold text-xs">
                      Bắt đầu →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsLevelModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* 🚀 BOTTOM SHEET: XEM PROFILE CHÉO (Có nút Nhắn tin) */}
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
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative">
                  {selectedProfile.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">{selectedProfile.display_name.charAt(0).toUpperCase()}</span>
                  )}
                  {selectedProfile.is_current && (
                    <div className="absolute bottom-0 right-0 bg-indigo-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[9px]">✨</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-black text-slate-800">{selectedProfile.display_name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {selectedProfile.is_current ? 'Hồ sơ của bạn' : 'Học viên Kanji'}
                  </p>
                </div>

                {/* Số từ đã thuộc */}
                <div className="w-full pt-1">
                  <div className="bg-indigo-50 rounded-2xl p-4 text-center border border-indigo-100/50 shadow-sm w-full">
                    <p className="text-3xl font-black text-indigo-600 mb-0.5 font-mono">
                      {selectedProfile.total_words} {totalSystemCards > 0 ? `/ ${totalSystemCards}` : ''}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-wider">Tổng số từ đã thuộc</p>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="w-full space-y-2 pt-1">
                  {!selectedProfile.is_current && (
                    <button
                      onClick={() => {
                        setSelectedProfile(null);
                        router.push(`/chat?userId=${selectedProfile.id}`);
                      }}
                      className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"
                    >
                      <span>💬</span>
                      <span>Nhắn tin với {selectedProfile.display_name}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200"
                  >
                    Đóng hồ sơ
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}