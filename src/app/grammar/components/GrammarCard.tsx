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

export function GrammarCard({
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
            📭 Không tìm thấy mẫu ngữ pháp nào khớp với bộ lọc/bài học đã chọn.
          </p>
        </div>
      </div>
    );
  }

  const isMemorized = memorizedIds.includes(currentCard?.card_id);
  const isSaved = savedIds.includes(currentCard?.card_id);

  const grammarPoint = currentCard?.grammar_point || '';
  const structureText = (currentCard?.structure && currentCard.structure !== 'EMPTY') ? currentCard.structure : '';
  const meaningText = (currentCard?.vi_meaning && currentCard.vi_meaning !== 'EMPTY') ? currentCard.vi_meaning : '';
  const exampleJa = (currentCard?.example_ja && currentCard.example_ja !== 'EMPTY') ? currentCard.example_ja : '';
  const exampleVi = (currentCard?.example_vi && currentCard.example_vi !== 'EMPTY') ? currentCard.example_vi : '';
  const usageNote = (currentCard?.usage_note && currentCard.usage_note !== 'EMPTY') ? currentCard.usage_note : '';

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
          className="w-full h-full bg-white rounded-3xl shadow-lg border border-indigo-100/80 flex flex-col justify-between p-4 cursor-grab active:cursor-grabbing relative overflow-hidden touch-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {!isFlipped ? (
            /* ---------------- MẶT TRƯỚC ---------------- */
            <div className="flex flex-col items-center justify-between h-full w-full relative select-none">
              <div className="w-full flex items-center justify-start flex-shrink-0">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Bài {currentCard?.lesson || 1}
                </span>
              </div>

              <div className="my-auto text-center px-2 flex flex-col items-center justify-center flex-grow space-y-3 w-full">
                {frontConfig?.grammar_point && grammarPoint && (
                  <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700 tracking-wide leading-snug font-serif">
                    {grammarPoint}
                  </h1>
                )}
                {frontConfig?.structure && structureText && (
                  <div className="w-full max-w-[95%] bg-indigo-50/60 border border-indigo-100 rounded-2xl p-2.5 text-xs text-indigo-950 font-mono whitespace-pre-line leading-relaxed">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase block mb-0.5 tracking-wider">Cấu Trúc Kết Hợp</span>
                    {structureText}
                  </div>
                )}
                {!frontConfig?.grammar_point && !frontConfig?.structure && (
                  <p className="text-xs font-bold text-rose-400 italic">⚠️ Chưa chọn thành phần hiển thị ở mặt trước!</p>
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
            /* ---------------- MẶT SAU ---------------- */
            <div className="flex flex-col justify-between h-full w-full text-left select-none">
              <div className="w-full space-y-2.5 overflow-y-auto pr-1 flex-grow no-scrollbar">
                <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mẫu Ngữ Pháp</span>
                    <p className="text-xl font-black text-indigo-700 font-serif">{grammarPoint}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md">
                    Bài {currentCard?.lesson || 1}
                  </span>
                </div>

                {meaningText && (
                  <div>
                    <span className="text-[9px] font-bold text-sky-500 uppercase tracking-wider block">Nghĩa Tiếng Việt</span>
                    <p className="text-xs font-bold text-slate-800 leading-snug">{meaningText}</p>
                  </div>
                )}

                {structureText && (
                  <div>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">Cấu Trúc Kết Hợp</span>
                    <p className="text-xs text-indigo-950 font-mono bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 whitespace-pre-line font-medium leading-relaxed">
                      {structureText}
                    </p>
                  </div>
                )}

                {exampleJa && (
                  <div className="pt-1.5 border-t border-slate-100 w-full">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Ví Dụ Minh Họa</span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed bg-amber-50/40 p-2 rounded-xl border border-amber-100/60 font-serif">
                      {exampleJa}
                    </p>
                    {exampleVi && (
                      <p className="text-[10px] text-slate-500 mt-0.5 italic leading-snug px-1">
                        ↳ {exampleVi}
                      </p>
                    )}
                  </div>
                )}

                {usageNote && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-0.5 text-[10px] uppercase tracking-wider">Lưu Ý Cách Dùng</span>
                    {usageNote}
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
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-600">Đã thuộc</span>
        </label>
      </div>
    </div>
  );
}