import { motion, AnimatePresence } from 'framer-motion';

interface ModalsProps {
  isLessonModalOpen: boolean;
  setIsLessonModalOpen: (open: boolean) => void;
  availableLessons: number[];
  selectedLessons: number[];
  setSelectedLessons: (lessons: number[]) => void;
  isDisplayModalOpen: boolean;
  setIsDisplayModalOpen: (open: boolean) => void;
  frontConfig: { grammar_point: boolean; structure: boolean };
  setFrontConfig: (config: any) => void;
}

export function GrammarModals({
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
      {/* Modal 1: Chọn Bài Học Ngữ Pháp */}
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
                <h3 className="text-base font-black text-slate-800">📖 Chọn Bài Ngữ Pháp</h3>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedLessons(availableLessons)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                    Chọn hết
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedLessons([])} className="text-[11px] font-bold text-rose-500 hover:underline">
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5 overflow-y-auto p-1 my-2 flex-grow">
                {availableLessons.map((num) => {
                  const isSelected = selectedLessons.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => toggleLessonSelect(num)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
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
                className="w-full mt-3 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all flex-shrink-0"
              >
                Xác nhận ({selectedLessons.length} bài)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal 2: Cấu hình hiển thị mặt trước */}
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
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-5 shadow-2xl max-w-md mx-auto border-t border-slate-100 flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 flex-shrink-0" />
              <h3 className="text-base font-black text-slate-800 mb-1">⚙️ Tùy Chỉnh Mặt Trước Thẻ Ngữ Pháp</h3>
              <p className="text-xs text-slate-400 font-medium mb-4">Tích chọn các thành phần bạn muốn xem ở mặt trước:</p>

              <div className="space-y-3 mb-6">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🏮</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Mẫu Ngữ Pháp</p>
                      <p className="text-[10px] text-slate-400">Hiển thị mẫu ngữ pháp chính (Mặc định)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.grammar_point}
                    onChange={(e) => setFrontConfig({ ...frontConfig, grammar_point: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🧩</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Cấu Trúc Kết Hợp</p>
                      <p className="text-[10px] text-slate-400">Hiển thị công thức kết hợp ngay ở mặt trước</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.structure}
                    onChange={(e) => setFrontConfig({ ...frontConfig, structure: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              <button
                onClick={() => setIsDisplayModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all"
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