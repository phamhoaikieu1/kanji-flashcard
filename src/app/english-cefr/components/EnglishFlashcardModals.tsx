import { motion, AnimatePresence } from 'framer-motion';

interface ModalsProps {
  isLessonModalOpen: boolean;
  setIsLessonModalOpen: (open: boolean) => void;
  availableLessons: number[];
  selectedLessons: number[];
  setSelectedLessons: (lessons: number[]) => void;
  isDisplayModalOpen: boolean;
  setIsDisplayModalOpen: (open: boolean) => void;
  frontConfig: { word: boolean; ipa: boolean; word_type: boolean; vi_meaning: boolean };
  setFrontConfig: (config: any) => void;
}

export function EnglishFlashcardModals({
  isLessonModalOpen,
  setIsLessonModalOpen,
  availableLessons,
  selectedLessons,
  setSelectedLessons,
  isDisplayModalOpen,
  setIsDisplayModalOpen,
  frontConfig,
  setFrontConfig,
}: ModalsProps) {
  const toggleLessonSelect = (lessonNum: number) => {
    if (selectedLessons.includes(lessonNum)) {
      setSelectedLessons(selectedLessons.filter((l) => l !== lessonNum));
    } else {
      setSelectedLessons([...selectedLessons, lessonNum]);
    }
  };

  return (
    <>
      {/* Modal 1: Chọn Bài Học Tiếng Anh CEFR */}
      <AnimatePresence>
        {isLessonModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLessonModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-5 shadow-2xl max-w-md mx-auto border-t border-slate-100 flex flex-col max-h-[75vh]"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-base font-black text-slate-800">🇬🇧 Chọn Bài Học Tiếng Anh</h3>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedLessons(availableLessons)} className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer">
                    Chọn hết
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedLessons([])} className="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer">
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5 overflow-y-auto p-1 my-2 flex-grow no-scrollbar">
                {availableLessons.map((num) => {
                  const isSelected = selectedLessons.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => toggleLessonSelect(num)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Bài {num}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="w-full mt-3 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all flex-shrink-0 cursor-pointer"
              >
                Xác nhận ({selectedLessons.length} bài)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal 2: Cấu hình mặt trước Thẻ */}
      <AnimatePresence>
        {isDisplayModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDisplayModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-5 shadow-2xl max-w-md mx-auto border-t border-slate-100 flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <h3 className="text-base font-black text-slate-800 mb-1">⚙️ Tùy Chỉnh Mặt Trước Thẻ</h3>
              <p className="text-xs text-slate-400 font-medium mb-4">Tích chọn thông tin hiển thị mặt trước:</p>

              <div className="space-y-2.5 mb-6">
                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🔤</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Từ vựng (Word)</p>
                      <p className="text-[10px] text-slate-400">Hiển thị từ tiếng Anh gốc</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.word}
                    onChange={(e) => setFrontConfig({ ...frontConfig, word: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🗣️</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Phiên âm IPA</p>
                      <p className="text-[10px] text-slate-400">Hiển thị phiên âm chuẩn IPA</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.ipa}
                    onChange={(e) => setFrontConfig({ ...frontConfig, ipa: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Loại từ</p>
                      <p className="text-[10px] text-slate-400">Hiển thị loại từ (n., v., adj., ...)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.word_type}
                    onChange={(e) => setFrontConfig({ ...frontConfig, word_type: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🇻🇳</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Nghĩa tiếng Việt</p>
                      <p className="text-[10px] text-slate-400">Hiển thị bản dịch nghĩa tiếng Việt</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.vi_meaning}
                    onChange={(e) => setFrontConfig({ ...frontConfig, vi_meaning: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </label>
              </div>

              <button
                onClick={() => setIsDisplayModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
              >
                Lưu cấu hình
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
