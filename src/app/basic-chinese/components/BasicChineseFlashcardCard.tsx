import { motion, AnimatePresence } from 'framer-motion';

interface CardProps {
  displayCards: any[];
  currentCard: any;
  currentIndex: number;
  isFlipped: boolean;
  setIsFlipped: (val: boolean) => void;
  leaveDirection: 'left' | 'right' | null;
  memorizedIds: string[];
  savedIds: string[];
  frontConfig: any;
  isAdminOrOwner?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onToggleMemorize: (id: string) => void;
  onToggleSave: (id: string) => void;
  onOpenReportModal: () => void;
  onOpenEditModal: () => void;
}

export function BasicChineseFlashcardCard({
  displayCards,
  currentCard,
  currentIndex,
  isFlipped,
  setIsFlipped,
  leaveDirection,
  memorizedIds,
  savedIds,
  frontConfig,
  isAdminOrOwner = false,
  onNext,
  onPrev,
  onToggleMemorize,
  onToggleSave,
  onOpenReportModal,
  onOpenEditModal,
}: CardProps) {
  const handleDragEnd = (_: any, info: any) => {
    if (displayCards.length === 0) return;
    const swipeThreshold = 70;
    if (info.offset.x < -swipeThreshold) onNext();
    else if (info.offset.x > swipeThreshold && currentIndex > 0) onPrev();
  };

  if (displayCards.length === 0 || !currentCard) {
    return (
      <div className="w-full h-[360px] md:h-[390px] relative">
        <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-bold text-slate-400 leading-relaxed">
            📭 Không tìm thấy từ Tiếng Trung Cơ Bản nào khớp với bộ lọc/bài học đã chọn.
          </p>
        </div>
      </div>
    );
  }

  const isMemorized = memorizedIds.includes(currentCard?.card_id);
  const isSaved = savedIds.includes(currentCard?.card_id);

  const hanziText = currentCard?.hanzi || '';
  const pinyinText = currentCard?.pinyin || '';
  const hanVietText = (currentCard?.han_viet && currentCard.han_viet !== 'EMPTY') ? currentCard.han_viet : '';
  const wordTypeText = (currentCard?.word_type && currentCard.word_type !== 'EMPTY') ? currentCard.word_type : '';
  const exampleZh = (currentCard?.example_zh && currentCard.example_zh !== 'EMPTY') ? currentCard.example_zh : '';
  const exampleVi = (currentCard?.example_vi && currentCard.example_vi !== 'EMPTY') ? currentCard.example_vi : '';

  return (
    <div className="w-full h-[360px] md:h-[390px] relative perspective-1000">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{
            x: leaveDirection === 'left' ? -300 : leaveDirection === 'right' ? 300 : 0,
            opacity: 0,
            rotate: leaveDirection === 'left' ? -15 : leaveDirection === 'right' ? 15 : 0,
            transition: { duration: 0.2 },
          }}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full bg-white rounded-3xl shadow-lg border border-emerald-100 flex flex-col justify-between p-4 cursor-grab active:cursor-grabbing relative overflow-hidden touch-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {!isFlipped ? (
            /* ---------------- MẶT TRƯỚC ---------------- */
            <div className="flex flex-col items-center justify-between h-full w-full relative select-none">
              <div className="w-full flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Bài {currentCard?.lesson || 1}
                </span>
                {wordTypeText && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    Type: {wordTypeText}
                  </span>
                )}
              </div>

              <div className="my-auto text-center px-2 flex flex-col items-center justify-center flex-grow space-y-2">
                {frontConfig?.hanzi && hanziText && (
                  <h1 className="text-6xl md:text-7xl font-black text-slate-800 font-serif leading-tight">
                    {hanziText}
                  </h1>
                )}
                {frontConfig?.pinyin && pinyinText && (
                  <p className="text-base font-bold text-emerald-600 bg-emerald-50/80 px-3 py-0.5 rounded-xl border border-emerald-100 font-sans">
                    {pinyinText}
                  </p>
                )}
                {frontConfig?.han_viet && hanVietText && (
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">
                    [ Hán Việt: {hanVietText} ]
                  </p>
                )}
                {frontConfig?.vi_meaning && currentCard?.vi_meaning && (
                  <p className="text-sm font-extrabold text-sky-600">{currentCard?.vi_meaning}</p>
                )}
              </div>

              <CardFooter
                isMemorized={isMemorized}
                isSaved={isSaved}
                cardId={currentCard?.card_id}
                isAdminOrOwner={isAdminOrOwner}
                onToggleMemorize={onToggleMemorize}
                onToggleSave={onToggleSave}
                onOpenReportModal={onOpenReportModal}
                onOpenEditModal={onOpenEditModal}
              />
            </div>
          ) : (
            /* ---------------- MẶT SAU CHUẨN OPTIMIZED UI ---------------- */
            <div className="flex flex-col justify-between h-full w-full text-left select-none">
              <div className="w-full space-y-2 overflow-y-auto pr-1 flex-grow no-scrollbar">
                <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Chữ Hán (Hanzi)</span>
                    <p className="text-2xl font-black text-slate-800 font-serif">{hanziText}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Bài {currentCard?.lesson || 1}
                    </span>
                    {wordTypeText && (
                      <span className="text-[9px] font-bold text-slate-400">
                        Type: {wordTypeText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Khối Pinyin & Hán Việt nằm cùng 1 hàng ngang tối ưu diện tích */}
                <div className="flex items-center gap-2">
                  {pinyinText && (
                    <div>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Pinyin</span>
                      <p className="text-xs text-emerald-800 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 inline-block font-bold">
                        {pinyinText}
                      </p>
                    </div>
                  )}
                  {hanVietText && (
                    <div>
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Hán Việt</span>
                      <p className="text-xs text-amber-800 font-sans bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100 inline-block font-bold">
                        {hanVietText}
                      </p>
                    </div>
                  )}
                </div>

                {currentCard?.vi_meaning && (
                  <div>
                    <span className="text-[9px] font-bold text-sky-500 uppercase tracking-wider block">Nghĩa tiếng Việt</span>
                    <p className="text-xs text-slate-800 font-bold leading-snug">{currentCard?.vi_meaning}</p>
                  </div>
                )}

                {/* Ẩn hoàn toàn nếu không có ví dụ */}
                {exampleZh && (
                  <div className="pt-1.5 border-t border-slate-100 w-full">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">Ví dụ minh họa</span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/60 font-serif">
                      {exampleZh}
                    </p>
                    {exampleVi && (
                      <p className="text-[10px] text-slate-500 mt-0.5 italic leading-snug px-1">
                        ↳ {exampleVi}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <CardFooter
                isMemorized={isMemorized}
                isSaved={isSaved}
                cardId={currentCard?.card_id}
                isAdminOrOwner={isAdminOrOwner}
                onToggleMemorize={onToggleMemorize}
                onToggleSave={onToggleSave}
                onOpenReportModal={onOpenReportModal}
                onOpenEditModal={onOpenEditModal}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CardFooter({
  isMemorized,
  isSaved,
  cardId,
  isAdminOrOwner = false,
  onToggleMemorize,
  onToggleSave,
  onOpenReportModal,
  onOpenEditModal,
}: {
  isMemorized: boolean;
  isSaved: boolean;
  cardId: string;
  isAdminOrOwner?: boolean;
  onToggleMemorize: (id: string) => void;
  onToggleSave: (id: string) => void;
  onOpenReportModal: () => void;
  onOpenEditModal: () => void;
}) {
  return (
    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 flex-shrink-0 mt-1">
      {/* NÚT BÁO LỖI & SỬA THẺ */}
      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenReportModal) onOpenReportModal();
          }}
          className="px-2 py-1 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 text-[11px] font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
          title="Báo cáo thẻ này bị sai"
        >
          🚨 Lỗi
        </button>

        {isAdminOrOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenEditModal) onOpenEditModal();
            }}
            className="px-2 py-1 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Chỉnh sửa thẻ này"
          >
            ✏️ Sửa
          </button>
        )}
      </div>

      {/* NÚT LƯU & THUỘC THẺ */}
      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
        <label
          className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl border cursor-pointer select-none active:scale-95 transition-all ${
            isSaved ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <input
            type="checkbox"
            checked={isSaved}
            onChange={() => cardId && onToggleSave(cardId)}
            className="hidden"
          />
          <span className="text-xs">{isSaved ? '⭐' : '☆'}</span>
          <span className="text-xs font-bold">{isSaved ? 'Đã lưu' : 'Lưu'}</span>
        </label>

        <label className="flex items-center space-x-1 bg-slate-100 px-2 py-1.5 rounded-xl border border-slate-200 cursor-pointer select-none active:scale-95 transition-transform">
          <input
            type="checkbox"
            checked={isMemorized}
            onChange={() => cardId && onToggleMemorize(cardId)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-600">Đã thuộc</span>
        </label>
      </div>
    </div>
  );
}