interface ControlsProps {
  selectedLessonsCount: number;
  availableLessonsCount: number;
  filterMode: 'all' | 'learned' | 'unlearned' | 'saved';
  setFilterMode: (mode: 'all' | 'learned' | 'unlearned' | 'saved') => void;
  isRandom: boolean;
  setIsRandom: (val: boolean) => void;
  currentIndex: number;
  displayCardsLength: number;
  onOpenLessonModal: () => void;
  onOpenDisplayModal: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function FlashcardControls({
  selectedLessonsCount,
  availableLessonsCount,
  filterMode,
  setFilterMode,
  isRandom,
  setIsRandom,
  currentIndex,
  displayCardsLength,
  onOpenLessonModal,
  onOpenDisplayModal,
  onPrev,
  onNext,
}: ControlsProps) {
  return (
    <div className="w-full space-y-2 flex-shrink-0 my-1">
      <div className="w-full bg-white p-2.5 rounded-2xl border border-slate-200/60 shadow-sm space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenLessonModal}
            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-between transition-colors truncate"
          >
            <span className="truncate">
              📚 {selectedLessonsCount === availableLessonsCount ? 'Tất cả bài' : `${selectedLessonsCount} bài`}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          <button
            onClick={onOpenDisplayModal}
            className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-between transition-colors truncate border border-indigo-100"
          >
            <span className="truncate">⚙️ Mặt trước</span>
            <span className="text-indigo-400 text-[10px]">▼</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <label className="flex items-center space-x-2 cursor-pointer select-none p-0.5">
            <input
              type="radio"
              name="appFilter"
              checked={filterMode === 'all'}
              onChange={() => setFilterMode('all')}
              className="w-3.5 h-3.5 text-slate-900 focus:ring-slate-800 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">🌐 Tất cả</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none p-0.5 border-l border-slate-100 pl-2">
            <input
              type="checkbox"
              checked={isRandom}
              onChange={(e) => setIsRandom(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">🎲 Ngẫu nhiên</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none p-0.5">
            <input
              type="radio"
              name="appFilter"
              checked={filterMode === 'learned'}
              onChange={() => setFilterMode('learned')}
              className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">✅ Đã thuộc</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none p-0.5 border-l border-slate-100 pl-2">
            <input
              type="radio"
              name="appFilter"
              checked={filterMode === 'unlearned'}
              onChange={() => setFilterMode('unlearned')}
              className="w-3.5 h-3.5 text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">❌ Chưa thuộc</span>
          </label>

          {/* ⭐ Nút lọc từ đã lưu */}
          <label className="flex items-center space-x-2 cursor-pointer select-none p-0.5 col-span-2 border-t border-slate-100 pt-1">
            <input
              type="radio"
              name="appFilter"
              checked={filterMode === 'saved'}
              onChange={() => setFilterMode('saved')}
              className="w-3.5 h-3.5 text-amber-500 focus:ring-amber-400 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-amber-600">⭐ Danh sách đã lưu (Từ quan trọng)</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        <button
          disabled={displayCardsLength === 0 || currentIndex === 0}
          onClick={onPrev}
          className="col-span-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-slate-50 text-xs tracking-wide disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-100 disabled:cursor-not-allowed"
        >
          ← Từ trước
        </button>

        <button
          disabled={displayCardsLength === 0}
          onClick={onNext}
          className="col-span-2 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-slate-800 text-xs tracking-wide disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          Từ tiếp theo →
        </button>
      </div>
    </div>
  );
}