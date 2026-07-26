interface AdminHeaderProps {
  adminRole: string;
  activeTab: 'users' | 'reports';
  setActiveTab: (tab: 'users' | 'reports') => void;
  onBack: () => void;
}

export function AdminHeader({ adminRole, activeTab, setActiveTab, onBack }: AdminHeaderProps) {
  return (
    <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200 active:scale-95"
            title="Quay về Dashboard"
          >
            ← Dashboard
          </button>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5">
              🛡️ TRANG QUẢN TRỊ NÂNG CAO
            </h1>
            <p className="text-[11px] text-slate-500 font-bold">
              Cấp bậc: <span className="font-extrabold text-indigo-700 uppercase">{adminRole}</span>
            </p>
          </div>
        </div>
      </div>

      {/* THANH TAB CHUYỂN ĐỔI */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 Quản Lý Học Viên
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'reports'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📬 Báo Cáo Thẻ Lỗi
        </button>
      </div>
    </div>
  );
}