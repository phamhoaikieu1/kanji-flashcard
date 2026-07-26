'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase';
import { useGrammar } from './components/useGrammar';
import { GrammarCard } from './components/GrammarCard';
import { FlashcardControls } from '../flashcard/components/FlashcardControls';
import { GrammarModals } from './components/GrammarModals';
import { CardActionModals } from '@/components/CardActionModals';

function GrammarContent() {
  const g = useGrammar();
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Trạng thái mở Modal Báo lỗi và Sửa thẻ
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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

  if (g.loadingData) {
    return (
      <div className="text-center">
        <p className="text-indigo-600 font-bold animate-pulse">Đang đồng bộ kho ngữ pháp...</p>
      </div>
    );
  }

  if (g.displayCards.length === 0 && g.availableLessons.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500 font-medium">Hiện chưa có dữ liệu ngữ pháp cho cấp độ {g.selectedLevel}.</p>
        <button onClick={() => g.router.push('/dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold cursor-pointer">
          Quay lại chọn cấp độ khác
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md h-[100dvh] flex flex-col justify-between py-2 px-3 relative overflow-hidden overscroll-none select-none">
      {/* 🔝 Header */}
      <div className="w-full flex flex-col items-center flex-shrink-0 relative">
        <button
          onClick={() => g.router.push('/dashboard')}
          className="absolute top-0 left-0 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors z-30 cursor-pointer"
        >
          <span>←</span> <span>Chọn trình độ khác</span>
        </button>

        <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-50 px-3.5 py-1 rounded-full shadow-sm border border-indigo-100 mt-5 z-20">
          NGỮ PHÁP {g.selectedLevel} • THẺ {g.displayCards.length > 0 ? g.currentIndex + 1 : 0} / {g.displayCards.length}
        </div>
      </div>

      {/* ✉️ Inline Notification */}
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

      {/* 🎯 Card Stack */}
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
        isAdminOrOwner={isAdminOrOwner}
        onNext={g.handleNextCard}
        onPrev={g.handlePrevCard}
        onToggleMemorize={g.handleToggleMemorize}
        onToggleSave={g.handleToggleSave}
        onOpenReportModal={() => setIsReportOpen(true)}
        onOpenEditModal={() => setIsEditOpen(true)}
      />

      {/* 🎛️ Controls */}
      <FlashcardControls
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

      {/* 📜 Modals */}
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

      {/* 🚨 Modals Báo lỗi & Sửa thẻ trực tiếp */}
      <CardActionModals
        currentCard={g.currentCard}
        cardType="grammar"
        userId={currentUserId}
        isReportModalOpen={isReportOpen}
        setIsReportModalOpen={setIsReportOpen}
        isEditModalOpen={isEditOpen}
        setIsEditModalOpen={setIsEditOpen}
        onCardUpdated={(updated) => {
          const updatedCards = [...g.displayCards];
          updatedCards[g.currentIndex] = updated;
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

export default function GrammarPage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-2 font-sans select-none overflow-hidden overscroll-none">
      <Suspense fallback={<p className="text-indigo-600 font-bold">Đang tải kho thẻ bài ngữ pháp...</p>}>
        <GrammarContent />
      </Suspense>
    </main>
  );
}