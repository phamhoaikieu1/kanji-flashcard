interface AdminModalsProps {
  resetModalUser: any;
  setResetModalUser: (val: any) => void;
  resetPasswordVal: string;
  setResetPasswordVal: (val: string) => void;
  isResetting: boolean;
  handleResetPassword: (e: React.FormEvent) => void;
  lockModalUser: any;
  setLockModalUser: (val: any) => void;
  lockSettings: boolean;
  setLockSettings: (val: boolean) => void;
  selectedLockedCourses: string[];
  setSelectedLockedCourses: (val: string[]) => void;
  lockDuration: string;
  setLockDuration: (val: string) => void;
  isSavingLock: boolean;
  courseOptions: any[];
  handleSaveLock: () => void;
}

export function AdminModals({
  resetModalUser,
  setResetModalUser,
  resetPasswordVal,
  setResetPasswordVal,
  isResetting,
  handleResetPassword,
  lockModalUser,
  setLockModalUser,
  lockSettings,
  setLockSettings,
  selectedLockedCourses,
  setSelectedLockedCourses,
  lockDuration,
  setLockDuration,
  isSavingLock,
  courseOptions,
  handleSaveLock,
}: AdminModalsProps) {
  return (
    <>
      {/* MODAL KHÓA TÀI KHOẢN */}
      {lockModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-black text-slate-900">🔒 Thiết Lập Khóa Tài Khoản</h3>
            <p className="text-xs text-slate-600 font-medium">
              Đang thiết lập cho: <strong className="text-slate-900">{lockModalUser.full_name}</strong>
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Khóa Tính Năng Cài Đặt</p>
                  <p className="text-[10px] text-slate-500">Cấm đổi Email, SĐT, Tên, Mật khẩu... (Vẫn cho đăng nhập)</p>
                </div>
                <input
                  type="checkbox"
                  checked={lockSettings}
                  onChange={(e) => setLockSettings(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-extrabold text-slate-800">Khóa Khóa Học Cụ Thể</p>
                <button
                  type="button"
                  onClick={() => setSelectedLockedCourses(selectedLockedCourses.length === courseOptions.length ? [] : courseOptions.map(c => c.code))}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  {selectedLockedCourses.length === courseOptions.length ? 'Bỏ chọn hết' : 'Khóa Tất Cả'}
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {courseOptions.map((course) => {
                  const isChecked = selectedLockedCourses.includes(course.code);
                  return (
                    <label key={course.code} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs cursor-pointer hover:bg-slate-100/50">
                      <span className="font-bold text-slate-700">{course.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) setSelectedLockedCourses(selectedLockedCourses.filter(c => c !== course.code));
                          else setSelectedLockedCourses([...selectedLockedCourses, course.code]);
                        }}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs font-extrabold text-slate-800">Thời Gian Áp Dụng Lệnh Khóa</p>
              <select
                value={lockDuration}
                onChange={(e) => setLockDuration(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-slate-800 shadow-sm cursor-pointer"
              >
                <option value="unlock" className="text-slate-900 font-bold bg-white">Mở khóa ngay (Không giới hạn)</option>
                <option value="1h" className="text-slate-900 font-bold bg-white">Khóa trong 1 Giờ</option>
                <option value="4h" className="text-slate-900 font-bold bg-white">Khóa trong 4 Giờ</option>
                <option value="8am" className="text-slate-900 font-bold bg-white">Khóa cho tới 8:00 Sáng mai</option>
                <option value="forever" className="text-slate-900 font-bold bg-white">Khóa vĩnh viễn (Cho tới khi mở lại)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveLock}
                disabled={isSavingLock}
                className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors disabled:bg-slate-300"
              >
                {isSavingLock ? 'Đang lưu...' : 'Lưu Thiết Lập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤP LẠI MẬT KHẨU */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">🔑 Cấp Lại Mật Khẩu Mới</h3>
            <p className="text-xs text-slate-600 font-medium">
              Đổi mật khẩu cho: <strong className="text-slate-900">{resetModalUser.full_name}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                placeholder="Nhập mật khẩu mới (Min 6 ký tự)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                required
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors disabled:bg-slate-300"
                >
                  {isResetting ? 'Đang lưu...' : 'Lưu Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}