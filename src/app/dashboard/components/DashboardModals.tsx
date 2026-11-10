import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ModalsProps {
  router: any;
  levels: any[];
  grammarLevels?: any[];
  hskLevels: any[];
  basicChineseLevels: any[];
  traditionalChineseLevels: any[];
  englishLevels?: any[];
  isLevelModalOpen: boolean;
  setIsLevelModalOpen: (val: boolean) => void;
  isGrammarModalOpen: boolean;
  setIsGrammarModalOpen: (val: boolean) => void;
  isHskModalOpen: boolean;
  setIsHskModalOpen: (val: boolean) => void;
  isBasicChineseModalOpen: boolean;
  setIsBasicChineseModalOpen: (val: boolean) => void;
  isTraditionalChineseModalOpen: boolean;
  setIsTraditionalChineseModalOpen: (val: boolean) => void;
  isEnglishModalOpen?: boolean;
  setIsEnglishModalOpen?: (val: boolean) => void;
  selectedProfile: any;
  setSelectedProfile: (val: any) => void;
  totalSystemCards: number;
  currentUserRole?: string;
  onToggleRole?: (user: any, newRole: string) => Promise<void>;
  onResetPassword?: (user: any, pass: string) => Promise<boolean>;
}

export function DashboardModals({
  router,
  levels,
  grammarLevels,
  hskLevels,
  basicChineseLevels,
  traditionalChineseLevels,
  englishLevels,
  isLevelModalOpen,
  setIsLevelModalOpen,
  isGrammarModalOpen,
  setIsGrammarModalOpen,
  isHskModalOpen,
  setIsHskModalOpen,
  isBasicChineseModalOpen,
  setIsBasicChineseModalOpen,
  isTraditionalChineseModalOpen,
  setIsTraditionalChineseModalOpen,
  isEnglishModalOpen,
  setIsEnglishModalOpen,
  selectedProfile,
  setSelectedProfile,
  totalSystemCards,
  currentUserRole = 'user',
  onToggleRole,
  onResetPassword,
}: ModalsProps) {
  const [showResetPassInput, setShowResetPassInput] = useState(false);
  const [newPassVal, setNewPassVal] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // Phân quyền tương tác
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin';
  const canAdminister = isOwner || isAdmin;

  const targetRole = selectedProfile?.role || 'user';
  const isTargetMe = selectedProfile?.is_current;
  const isTargetOwner = targetRole === 'owner';
  const isTargetAdmin = targetRole === 'admin';

  // Điều kiện hiển thị nút tương tác quản trị
  const canResetTargetPass = canAdminister && !isTargetMe && !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin));
  const canChangeTargetRole = isOwner && !isTargetMe && !isTargetOwner;

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onResetPassword) return;

    setIsSubmittingPass(true);
    const success = await onResetPassword(selectedProfile, newPassVal);
    setIsSubmittingPass(false);

    if (success) {
      setShowResetPassInput(false);
      setNewPassVal('');
    }
  };

  return (
    <>
      {/* 📚 POPUP 1: CHỌN TRÌNH ĐỘ TỪ VỰNG TIẾNG NHẬT */}
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">📚 Chọn Cấp Độ Từ Vựng Kanji</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn rèn luyện Kanji cấp độ nào?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {levels.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsLevelModalOpen(false);
                      toast.success(`Đang mở từ vựng ${lvl.code}...`);
                      router.push(`/flashcard?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {lvl.label}
                      </p>
                      {lvl.equiv && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                      )}
                    </div>
                    <span className="text-slate-300 group-hover:text-indigo-500 transition-colors font-bold text-xs">
                      Bắt đầu →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsLevelModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 📖 POPUP 2: CHỌN TRÌNH ĐỘ NGỮ PHÁP TIẾNG NHẬT */}
      <AnimatePresence>
        {isGrammarModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGrammarModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">📖 Chọn Cấp Độ Ngữ Pháp</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn học ngữ pháp cấp độ nào?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {(grammarLevels || levels).map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsGrammarModalOpen(false);
                      toast.success(`Đang mở ngữ pháp ${lvl.code}...`);
                      router.push(`/grammar?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {lvl.label}
                      </p>
                      {lvl.equiv && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                      )}
                    </div>
                    <span className="text-slate-300 group-hover:text-indigo-500 transition-colors font-bold text-xs">
                      Học ngay →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsGrammarModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🏮 POPUP 3: CHỌN CẤP ĐỘ TIẾNG TRUNG CƠ BẢN (CB1-CB6) */}
      <AnimatePresence>
        {isBasicChineseModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBasicChineseModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">🏮 Chọn Cấp Độ Tiếng Trung Cơ Bản</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn rèn luyện cấp độ mấy?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {basicChineseLevels.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsBasicChineseModalOpen(false);
                      toast.success(`Đang mở Tiếng Trung ${lvl.code}...`);
                      router.push(`/basic-chinese?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                        {lvl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                    </div>
                    <span className="text-slate-300 group-hover:text-emerald-500 transition-colors font-bold text-xs">
                      Học ngay →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsBasicChineseModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🇨🇳 POPUP 4: CHỌN TRÌNH ĐỘ TIẾNG TRUNG HSK */}
      <AnimatePresence>
        {isHskModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHskModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">🇨🇳 Chọn Cấp Độ HSK</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn học Tiếng Trung HSK mấy?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {hskLevels.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsHskModalOpen(false);
                      toast.success(`Đang mở tiếng Trung ${lvl.code}...`);
                      router.push(`/hsk?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-rose-50 hover:border-rose-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-rose-600 transition-colors">
                        {lvl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                    </div>
                    <span className="text-slate-300 group-hover:text-rose-500 transition-colors font-bold text-xs">
                      Học ngay →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsHskModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ⛩️ POPUP 5: CHỌN TRÌNH ĐỘ TIẾNG TRUNG PHỒN THỂ (A1 - C2) */}
      <AnimatePresence>
        {isTraditionalChineseModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTraditionalChineseModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">⛩️ Chọn Cấp Độ Phồn Thể</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn học Tiếng Trung Phồn Thể cấp độ nào?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {traditionalChineseLevels?.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      setIsTraditionalChineseModalOpen(false);
                      toast.success(`Đang mở Phồn Thể ${lvl.code}...`);
                      router.push(`/traditional-chinese?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-amber-50 hover:border-amber-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-amber-600 transition-colors">
                        {lvl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                    </div>
                    <span className="text-slate-300 group-hover:text-amber-500 transition-colors font-bold text-xs">
                      Học ngay →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsTraditionalChineseModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🇬🇧 POPUP 6: CHỌN TRÌNH ĐỘ TIẾNG ANH CEFR (A1 - C2) */}
      <AnimatePresence>
        {isEnglishModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEnglishModalOpen && setIsEnglishModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="text-center mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">🇬🇧 Chọn Cấp Độ Tiếng Anh CEFR</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Hôm nay bạn muốn học Tiếng Anh cấp độ nào?</p>
              </div>

              <div className="w-full flex flex-col space-y-2 mb-4 overflow-y-auto no-scrollbar pr-0.5">
                {englishLevels?.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => {
                      if (setIsEnglishModalOpen) setIsEnglishModalOpen(false);
                      toast.success(`Đang mở Tiếng Anh ${lvl.code}...`);
                      router.push(`/english-cefr?level=${lvl.code}`);
                    }}
                    className="w-full bg-slate-50 hover:bg-sky-50 hover:border-sky-100 py-3 px-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
                        {lvl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{lvl.equiv}</p>
                    </div>
                    <span className="text-slate-300 group-hover:text-sky-500 transition-colors font-bold text-xs">
                      Học ngay →
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsEnglishModalOpen && setIsEnglishModalOpen(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 flex-shrink-0 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 POPUP 7: XEM PROFILE CHÉO & QUẢN TRỊ TƯƠNG TÁC */}
      <AnimatePresence>
        {selectedProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProfile(null);
                setShowResetPassInput(false);
              }}
              className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2.5rem] p-6 shadow-2xl max-w-md mx-auto border-t border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex flex-col items-center space-y-3.5">
                
                {/* AVATAR & TAG CHỨC DANH */}
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md relative">
                  {selectedProfile.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">
                      {(selectedProfile.display_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  {selectedProfile.is_current && (
                    <div className="absolute bottom-0 right-0 bg-indigo-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow">
                      <span className="text-[9px]">✨</span>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-slate-900">{selectedProfile.display_name}</h3>
                  
                  {/* TAG CHỨC DANH ĐỘNG */}
                  <div className="flex items-center justify-center gap-1.5">
                    {isTargetOwner && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-200">
                        👑 CHỦ SỞ HỮU
                      </span>
                    )}
                    {isTargetAdmin && (
                      <span className="bg-indigo-100 text-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-black border border-indigo-200">
                        🛡️ QUẢN TRỊ VIÊN
                      </span>
                    )}
                    {!isTargetOwner && !isTargetAdmin && (
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200">
                        📚 HỌC VIÊN
                      </span>
                    )}
                    {selectedProfile.is_current && (
                      <span className="text-[10px] text-slate-400 font-bold">(Tài khoản của bạn)</span>
                    )}
                  </div>
                </div>

                {/* THÔNG THỐNG THÀNH TÍCH */}
                <div className="w-full pt-1">
                  <div className="bg-indigo-50/70 rounded-2xl p-3.5 text-center border border-indigo-100/60 shadow-sm w-full">
                    <p className="text-2xl font-black text-indigo-600 mb-0.5 font-mono">
                      {selectedProfile.total_words} {totalSystemCards > 0 ? `/ ${totalSystemCards}` : ''}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-600/80 uppercase tracking-wider">TỔNG THẺ ĐÃ THUỘC</p>
                  </div>
                </div>

                {/* NÚT TƯƠNG TÁC KHỐI QUẢN TRỊ */}
                {(canResetTargetPass || canChangeTargetRole) && (
                  <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 mt-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                      ⚡ THAO TÁC QUẢN TRỊ
                    </p>

                    <div className="flex gap-2">
                      {/* NÚT THĂNG / HẠ CẤP ROLE */}
                      {canChangeTargetRole && onToggleRole && (
                        isTargetAdmin ? (
                          <button
                            onClick={() => onToggleRole(selectedProfile, 'user')}
                            className="w-1/2 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-extrabold rounded-xl text-[11px] hover:bg-rose-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>⬇️</span> <span>Hạ Cấp</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onToggleRole(selectedProfile, 'admin')}
                            className="w-1/2 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold rounded-xl text-[11px] hover:bg-indigo-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>⭐</span> <span>Thăng Admin</span>
                          </button>
                        )
                      )}

                      {/* NÚT ĐỔI MẬT KHẨU NHANH */}
                      {canResetTargetPass && (
                        <button
                          onClick={() => setShowResetPassInput(!showResetPassInput)}
                          className={`${canChangeTargetRole ? 'w-1/2' : 'w-full'} py-2 bg-white border border-slate-300 text-slate-800 font-extrabold rounded-xl text-[11px] hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer`}
                        >
                          <span>🔑</span> <span>{showResetPassInput ? 'Đóng Đổi MK' : 'Đổi Mật Khẩu'}</span>
                        </button>
                      )}
                    </div>

                    {showResetPassInput && (
                      <form onSubmit={handleResetPasswordSubmit} className="pt-2 space-y-2">
                        <input
                          type="text"
                          value={newPassVal}
                          onChange={(e) => setNewPassVal(e.target.value)}
                          placeholder="Mật khẩu mới (Tối thiểu 6 ký tự)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingPass}
                          className="w-full py-2 bg-slate-900 text-white font-extrabold rounded-xl text-xs active:scale-95 transition-all shadow-md disabled:bg-slate-400 cursor-pointer"
                        >
                          {isSubmittingPass ? 'Đang lưu...' : 'Xác Nhận Đổi Mật Khẩu'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* NÚT NHẮN TIN & ĐÓNG */}
                <div className="w-full space-y-2 pt-1">
                  {!selectedProfile.is_current && (
                    <button
                      onClick={() => {
                        setSelectedProfile(null);
                        router.push(`/chat?userId=${selectedProfile.id}`);
                      }}
                      className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-extrabold active:scale-95 transition-all hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>Nhắn tin với {selectedProfile.display_name}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProfile(null);
                      setShowResetPassInput(false);
                    }}
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-slate-200 cursor-pointer"
                  >
                    Đóng hồ sơ
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}