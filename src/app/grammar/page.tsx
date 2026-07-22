'use client';

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGrammar } from './components/useGrammar';
import { GrammarCard } from './components/GrammarCard';
import { GrammarControls } from './components/GrammarControls';
import { GrammarModals } from './components/GrammarModals';

function GrammarContent() {
  const g = useGrammar();

  if (g.loadingData) {
    return (
      <div className="text-center">
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ kho ngữ pháp...</p>
      </div>
    );
  }

  if (g.displayCards.length === 0 && g.availableLessons.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu ngữ pháp cho cấp độ {g.selectedLevel}.</p>
        <button onClick={() => g.router.push('/dashboard')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
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
          onClick={() => g.router.push('/dashboard')}
          className="absolute top-0 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3.5 py-1 rounded-full shadow-sm border border-slate-100 mt-5 z-20">
          NGỮ PHÁP {g.selectedLevel} • THẺ {g.displayCards.length > 0 ? g.currentIndex + 1 : 0} / {g.displayCards.length}
        </div>
      </div>

      {/* ✉️ TẦNG 2: Thông báo nội bộ */}
      <div className="w-full h-7 flex items-center justify-center flex-shrink-0 my-0.5 overflow-hidden">
        <AnimatePresence mode="wait">
          {g.inlineAlert && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`w-full max-w-[95%] flex items-center space-x-1.5 px-3 py-1 rounded-xl border shadow-sm text-[11px] font-bold justify-center ${
                g.inlineAlert.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <span>{g.inlineAlert.type === 'success' ? '✔' : '❌'}</span>
              <span>{g.inlineAlert.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🎯 TẦNG 3: Khối Thẻ Bài Ngữ Pháp */}
      <GrammarCard
        displayCards={g.displayCards}
        currentCard={g.currentCard}
        currentIndex={g.currentIndex}
        isFlipped={g.isFlipped}
        setIsFlipped={g.setIsFlipped}
        leaveDirection={g.leaveDirection}
        memorizedIds={g.memorizedIds}
        savedIds={g.savedIds}
        frontConfig={g.frontConfig}
        onNext={g.handleNextCard}
        onPrev={g.handlePrevCard}
        onToggleMemorize={g.handleToggleMemorize}
        onToggleSave={g.handleToggleSave}
      />

      {/* 🎛️ TẦNG 4: Bộ Lọc & Điều Hướng */}
      <GrammarControls
        selectedLessonsCount={g.selectedLessons.length}
        availableLessonsCount={g.availableLessons.length}
        filterMode={g.filterMode}
        setFilterMode={g.setFilterMode}
        isRandom={g.isRandom}
        setIsRandom={g.setIsRandom}
        currentIndex={g.currentIndex}
        displayCardsLength={g.displayCards.length}
        onOpenLessonModal={() => g.setIsLessonModalOpen(true)}
        onOpenDisplayModal={() => g.setIsDisplayModalOpen(true)}
        onPrev={g.handlePrevCard}
        onNext={g.handleNextCard}
      />

      {/* 📜 Bottom Sheets / Modals */}
      <GrammarModals
        isLessonModalOpen={g.isLessonModalOpen}
        setIsLessonModalOpen={g.setIsLessonModalOpen}
        availableLessons={g.availableLessons}
        selectedLessons={g.selectedLessons}
        setSelectedLessons={g.setSelectedLessons}
        isDisplayModalOpen={g.isDisplayModalOpen}
        setIsDisplayModalOpen={g.setIsDisplayModalOpen}
        frontConfig={g.frontConfig}
        setFrontConfig={g.setFrontConfig}
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

export default function GrammarPage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-2 font-sans select-none overflow-hidden overscroll-none">
      <Suspense fallback={<p className="text-slate-500 font-medium">Đang tải kho thẻ bài...</p>}>
        <GrammarContent />
      </Suspense>
    </main>
  );
}