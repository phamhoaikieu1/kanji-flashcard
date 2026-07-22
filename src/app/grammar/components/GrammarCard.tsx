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
  onNext: () => void;
  onPrev: () => void;
  onToggleMemorize: (id: string) => void;
  onToggleSave: (id: string) => void;
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
  onNext,
  onPrev,
  onToggleMemorize,
  onToggleSave,
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
            📭 Không tìm thấy ngữ pháp nào khớp với bộ lọc/bài học đã chọn (hoặc chưa có mẫu ngữ pháp nào được lưu).
          </p>
        </div>
      </div>
    );
  }

  const isMemorized = memorizedIds.includes(currentCard?.card_id);
  const isSaved = savedIds.includes(currentCard?.card_id);

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
          className="w-full h-full bg-white rounded-3xl shadow-lg border border-slate-100 flex flex-col justify-between p-4 cursor-grab active:cursor-grabbing relative overflow-hidden touch-none"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {!isFlipped ? (
            /* ---------------- MẶT TRƯỚC ---------------- */
            <div className="flex flex-col items-center justify-between h-full w-full relative select-none">
              <div className="w-full flex items-center justify-start flex-shrink-0">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Bài {currentCard?.lesson}
                </span>
              </div>

              <div className="my-auto text-center px-2 flex flex-col items-center justify-center flex-grow space-y-3 w-full">
                {frontConfig?.grammar_point && (
                  <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700 tracking-wide leading-snug">
                    {currentCard?.grammar_point}
                  </h1>
                )}
                {frontConfig?.structure && currentCard?.structure && (
                  <div className="w-full max-w-[95%] bg-indigo-50/60 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-900 font-mono whitespace-pre-line leading-relaxed">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase block mb-0.5">🧩 Cấu Trúc Kết Hợp</span>
                    {currentCard?.structure}
                  </div>
                )}
                {!frontConfig?.grammar_point && !frontConfig?.structure && (
                  <p className="text-xs font-bold text-rose-400 italic">⚠️ Chưa chọn hiển thị ở mặt trước!</p>
                )}
              </div>

              <CardFooter
                isMemorized={isMemorized}
                isSaved={isSaved}
                cardId={currentCard?.card_id}
                onToggleMemorize={onToggleMemorize}
                onToggleSave={onToggleSave}
              />
            </div>
          ) : (
            /* ---------------- MẶT SAU ---------------- */
            <div className="flex flex-col justify-between h-full w-full text-left select-none">
              <div className="w-full space-y-2.5 overflow-y-auto pr-1 flex-grow no-scrollbar">
                <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mẫu Ngữ Pháp</span>
                    <p className="text-xl font-black text-indigo-700">{currentCard?.grammar_point}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                    Bài {currentCard?.lesson}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">📌 Nghĩa Tiếng Việt</span>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{currentCard?.vi_meaning}</p>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">🧩 Công Thức Kết Hợp</span>
                  <p className="text-xs text-indigo-950 font-mono bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 whitespace-pre-line font-medium">
                    {currentCard?.structure}
                  </p>
                </div>

                {currentCard?.example_ja && (
                  <div className="pt-1 border-t border-slate-100 w-full">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">📝 Ví dụ minh họa</span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed bg-amber-50/40 p-2 rounded-lg border border-amber-100/60">
                      {currentCard?.example_ja}
                    </p>
                    {currentCard?.example_vi && (
                      <p className="text-[10px] text-slate-500 mt-0.5 italic leading-snug px-1">
                        ↳ {currentCard?.example_vi}
                      </p>
                    )}
                  </div>
                )}

                {currentCard?.usage_note && currentCard?.usage_note !== 'EMPTY' && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                    <span className="font-bold text-slate-900">💡 Lưu ý cách dùng: </span>
                    {currentCard?.usage_note}
                  </div>
                )}
              </div>

              <CardFooter
                isMemorized={isMemorized}
                isSaved={isSaved}
                cardId={currentCard?.card_id}
                onToggleMemorize={onToggleMemorize}
                onToggleSave={onToggleSave}
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
  onToggleMemorize,
  onToggleSave,
}: {
  isMemorized: boolean;
  isSaved: boolean;
  cardId: string;
  onToggleMemorize: (id: string) => void;
  onToggleSave: (id: string) => void;
}) {
  return (
    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 flex-shrink-0 mt-1">
      <div className="text-[9px] text-slate-400 font-medium leading-tight text-left space-y-0.5">
        <p>💡 Chạm để lật mặt thẻ</p>
        <p>👈 Vuốt trái: Thẻ tiếp theo</p>
        <p>👉 Vuốt phải: Thẻ trước đó</p>
      </div>

      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Nút Đã Lưu (Ngôi sao vàng) */}
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

        {/* Nút Đã thuộc */}
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