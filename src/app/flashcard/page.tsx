'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Tách component con để Next.js không bị lỗi khi build với useSearchParams
function FlashcardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
  
    // Lấy trình độ từ URL (ví dụ: ?level=N5). Nếu không có, mặc định lấy N5
    const selectedLevel = searchParams.get('level') || 'N5';

    // --- ĐOẠN ĐƯỢC THAY THẾ HOÀN TOÀN ---
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [leaveDirection, setLeaveDirection] = useState<'left' | 'right' | null>(null);

    // Khởi chạy hàm kéo 100 từ chuẩn từ Cloud Server về máy khi chọn Level
    useEffect(() => {
        const fetchCards = async () => {
        setLoadingData(true);
        const { data, error } = await supabase
            .from('kanji_cards')
            .select('*')
            .eq('level', selectedLevel)
            .order('id', { ascending: true });

        if (data) {
            setFilteredData(data);
        }
        setLoadingData(false);
        };
        fetchCards();
    }, [selectedLevel]);

    // Trạng thái chờ trong vài mili-giây khi mạng đang tải
    if (loadingData) {
        return (
        <div className="text-center">
            <p className="text-slate-500 font-medium animate-pulse">Đang tải kho thẻ bài từ Cloud Server...</p>
        </div>
        );
    }

    // Trường hợp kho dữ liệu trống thực sự trên Server cho Level này
    if (filteredData.length === 0) {
    // --- HẾT ĐOẠN THAY THẾ ---
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu Kanji cho cấp độ {selectedLevel}.</p>
        <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          Quay lại chọn cấp độ khác
        </button>
      </div>
    );
  }

  const currentCard = filteredData[currentIndex];

  const changeCard = () => {
    setIsFlipped(false);
    setLeaveDirection(null);
    if (currentIndex < filteredData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Hết từ thì vòng lại từ đầu của level đó
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      setLeaveDirection('right');
      setTimeout(changeCard, 200);
    } else if (info.offset.x < -swipeThreshold) {
      setLeaveDirection('left');
      setTimeout(changeCard, 200);
    }
  };

  const handleMemorizeCard = async (cardId: number) => {
    // 1. Kiểm tra xem ông nào đang học
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu tiến trình học!');
      return;
    }

    // 2. Ghi nhận vào bảng thuộc bài trên server
    const { error } = await supabase
      .from('user_memorized_cards')
      .insert([{ user_id: user.id, card_id: cardId }]);

    if (error) {
      // Mã lỗi 23505 trên Postgres nghĩa là trùng Unique (đã nhớ từ trước rồi)
      if (error.code === '23505') {
        toast.error('Thẻ này bạn đã ghi nhớ từ trước rồi nhé!');
      } else {
        toast.error(`Lỗi lưu tiến trình: ${error.message}`);
      }
    } else {
      toast.success('🎉 Đã thuộc thêm 1 từ! Bảng xếp hạng đã cập nhật.');
      // --- THAY THẾ DÒNG COMMENT BẰNG LOGIC TỰ ĐỔI THẺ THẬT ---
      setLeaveDirection('right');
      setTimeout(changeCard, 200);
      // --- HẾT ĐOẠN THAY THẾ ---
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center space-y-8 relative">
      
      {/* Nút quay lại Dashboard chọn trình độ */}
      <button 
        onClick={() => router.push('/dashboard')}
        className="absolute top-[-50px] left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors"
      >
        <span>←</span> <span>Chọn trình độ khác</span>
      </button>

      {/* Tiến độ học theo Trình độ đã lọc */}
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100">
        Trình độ {selectedLevel} • Thẻ {currentIndex + 1} / {filteredData.length}
      </div>

      {/* Khung chứa hiệu ứng vuốt Tinder */}
      <div className="w-full aspect-[3/4] relative perspective-1000">
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
            className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 cursor-grab active:cursor-grabbing hover:shadow-2xl transition-shadow"
            style={{ transformStyle: 'preserve-3d', touchAction: 'none' }}
          >
            {!isFlipped ? (
              <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-9xl font-bold text-slate-800 font-serif">{currentCard.kanji}</h1>
                <p className="mt-12 text-xs text-slate-400 font-medium tracking-wider animate-pulse">
                  💡 Chạm để lật • Vuốt để chuyển bài
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-center h-full w-full space-y-5 text-left px-4">
                <div>
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-1">Âm Hán Việt</span>
                  <p className="text-3xl font-extrabold text-slate-800">{currentCard.han_viet}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-sky-500 uppercase tracking-wider block mb-1">Nghĩa tiếng Việt</span>
                  <p className="text-lg text-slate-600 font-semibold leading-relaxed">{currentCard.vi_meaning}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1">Cách đọc tiếng Nhật</span>
                  <p className="text-base text-slate-700 font-mono bg-emerald-50/50 px-2.5 py-1 rounded-md border border-emerald-100 inline-block">{currentCard.ja_writing}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">Bính âm tiếng Trung</span>
                  <p className="text-base text-slate-700 font-mono bg-indigo-50/50 px-2.5 py-1 rounded-md border border-indigo-100 inline-block">{currentCard.zh_pronunciation}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
        {/* --- NÚT MỚI ĐƯỢC CHÈN VÀO ĐÂY --- */}
        <button
            onClick={() => handleMemorizeCard(currentCard.id)}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-emerald-700 text-sm tracking-wide"
        >
            ✅ Đã thuộc từ này
        </button>
        {/* --- HẾT ĐOẠN CHÈN --- */}
      <button
        onClick={() => {
          setLeaveDirection('right');
          setTimeout(changeCard, 200);
        }}
        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-98 transition-all hover:bg-slate-800 text-sm tracking-wide"
      >
        Từ tiếp theo →
      </button>
    </div>
  );
}

export default function FlashcardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none overflow-hidden">
      <Suspense fallback={<p className="text-slate-500 font-medium">Đang tải kho thẻ bài...</p>}>
        <FlashcardContent />
      </Suspense>
    </main>
  );
}