interface UsersListProps {
  usersList: any[];
  currentAdminId: string;
  adminRole: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onOpenResetModal: (user: any) => void;
  onOpenLockModal: (user: any) => void;
  onToggleRole: (user: any, newRole: string) => void;
  onDeleteUser: (user: any) => void;
}

export function UsersList({
  usersList,
  currentAdminId,
  adminRole,
  searchTerm,
  setSearchTerm,
  onOpenResetModal,
  onOpenLockModal,
  onToggleRole,
  onDeleteUser,
}: UsersListProps) {
  return (
    <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>👥</span> <span>Danh Sách Học Viên ({usersList.length})</span>
        </h2>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Tìm tên hoặc email..."
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs outline-none focus:ring-2 focus:ring-slate-800 w-full md:w-52 bg-white"
        />
      </div>

      <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
        {usersList.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-600">Không tìm thấy học viên nào.</p>
          </div>
        ) : (
          usersList.map((u) => {
            const isMe = u.id === currentAdminId;
            const isUserOwner = u.role === 'owner';
            const isUserAdmin = u.role === 'admin';
            const displayName = u.full_name || u.display_name || 'Học viên';

            const isBannedTime = u.ban_until && new Date(u.ban_until) > new Date();
            const isLockedAny = u.is_locked_settings || u.locked_courses?.length > 0 || isBannedTime;

            // Kiểm tra quyền thao tác: Chỉ cho phép thao tác nếu đối tượng là User thường, hoặc nếu người thao tác là Owner
            const canManageTarget = !isUserAdmin || adminRole === 'owner';

            return (
              <div
                key={u.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2 transition-colors"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center flex-shrink-0 text-xs shadow-sm overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-extrabold text-slate-900 truncate flex items-center gap-1.5 text-xs">
                      <span>{displayName}</span>
                      {isUserOwner && <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-200">OWNER</span>}
                      {isUserAdmin && <span className="bg-indigo-100 text-indigo-900 text-[9px] px-1.5 py-0.5 rounded font-black border border-indigo-200">ADMIN</span>}
                      {isLockedAny && <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded font-black border border-rose-200">🔒 ĐANG KHÓA</span>}
                      {isMe && <span className="text-[10px] text-slate-500 font-bold">(Bạn)</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{u.email || u.id}</p>
                  </div>
                </div>

                {!isMe && !isUserOwner && (
                  <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                    {/* CHỈ ADMIN THƯỜNG THAO TÁC TRÊN USER THƯỜNG, HOẶC OWNER THAO TÁC TRÊN TẤT CẢ */}
                    {canManageTarget && (
                      <>
                        <button
                          onClick={() => onOpenResetModal(u)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 font-extrabold rounded-xl text-[10px] hover:bg-slate-200 transition-colors shadow-sm"
                        >
                          🔑 Đổi MK
                        </button>

                        <button
                          onClick={() => onOpenLockModal(u)}
                          className={`px-2.5 py-1.5 border font-extrabold rounded-xl text-[10px] transition-colors shadow-sm ${
                            isLockedAny 
                              ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200' 
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🔒 Khóa
                        </button>
                      </>
                    )}

                    {isUserAdmin ? (
                      adminRole === 'owner' && (
                        <button
                          onClick={() => onToggleRole(u, 'user')}
                          className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-extrabold rounded-xl text-[10px] hover:bg-rose-100 transition-colors shadow-sm"
                        >
                          ⬇️ Hạ Cấp
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onToggleRole(u, 'admin')}
                        className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold rounded-xl text-[10px] hover:bg-indigo-100 transition-colors shadow-sm"
                      >
                        ⭐ Thăng Admin
                      </button>
                    )}

                    {canManageTarget && (
                      <button
                        onClick={() => onDeleteUser(u)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-[10px] transition-colors shadow-sm"
                      >
                        🗑️ Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}