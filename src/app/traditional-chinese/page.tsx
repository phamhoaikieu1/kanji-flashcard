'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase';
import { useTraditionalChineseFlashcard } from './components/useTraditionalChineseFlashcard';
import { TraditionalChineseFlashcardCard } from './components/TraditionalChineseFlashcardCard';
import { FlashcardControls } from '../flashcard/components/FlashcardControls';
import { TraditionalChineseFlashcardModals } from './components/TraditionalChineseFlashcardModals';
import { CardActionModals } from '@/components/CardActionModals';

function TraditionalChineseFlashcardContent() {
  const f = useTraditionalChineseFlashcard();
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Trạng thái mở Modal Báo lỗi và Sửa thẻ
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Kiểm tra quyền Admin/Owner của user đang đăng nhập
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile && ['admin', 'owner'].includes(profile.role)) {
          setIsAdminOrOwner(true);
        }
      }
    };
    checkRole();
  }, []);

  if (f.loadingData) {
    return (
      <div className="text-center">
        <p className="text-amber-700 font-bold animate-pulse">Đang đồng bộ kho từ vựng Phồn Thể...</p>
      </div>
    );
  }

  if (f.displayCards.length === 0 && f.availableLessons.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu từ vựng cho trình độ {f.selectedLevel}.</p>
        <button onClick={() => f.router.push('/dashboard')} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold">
          Quay lại chọn trình độ khác
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md h-[100dvh] flex flex-col justify-between py-2 px-3 relative overflow-hidden overscroll-none select-none">
      {/* 🔝 Header */}
      <div className="w-full flex flex-col items-center flex-shrink-0 relative">
        <button
          onClick={() => f.router.push('/dashboard')}
          className="absolute top-0 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-widest bg-amber-50 px-3.5 py-1 rounded-full shadow-sm border border-amber-200 mt-5 z-20">
          PHỒN THỂ {f.selectedLevel} • THẺ {f.displayCards.length > 0 ? f.currentIndex + 1 : 0} / {f.displayCards.length}
        </div>
      </div>

      {/* ✉️ Inline Notification */}
      <div className="w-full h-7 flex items-center justify-center flex-shrink-0 my-0.5 overflow-hidden">
        <AnimatePresence mode="wait">
          {f.inlineAlert && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`w-full max-w-[95%] flex items-center space-x-1.5 px-3 py-1 rounded-xl border shadow-sm text-[11px] font-bold justify-center ${
                f.inlineAlert.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <span>{f.inlineAlert.type === 'success' ? '✔' : '❌'}</span>
              <span>{f.inlineAlert.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🎯 Card Stack */}
      <TraditionalChineseFlashcardCard
        displayCards={f.displayCards}
        currentCard={f.currentCard}
        currentIndex={f.currentIndex}
        isFlipped={f.isFlipped}
        setIsFlipped={f.setIsFlipped}
        leaveDirection={f.leaveDirection}
        memorizedIds={f.memorizedIds}
        savedIds={f.savedIds}
        frontConfig={f.frontConfig}
        isAdminOrOwner={isAdminOrOwner}
        onNext={f.handleNextCard}
        onPrev={f.handlePrevCard}
        onToggleMemorize={f.handleToggleMemorize}
        onToggleSave={f.handleToggleSave}
        onOpenReportModal={() => setIsReportOpen(true)}
        onOpenEditModal={() => setIsEditOpen(true)}
      />

      {/* 🎛️ Controls */}
      <FlashcardControls
        selectedLessonsCount={f.selectedLessons.length}
        availableLessonsCount={f.availableLessons.length}
        filterMode={f.filterMode}
        setFilterMode={f.setFilterMode}
        isRandom={f.isRandom}
        setIsRandom={f.setIsRandom}
        currentIndex={f.currentIndex}
        displayCardsLength={f.displayCards.length}
        onOpenLessonModal={() => f.setIsLessonModalOpen(true)}
        onOpenDisplayModal={() => f.setIsDisplayModalOpen(true)}
        onPrev={f.handlePrevCard}
        onNext={f.handleNextCard}
      />

      {/* 📜 Modals cấu hình & chọn bài */}
      <TraditionalChineseFlashcardModals
        isLessonModalOpen={f.isLessonModalOpen}
        setIsLessonModalOpen={f.setIsLessonModalOpen}
        availableLessons={f.availableLessons}
        selectedLessons={f.selectedLessons}
        setSelectedLessons={f.setSelectedLessons}
        isDisplayModalOpen={f.isDisplayModalOpen}
        setIsDisplayModalOpen={f.setIsDisplayModalOpen}
        frontConfig={f.frontConfig}
        setFrontConfig={f.setFrontConfig}
      />

      {/* 🚨 Modals Báo lỗi & Sửa thẻ trực tiếp */}
      <CardActionModals
        currentCard={f.currentCard}
        cardType="basic_chinese"
        userId={currentUserId}
        isReportModalOpen={isReportOpen}
        setIsReportModalOpen={setIsReportOpen}
        isEditModalOpen={isEditOpen}
        setIsEditModalOpen={setIsEditOpen}
        onCardUpdated={(updated) => {
          const updatedCards = [...f.displayCards];
          updatedCards[f.currentIndex] = updated;
        }}
      />

      {/* 📜 Footer Sensei */}
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

export default function TraditionalChinesePage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50/30 p-2 font-sans select-none overflow-hidden overscroll-none">
      <Suspense fallback={<p className="text-amber-700 font-bold">Đang tải Tiếng Trung Phồn Thể...</p>}>
        <TraditionalChineseFlashcardContent />
      </Suspense>
    </main>
  );
}