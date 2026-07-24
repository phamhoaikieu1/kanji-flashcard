'use client';

interface HeaderProps {
  displayName: string;
  email: string;
  avatarUrl: string;
  role?: string; // Nhận thêm prop role
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void; // Hàm mở trang Admin
}

export function DashboardHeader({
  displayName,
  email,
  avatarUrl,
  role = 'user',
  onOpenProfile,
  onOpenSettings,
  onOpenAdmin,
}: HeaderProps) {
  const isAdminOrOwner = ['admin', 'owner'].includes(role);

  return (
    <div className="w-full bg-white p-3.5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-shrink-0">
      <div 
        onClick={onOpenProfile}
        className="flex items-center space-x-3 cursor-pointer group p-1 -m-1 rounded-2xl hover:bg-slate-50 transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-inner overflow-hidden border border-slate-200 flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="text-left">
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
            Chào {displayName}! 👋
            {isAdminOrOwner && (
              <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                {role}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">{email}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-1.5">
        {/* Nút Admin chỉ hiển thị với Admin / Owner */}
        {isAdminOrOwner && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="p-2.5 rounded-xl border transition-all active:scale-95 bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100 flex-shrink-0 font-bold text-xs flex items-center gap-1"
            title="Trang quản trị"
          >
            <span>🛡️</span>
            <span className="hidden md:inline">Quản trị</span>
          </button>
        )}

        <button 
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl border transition-all active:scale-95 bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767a1.123 1.123 0 0 0-.417 1.03c.004.074.006.148.006.222 0 .074-.002.148-.006.222a1.123 1.123 0 0 0 .417 1.03l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.25 1.25 0 0 0-.646-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.074-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767a1.122 1.122 0 0 0 .416-1.03c-.004-.074-.006-.148-.006-.222s.002-.148.006-.222a1.122 1.122 0 0 0-.416-1.03l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}