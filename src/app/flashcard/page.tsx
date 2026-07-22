'use client';

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlashcard } from './components/useFlashcard';
import { FlashcardCard } from './components/FlashcardCard';
import { FlashcardControls } from './components/FlashcardControls';
import { FlashcardModals } from './components/FlashcardModals';

function FlashcardContent() {
  const f = useFlashcard();

  if (f.loadingData) {
    return (
      <div className="text-center">
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ kho từ vựng...</p>
      </div>
    );
  }

  if (f.displayCards.length === 0 && f.availableLessons.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu từ vựng cho cấp độ {f.selectedLevel}.</p>
        <button onClick={() => f.router.push('/dashboard')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          Quay lại chọn cấp độ khác
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md h-[100dvh] flex flex-col justify-between py-2 px-3 relative overflow-hidden overscroll-none select-none">
      {/* 🔝 TẦNG 1: Header */}
      <div className="w-full flex flex-col items-center flex-shrink-0 relative">
        <button
          onClick={() => f.router.push('/dashboard')}
          className="absolute top-0 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3.5 py-1 rounded-full shadow-sm border border-slate-100 mt-5 z-20">
          TRÌNH ĐỘ {f.selectedLevel} • THẺ {f.displayCards.length > 0 ? f.currentIndex + 1 : 0} / {f.displayCards.length}
        </div>
      </div>

      {/* ✉️ TẦNG 2: Thông báo nội bộ */}
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

      {/* 🎯 TẦNG 3: Khối Thẻ Bài */}
      <FlashcardCard
        displayCards={f.displayCards}
        currentCard={f.currentCard}
        currentIndex={f.currentIndex}
        isFlipped={f.isFlipped}
        setIsFlipped={f.setIsFlipped}
        leaveDirection={f.leaveDirection}
        memorizedIds={f.memorizedIds}
        savedIds={f.savedIds}
        frontConfig={f.frontConfig}
        onNext={f.handleNextCard}
        onPrev={f.handlePrevCard}
        onToggleMemorize={f.handleToggleMemorize}
        onToggleSave={f.handleToggleSave}
      />

      {/* 🎛️ TẦNG 4: Bộ Lọc & Điều Hướng */}
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

      {/* 📜 Bottom Sheets / Modals */}
      <FlashcardModals
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

      {/* 📜 TẦNG 5: Footer Sensei */}
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