'use client';

import { useDashboard } from './components/useDashboard';
import { DashboardHeader } from './components/DashboardHeader';
import { LeaderboardCard } from './components/LeaderboardCard';
import { LearningButtons } from './components/LearningButtons';
import { DashboardModals } from './components/DashboardModals';

export default function DashboardPage() {
  const d = useDashboard();

  if (d.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ dữ liệu tài khoản...</p>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans select-none flex flex-col justify-between overflow-hidden relative">
      <div className="w-full max-w-md mx-auto space-y-3 flex-grow flex flex-col justify-start overflow-y-auto no-scrollbar">
        
        {/* 👤 KHỐI 1: Header */}
        <DashboardHeader
          displayName={d.displayName}
          email={d.user?.email}
          avatarUrl={d.currentAvatarUrl}
          role={d.userRole}
          onOpenProfile={d.handleOpenMyProfile}
          onOpenSettings={() => d.router.push('/settings')}
          onOpenAdmin={() => d.router.push('/admin')}
        />

        {/* 🏆 KHỐI 2: Bảng Xếp Hạng */}
        <LeaderboardCard
          leaderboardData={d.leaderboardData}
          totalSystemCards={d.totalSystemCards}
          onSelectProfile={d.setSelectedProfile}
        />

        {/* 📚 KHỐI 3: Nút Chọn Học */}
        <LearningButtons
          onOpenVocab={() => d.setIsLevelModalOpen(true)}
          onOpenGrammar={() => d.setIsGrammarModalOpen(true)}
          onOpenBasicChinese={() => d.setIsBasicChineseModalOpen(true)}
          onOpenHsk={() => d.setIsHskModalOpen(true)}
          onOpenTraditionalChinese={() => d.setIsTraditionalChineseModalOpen(true)}
          onOpenEnglish={() => d.setIsEnglishModalOpen(true)}
        />
      </div>

      {/* 💬 NÚT CHAT CỐ ĐỊNH */}
      <div className="fixed bottom-12 right-5 z-30">
        <button
          onClick={() => d.router.push('/chat')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-2xl active:scale-90 transition-all flex items-center justify-center border-2 border-white/20 group cursor-pointer"
          title="Trung tâm nhắn tin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.596.596 0 0 1-.722-.544v-.057c0-.288.09-.567.258-.797a6.32 6.32 0 0 0 1.22-3.141C4.81 15.01 4 13.58 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-xs pl-0 group-hover:pl-2">
            Nhắn tin
          </span>
        </button>
      </div>

      {/* 📜 FOOTER */}
      <div className="w-full text-center flex flex-col items-center justify-center space-y-0.5 select-none pointer-events-none flex-shrink-0 pt-2 pb-1">
        <p className="text-[10px] font-medium text-slate-400 tracking-wide">
          Phần mềm được thiết kế và dành tặng riêng cho Sensei Trang Dang
        </p>
        <p className="text-[8px] font-sans text-slate-300 tracking-widest uppercase">
          Trang Dang先生に感謝を込めて • 心を込めて開発された特別仕様ツール
        </p>
      </div>

      {/* 📜 MODALS POPUP */}
      <DashboardModals
        router={d.router}
        levels={d.levels}
        hskLevels={d.hskLevels}
        basicChineseLevels={d.basicChineseLevels}
        traditionalChineseLevels={d.traditionalChineseLevels}
        englishLevels={d.englishLevels}
        isLevelModalOpen={d.isLevelModalOpen}
        setIsLevelModalOpen={d.setIsLevelModalOpen}
        isGrammarModalOpen={d.isGrammarModalOpen}
        setIsGrammarModalOpen={d.setIsGrammarModalOpen}
        isHskModalOpen={d.isHskModalOpen}
        setIsHskModalOpen={d.setIsHskModalOpen}
        isBasicChineseModalOpen={d.isBasicChineseModalOpen}
        setIsBasicChineseModalOpen={d.setIsBasicChineseModalOpen}
        isTraditionalChineseModalOpen={d.isTraditionalChineseModalOpen}
        setIsTraditionalChineseModalOpen={d.setIsTraditionalChineseModalOpen}
        isEnglishModalOpen={d.isEnglishModalOpen}
        setIsEnglishModalOpen={d.setIsEnglishModalOpen}
        selectedProfile={d.selectedProfile}
        setSelectedProfile={d.setSelectedProfile}
        totalSystemCards={d.totalSystemCards}
        currentUserRole={d.userRole}
        onToggleRole={d.handleToggleRoleFromModal}
        onResetPassword={d.handleResetPasswordFromModal}
      />
    </main>
  );
}