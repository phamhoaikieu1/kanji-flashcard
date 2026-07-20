'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Hàm tự động quét giải mã chuỗi Unicode thô thành ký tự hiển thị chuẩn chỉ (\u014d -> ō, \u01d0 -> ǔ)
function decodeUnicodeString(str: string): string {
  if (!str) return '';
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

function FlashcardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLevel = searchParams.get('level') || 'N5';

  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [leaveDirection, setLeaveDirection] = useState<'left' | 'right' | null>(null);
  const [memorizedIds, setMemorizedIds] = useState<number[]>([]);

  const [filterMode, setFilterMode] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Hàm kích hoạt thông báo nội bộ tự tắt sau 2.5 giây
  const triggerInlineAlert = (type: 'success' | 'error', message: string) => {
    setInlineAlert({ type, message });
    setTimeout(() => setInlineAlert(null), 2500);
  };

  useEffect(() => {
    // 🛑 CHỐNG LỖI VISUAL: Xóa ngay lập tức mọi thông báo trôi nổi từ Dashboard chuyển sang
    toast.dismiss();

    const fetchCardsAndProgress = async () => {
      setLoadingData(true);
      
      const { data: cards } = await supabase
        .from('kanji_cards')
        .select('*')
        .eq('level', selectedLevel)
        .order('id', { ascending: true });

      if (cards) {
        setFilteredData(cards);
        // 🌟 ĐỒNG BỘ THÔNG BÁO: Đưa thông báo chọn trình độ vào đúng tháp dòng chảy nội bộ
        setInlineAlert({ 
          type: 'success', 
          message: `🎯 Đã chọn trình độ ${selectedLevel}! Tiến vào kho thẻ bài.` 
        });
        setTimeout(() => setInlineAlert(null), 2500);
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
  }, [filterMode]);

  if (loadingData) {
    return (
      <div className="text-center">
        <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu từ Cloud Server...</p>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu Kanji cho cấp độ {selectedLevel}.</p>
        <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          Quay lại chọn cấp độ khác
        </button>
      </div>
    );
  }

  const displayCards = filteredData.filter(card => {
    const isLearned = memorizedIds.includes(card.id);
    if (filterMode === 'learned') return isLearned;
    if (filterMode === 'unlearned') return !isLearned;
    return true;
  });

  // Đã sửa xích lỗi dính phím displayDisplayCards từ lượt trước thành công
  const currentCard = displayCards[currentIndex];

  const changeCard = () => {
    setIsFlipped(false);
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
  };

  const handleDragEnd = (event: any, info: any) => {
    if (displayCards.length === 0) return;
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      setLeaveDirection('right');
      setTimeout(changeCard, 200);
    } else if (info.offset.x < -swipeThreshold) {
      setLeaveDirection('left');
      setTimeout(changeCard, 200);
    }
  };

  const handleToggleMemorize = async (cardId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      triggerInlineAlert('error', 'Vui lòng đăng nhập để lưu tiến trình!');
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
        triggerInlineAlert('success', 'Đã hủy đánh dấu thuộc từ này.');
        if (filterMode === 'learned') {
          setTimeout(changeCard, 200);
        }
      }
    } else {
      const { error } = await supabase
        .from('user_memorized_cards')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) {
        triggerInlineAlert('error', `Lỗi: ${error.message}`);
      } else {
        setMemorizedIds(prev => [...prev, cardId]);
        triggerInlineAlert('success', '🎉 Đã thuộc từ này! Bảng điểm đã tăng.');
        if (filterMode === 'unlearned') {
          setLeaveDirection('right');
          setTimeout(changeCard, 200);
        }
      }
    }
  };

  return (
    <div className="w-full max-w-md h-full flex flex-col pt-3 pb-2 px-3 relative justify-start">
      
      {/* 🔝 TẦNG 1: Header đầu trang */}
      <div className="w-full flex flex-col items-center pt-1 flex-shrink-0 relative min-h-[56px]">
        <button 
          onClick={() => router.push('/dashboard')}
          className="absolute top-1 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 mt-7 z-20">
          Trình độ {selectedLevel} • Thẻ {displayCards.length > 0 ? currentIndex + 1 : 0} / {displayCards.length}
        </div>
      </div>

      {/* ✉️ TẦNG 2: Ô chứa thông báo nội bộ (Đã tối ưu cho cả thông báo chọn trình độ) */}
      <div className="w-full h-12 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {inlineAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-[95%] flex items-center space-x-2 px-4 py-2 rounded-xl border shadow-sm text-xs font-bold justify-center ${
                inlineAlert.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <span>{inlineAlert.type === 'success' ? '✔' : '❌'}</span>
              <span className="text-center">{inlineAlert.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🎯 TẦNG 3: Khối lõi trung tâm chứa thẻ */}
      <div className="w-full flex flex-col space-y-4 mt-2 flex-shrink-0">
        <div className="w-full aspect-[3/4] max-h-[46vh] relative perspective-1000">
          {displayCards.length === 0 ? (
            <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-bold text-slate-400 leading-relaxed">
                {filterMode === 'learned' 
                  ? '📭 Bạn chưa đánh dấu thuộc từ nào ở trình độ này.' 
                  : '🎉 Tuyệt vời! Bạn đã thuộc sạch bách kho từ vựng ở đây rồi.'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  x: leaveDirection === 'left' ? -300 : leaveDirection === 'right' ? 300 : 0,
                  opacity: 0,
                  rotate: leaveDirection === 'left' ? -15 : leaveDirection === 'right' ? 15 : 0,
                  transition: { duration: 0.2 }
                }}
                whileDrag={{ scale: 1.02 }}
                onClick={() => setIsFlipped(!isFlipped)}
                className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 cursor-grab active:cursor-grabbing hover:shadow-2xl transition-shadow relative"
                style={{ transformStyle: 'preserve-3d', touchAction: 'none' }}
              >
                {!isFlipped ? (
                  <div className="flex flex-col items-center justify-center h-full w-full pb-12">
                    <h1 className="text-9xl font-bold text-slate-800 font-serif">{currentCard.kanji}</h1>
                    <p className="mt-6 text-xs text-slate-400 font-medium tracking-wider animate-pulse text-center px-10">
                      💡 Chạm để lật <br /> Vuốt để chuyển bài
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-start justify-center h-full w-full space-y-4 text-left px-4">
                    <div>
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Âm Hán Việt</span>
                      <p className="text-2xl font-extrabold text-slate-800">{currentCard.han_viet}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider block">Nghĩa tiếng Việt</span>
                      <p className="text-base text-slate-600 font-semibold leading-relaxed">{currentCard.vi_meaning}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block mb-0.5">Cách đọc tiếng Nhật</span>
                      {/* 👉 ĐÃ SỬA: Bọc hàm giải mã Unicode tự động cho tiếng Nhật */}
                      <p className="text-sm text-slate-700 font-mono bg-emerald-50/50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block">
                        {decodeUnicodeString(currentCard.ja_writing)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">Bính âm tiếng Trung</span>
                      <p className="text-sm text-slate-700 font-mono bg-indigo-50/50 px-2 py-0.5 rounded-md border border-indigo-100 inline-block">
                        {decodeUnicodeString(currentCard.zh_pronunciation)}
                      </p>
                    </div>
                  </div>
                )}

                <label 
                  className="absolute bottom-4 right-4 z-20 flex items-center space-x-2 bg-slate-50/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer select-none active:scale-95 transition-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={memorizedIds.includes(currentCard.id)}
                    onChange={() => handleToggleMemorize(currentCard.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-600">Đã thuộc</span>
                </label>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Hộp bộ lọc tính năng */}
        <div className="w-full grid grid-cols-2 gap-3 bg-white/90 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <label className="flex items-center space-x-2 cursor-pointer select-none p-1">
            <input 
              type="radio" 
              name="appFilter"
              checked={filterMode === 'all'}
              onChange={() => setFilterMode('all')}
              className="w-4 h-4 text-slate-900 focus:ring-slate-800 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">🌐 Tất cả</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer select-none p-1 border-l border-slate-100 pl-3">
            <input 
              type="checkbox" 
              checked={isRandom}
              onChange={(e) => setIsRandom(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">🎲 Ngẫu nhiên</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none p-1">
            <input 
              type="radio" 
              name="appFilter"
              checked={filterMode === 'learned'}
              onChange={() => setFilterMode('learned')}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">✅ Đã thuộc</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none p-1 border-l border-slate-100 pl-3">
            <input 
              type="radio" 
              name="appFilter"
              checked={filterMode === 'unlearned'}
              onChange={() => setFilterMode('unlearned')}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-600">❌ Chưa thuộc</span>
          </label>
        </div>

        {/* Nút hành động từ tiếp theo */}
        <button
          disabled={displayCards.length === 0}
          onClick={() => {
            setLeaveDirection('right');
            setTimeout(changeCard, 200);
          }}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          Từ tiếp theo →
        </button>
      </div>

      {/* 📜 TẦNG 4: Chữ ký tác giả Tri ân chuyên nghiệp độc quyền ở đáy cùng */}
      <div className="mt-auto pt-4 pb-2 text-center flex flex-col items-center justify-center space-y-1 select-none pointer-events-none">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[9px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>

    </div>
  );
}

export default function FlashcardPage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none overflow-hidden">
      <Suspense fallback={<p className="text-slate-500 font-medium">Đang tải kho thẻ bài...</p>}>
        <FlashcardContent />
      </Suspense>
    </main>
  );
}