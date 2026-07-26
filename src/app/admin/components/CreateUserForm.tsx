interface CreateUserFormProps {
  newDisplayName: string;
  setNewDisplayName: (val: string) => void;
  newEmail: string;
  setNewEmail: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  isCreating: boolean;
  onGeneratePass: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateUserForm({
  newDisplayName,
  setNewDisplayName,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  isCreating,
  onGeneratePass,
  onSubmit,
}: CreateUserFormProps) {
  return (
    <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
        <span>➕</span> <span>Cấp Tài Khoản Mới Cho Học Viên</span>
      </h2>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên học viên</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ví dụ: Trang Chuối"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs focus:ring-2 focus:ring-slate-800 outline-none bg-white"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Email đăng nhập</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="hocvien@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium text-xs focus:ring-2 focus:ring-slate-800 outline-none bg-white"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-bold text-slate-700">Mật khẩu ban đầu</label>
            <button
              type="button"
              onClick={onGeneratePass}
              className="text-[11px] font-extrabold text-indigo-600 hover:underline active:scale-95 transition-transform"
            >
              ⚡ Tạo nhanh mật khẩu
            </button>
          </div>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập hoặc bấm Tạo nhanh mật khẩu"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:ring-2 focus:ring-slate-800 outline-none bg-white"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs shadow-md active:scale-98 transition-all disabled:bg-slate-300"
        >
          {isCreating ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản & Copy Tin Nhắn Bàn Giao'}
        </button>
      </form>
    </div>
  );
}