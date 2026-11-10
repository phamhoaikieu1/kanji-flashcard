interface ButtonsProps {
  onOpenVocab: () => void;
  onOpenGrammar: () => void;
  onOpenHsk: () => void;
  onOpenBasicChinese: () => void;
  onOpenTraditionalChinese: () => void;
  onOpenEnglish: () => void;
}

export function LearningButtons({
  onOpenVocab,
  onOpenGrammar,
  onOpenHsk,
  onOpenBasicChinese,
  onOpenTraditionalChinese,
  onOpenEnglish,
}: ButtonsProps) {
  return (
    <>
      {/* 📚 NÚT TỪ VỰNG TIẾNG NHẬT */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenVocab}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">📚</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Từ Vựng Nhiều Cấp Độ</p>
              <p className="text-[10px] text-slate-300 font-medium">Bấm để chọn cấp độ từ N5 đến N1</p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>

      {/* 📖 NÚT NGỮ PHÁP TIẾNG NHẬT */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenGrammar}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">📖</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Ngữ Pháp Nhiều Cấp Độ</p>
              <p className="text-[10px] text-indigo-100 font-medium">Bấm để chọn cấp độ từ N5 đến N1</p>
            </div>
          </div>
          <span className="text-indigo-200 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>

      {/* 🏮 NÚT TIẾNG TRUNG CƠ BẢN (CB1 - CB6) */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenBasicChinese}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">🏮</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Tiếng Trung Cơ Bản</p>
              <p className="text-[10px] text-emerald-100 font-medium">Bấm để chọn cấp độ từ CB1 đến CB6</p>
            </div>
          </div>
          <span className="text-emerald-200 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>

      {/* 🇨🇳 NÚT TIẾNG TRUNG HSK */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenHsk}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">🇨🇳</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Tiếng Trung Nâng Cao</p>
              <p className="text-[10px] text-rose-100 font-medium">Bấm để chọn cấp độ từ HSK1 đến HSK6</p>
            </div>
          </div>
          <span className="text-rose-200 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>

      {/* ⛩️ NÚT TIẾNG TRUNG PHỒN THỂ (A1 - C2) */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenTraditionalChinese}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">⛩️</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Tiếng Trung Phồn Thể</p>
              <p className="text-[10px] text-amber-100 font-medium">Bấm để chọn cấp độ từ A1 đến C2</p>
            </div>
          </div>
          <span className="text-amber-200 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>

      {/* 🇬🇧 NÚT TIẾNG ANH CEFR (A1 - C2) */}
      <div className="w-full flex-shrink-0">
        <button
          onClick={onOpenEnglish}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3.5 px-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">🇬🇧</span>
            <div className="text-left">
              <p className="text-xs font-extrabold">Học Tiếng Anh CEFR</p>
              <p className="text-[10px] text-sky-100 font-medium">Bấm để chọn cấp độ từ A1 đến C2</p>
            </div>
          </div>
          <span className="text-sky-200 group-hover:translate-x-1 transition-transform font-bold text-sm">→</span>
        </button>
      </div>
    </>
  );
}