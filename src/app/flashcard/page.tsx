'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

function decodeUnicodeString(str: string): string {
  if (!str) return '';
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

function FlashcardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLevel = searchParams.get('level') || 'N1';

  const [allCards, setAllCards] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [leaveDirection, setLeaveDirection] = useState<'left' | 'right' | null>(null);
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);

  // Bộ lọc trạng thái & Bài học
  const [filterMode, setFilterMode] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [availableLessons, setAvailableLessons] = useState<number[]>([]);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // 🎛️ BỘ TÙY CHỈNH HIỂN THỊ MẶT TRƯỚC
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [frontConfig, setFrontConfig] = useState({
    kanji: true,
    ja_writing: false,
    vi_meaning: false
  });

  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerInlineAlert = (type: 'success' | 'error', message: string) => {
    setInlineAlert({ type, message });
    setTimeout(() => setInlineAlert(null), 2500);
  };

  useEffect(() => {
    toast.dismiss();

    const fetchCardsAndProgress = async () => {
      setLoadingData(true);
      
      let allFetchedCards: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('level', selectedLevel)
          .order('card_id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Lỗi khi tải dữ liệu thẻ:', error.message);
          break;
        }

        if (chunk && chunk.length > 0) {
          allFetchedCards = [...allFetchedCards, ...chunk];
          if (chunk.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allFetchedCards.length > 0) {
        setAllCards(allFetchedCards);
        
        const lessons = Array.from(new Set(allFetchedCards.map((c: any) => c.lesson)))
          .sort((a: any, b: any) => a - b) as number[];
        
        setAvailableLessons(lessons);
        setSelectedLessons(lessons);

        triggerInlineAlert('success', `🎯 Trình độ ${selectedLevel}: Đã nạp ${allFetchedCards.length} thẻ!`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progress } = await supabase
          .from('user_memorized_cards')
          .select('card_id')
          .eq('user_id', user.id);
        
        if (progress) {
          setMemorizedIds(progress.map((item: any) => item.card_id));
        }
      }
      
      setLoadingData(false);
    };

    fetchCardsAndProgress();
  }, [selectedLevel]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filterMode, selectedLessons, isRandom]);

  if (loadingData) {
    return (
      <div className="text-center">
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ kho từ vựng...</p>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu từ vựng cho cấp độ {selectedLevel}.</p>
        <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          Quay lại chọn cấp độ khác
        </button>
      </div>
    );
  }

  const displayCards = allCards.filter(card => {
    const isLessonMatch = selectedLessons.length === 0 || selectedLessons.includes(card.lesson);
    const isLearned = memorizedIds.includes(card.card_id);

    if (!isLessonMatch) return false;
    if (filterMode === 'learned') return isLearned;
    if (filterMode === 'unlearned') return !isLearned;
    return true;
  });

  const currentCard = displayCards[currentIndex];

  // 🔄 ĐIỀU HƯỚNG TỪ TỚI
  const handleNextCard = () => {
    setIsFlipped(false);
    setLeaveDirection('left');

    setTimeout(() => {
      setLeaveDirection(null);
      if (displayCards.length <= 1) {
        setCurrentIndex(0);
        return;
      }

      if (isRandom) {
        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * displayCards.length);
        }
        setCurrentIndex(nextIndex);
      } else {
        if (currentIndex < displayCards.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      }
    }, 200);
  };

  // 🔄 ĐIỀU HƯỚNG TỪ TRƯỚC
  const handlePrevCard = () => {
    if (currentIndex === 0) return;
    setIsFlipped(false);
    setLeaveDirection('right');

    setTimeout(() => {
      setLeaveDirection(null);
      setCurrentIndex(currentIndex - 1);
    }, 200);
  };

  // 👈👉 SWIPE LOGIC
  const handleDragEnd = (event: any, info: any) => {
    if (displayCards.length === 0) return;
    const swipeThreshold = 70;

    if (info.offset.x < -swipeThreshold) {
      handleNextCard();
    } else if (info.offset.x > swipeThreshold) {
      if (currentIndex > 0) {
        handlePrevCard();
      }
    }
  };

  const handleToggleMemorize = async (cardId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      triggerInlineAlert('error', 'Vui lòng đăng nhập!');
      return;
    }

    const isAlreadyMemorized = memorizedIds.includes(cardId);

    if (isAlreadyMemorized) {
      const { error } = await supabase
        .from('user_memorized_cards')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);

      if (error) {
        triggerInlineAlert('error', `Lỗi: ${error.message}`);
      } else {
        setMemorizedIds(prev => prev.filter(id => id !== cardId));
        triggerInlineAlert('success', 'Đã bỏ đánh dấu thuộc.');
        if (filterMode === 'learned') handleNextCard();
      }
    } else {
      const { error } = await supabase
        .from('user_memorized_cards')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) {
        triggerInlineAlert('error', `Lỗi: ${error.message}`);
      } else {
        setMemorizedIds(prev => [...prev, cardId]);
        triggerInlineAlert('success', '🎉 Đã thuộc từ này!');
        if (filterMode === 'unlearned') handleNextCard();
      }
    }
  };

  const toggleLessonSelect = (lessonNum: number) => {
    if (selectedLessons.includes(lessonNum)) {
      setSelectedLessons(prev => prev.filter(l => l !== lessonNum));
    } else {
      setSelectedLessons(prev => [...prev, lessonNum]);
    }
  };

  return (
    <div className="w-full max-w-md h-[100dvh] flex flex-col justify-between py-2 px-3 relative overflow-hidden overscroll-none select-none">
      
      {/* 🔝 TẦNG 1: Header */}
      <div className="w-full flex flex-col items-center flex-shrink-0 relative">
        <button 
          onClick={() => router.push('/dashboard')}
          className="absolute top-0 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3.5 py-1 rounded-full shadow-sm border border-slate-100 mt-5 z-20">
          TRÌNH ĐỘ {selectedLevel} • THẺ {displayCards.length > 0 ? currentIndex + 1 : 0} / {displayCards.length}
        </div>
      </div>

      {/* ✉️ TẦNG 2: Thông báo nội bộ */}
      <div className="w-full h-7 flex items-center justify-center flex-shrink-0 my-0.5 overflow-hidden">
        <AnimatePresence mode="wait">
          {inlineAlert && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`w-full max-w-[95%] flex items-center space-x-1.5 px-3 py-1 rounded-xl border shadow-sm text-[11px] font-bold justify-center ${
                inlineAlert.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <span>{inlineAlert.type === 'success' ? '✔' : '❌'}</span>
              <span>{inlineAlert.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🎯 TẦNG 3: Khối Thẻ Bài TỰ ĐỘNG THU GỌN VỪA KHUNG */}
      <div className="w-full flex-shrink-0">
        <div className="w-full h-[360px] md:h-[390px] relative perspective-1000">
          {displayCards.length === 0 ? (
            <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                📭 Không tìm thấy thẻ vựng nào khớp với bộ lọc/bài học đã chọn.
              </p>
            </div>
          ) : (
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
                  transition: { duration: 0.2 }
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
                        Bài {currentCard.lesson}
                      </span>
                    </div>

                    <div className="my-auto text-center px-2 flex flex-col items-center justify-center flex-grow space-y-2">
                      {frontConfig.kanji && (
                        <h1 className="text-5xl md:text-6xl font-bold text-slate-800 font-serif leading-tight">
                          {currentCard.kanji}
                        </h1>
                      )}

                      {frontConfig.ja_writing && (
                        <p className="text-base font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-xl border border-emerald-100 font-mono">
                          {decodeUnicodeString(currentCard.ja_writing)}
                        </p>
                      )}

                      {frontConfig.vi_meaning && (
                        <p className="text-sm font-extrabold text-sky-600">
                          {currentCard.vi_meaning}
                        </p>
                      )}

                      {!frontConfig.kanji && !frontConfig.ja_writing && !frontConfig.vi_meaning && (
                        <p className="text-xs font-bold text-rose-400 italic">⚠️ Chưa chọn hiển thị ở mặt trước!</p>
                      )}
                    </div>

                    {/* FOOTER MẶT TRƯỚC: TIP 3 DÒNG + CHECKBOX */}
                    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 flex-shrink-0">
                      <div className="text-[9px] text-slate-400 font-medium leading-tight text-left space-y-0.5">
                        <p>💡 Chạm để lật mặt thẻ</p>
                        <p>👈 Vuốt trái: Từ tiếp theo</p>
                        <p>👉 Vuốt phải: Từ trước đó</p>
                      </div>

                      <label 
                        className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer select-none active:scale-95 transition-transform flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={memorizedIds.includes(currentCard.card_id)}
                          onChange={() => handleToggleMemorize(currentCard.card_id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-600">Đã thuộc</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* ---------------- MẶT SAU ---------------- */
                  <div className="flex flex-col justify-between h-full w-full text-left select-none">
                    
                    <div className="w-full space-y-2 overflow-y-auto pr-1 flex-grow no-scrollbar">
                      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Từ vựng Kanji</span>
                          <p className="text-xl font-black text-slate-800 font-serif">{currentCard.kanji}</p>
                        </div>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                          Bài {currentCard.lesson}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Âm Hán Việt</span>
                        <p className="text-sm font-extrabold text-slate-800">{currentCard.han_viet || '---'}</p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block mb-0.5">Cách đọc Hiragana</span>
                        <p className="text-xs text-slate-700 font-mono bg-emerald-50/70 px-2 py-0.5 rounded-md border border-emerald-100 inline-block font-semibold">
                          {decodeUnicodeString(currentCard.ja_writing)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-sky-500 uppercase tracking-wider block">Nghĩa tiếng Việt</span>
                        <p className="text-xs text-slate-800 font-bold leading-snug">{currentCard.vi_meaning}</p>
                      </div>

                      {currentCard.example_ja && (
                        <div className="pt-1 border-t border-slate-100 w-full">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">Ví dụ</span>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed bg-indigo-50/40 p-1.5 rounded-lg border border-indigo-100/60">
                            {currentCard.example_ja}
                          </p>
                          {currentCard.example_vi && (
                            <p className="text-[10px] text-slate-500 mt-0.5 italic leading-snug px-1">
                              ↳ {currentCard.example_vi}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* FOOTER MẶT SAU: TIP 3 DÒNG + CHECKBOX (CÓ TIP NHƯ MẶT TRƯỚC) */}
                    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 flex-shrink-0 mt-1">
                      <div className="text-[9px] text-slate-400 font-medium leading-tight text-left space-y-0.5">
                        <p>💡 Chạm để lật mặt thẻ</p>
                        <p>👈 Vuốt trái: Từ tiếp theo</p>
                        <p>👉 Vuốt phải: Từ trước đó</p>
                      </div>

                      <label 
                        className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer select-none active:scale-95 transition-transform flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={memorizedIds.includes(currentCard.card_id)}
                          onChange={() => handleToggleMemorize(currentCard.card_id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-600">Đã thuộc</span>
                      </label>
                    </div>

                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* 🎛️ TẦNG 4: KHỐI BỘ LỌC VÀ CỤM NÚT ĐIỀU HƯỚNG */}
      <div className="w-full space-y-2 flex-shrink-0 my-1">
        <div className="w-full bg-white p-2.5 rounded-2xl border border-slate-200/60 shadow-sm space-y-1.5">
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsLessonModalOpen(true)}
              className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-between transition-colors truncate"
            >
              <span className="truncate">📚 {selectedLessons.length === availableLessons.length ? 'Tất cả bài' : `${selectedLessons.length} bài`}</span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </button>

            <button
              onClick={() => setIsDisplayModalOpen(true)}
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
          </div>
        </div>

        {/* CỤM 2 NÚT ĐIỀU HƯỚNG */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            disabled={displayCards.length === 0 || currentIndex === 0}
            onClick={handlePrevCard}
            className="col-span-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-slate-50 text-xs tracking-wide disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-100 disabled:cursor-not-allowed"
          >
            ← Từ trước
          </button>

          <button
            disabled={displayCards.length === 0}
            onClick={handleNextCard}
            className="col-span-2 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-slate-800 text-xs tracking-wide disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            Từ tiếp theo →
          </button>
        </div>
      </div>

      {/* 📜 Bottom Sheet 1: Chọn Bài */}
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
                <h3 className="text-base font-black text-slate-800">📚 Chọn Bài Học (Lesson)</h3>
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

      {/* ⚙️ Bottom Sheet 2: Cấu hình hiển thị Mặt Trước */}
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
              
              <h3 className="text-base font-black text-slate-800 mb-1">⚙️ Tùy Chỉnh Mặt Trước Thẻ</h3>
              <p className="text-xs text-slate-400 font-medium mb-4">Tích chọn các thành phần bạn muốn xem ở mặt trước:</p>

              <div className="space-y-3 mb-6">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🈁</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Chữ Kanji</p>
                      <p className="text-[10px] text-slate-400">Hiển thị chữ Kanji gốc (Mặc định)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.kanji}
                    onChange={(e) => setFrontConfig({ ...frontConfig, kanji: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">あ</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Cách đọc Hiragana</p>
                      <p className="text-[10px] text-slate-400">Hiển thị phiên âm Hiragana</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={frontConfig.ja_writing}
                    onChange={(e) => setFrontConfig({ ...frontConfig, ja_writing: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer active:scale-[0.99] transition-all">
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

      {/* 📜 TẦNG 5: Chân trang tri ân Sensei Trang Dang */}
      <div className="w-full text-center flex flex-col items-center justify-center space-y-0.5 select-none pointer-events-none flex-shrink-0 pt-1 pb-0.5">
        <p className="text-[9px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[8px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>

    </div>
  );
}

export default function FlashcardPage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-2 font-sans select-none overflow-hidden overscroll-none">
      <Suspense fallback={<p className="text-slate-500 font-medium">Đang tải kho thẻ bài...</p>}>
        <FlashcardContent />
      </Suspense>
    </main>
  );
}