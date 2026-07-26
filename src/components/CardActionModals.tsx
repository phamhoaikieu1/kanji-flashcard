'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface CardActionModalsProps {
  currentCard: any;
  cardType: 'kanji' | 'grammar' | 'hsk' | 'basic_chinese';
  userId?: string;
  // State Modal Báo lỗi
  isReportModalOpen: boolean;
  setIsReportModalOpen: (val: boolean) => void;
  // State Modal Sửa thẻ
  isEditModalOpen: boolean;
  setIsEditModalOpen: (val: boolean) => void;
  // Callback cập nhật UI sau khi Admin sửa thẻ xong
  onCardUpdated?: (updatedData: any) => void;
}

export function CardActionModals({
  currentCard,
  cardType,
  userId,
  isReportModalOpen,
  setIsReportModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  onCardUpdated,
}: CardActionModalsProps) {
  // State Form Báo Lỗi
  const [reportType, setReportType] = useState('meaning');
  const [reportDesc, setReportDesc] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // State Form Sửa Thẻ (Khởi tạo chuẩn tất cả các trường là chuỗi rỗng '')
  const [editFormData, setEditFormData] = useState<any>({
    hanzi: '',
    pinyin: '',
    han_viet: '',
    word_type: '',
    vi_meaning: '',
    example_zh: '',
    example_vi: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    if (currentCard) {
      setEditFormData({
        hanzi: currentCard.hanzi || currentCard.kanji || currentCard.title || '',
        pinyin: currentCard.pinyin || currentCard.ja_writing || '',
        han_viet: currentCard.han_viet || '',
        word_type: currentCard.word_type || '',
        vi_meaning: currentCard.vi_meaning || currentCard.meaning || '',
        example_zh: currentCard.example_zh || currentCard.example_ja || '',
        example_vi: currentCard.example_vi || '',
      });
    }
  }, [currentCard]);

  // Xử lý gửi báo cáo lỗi
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard?.card_id) return;

    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/admin/manage-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_REPORT',
          requestingUserId: userId,
          cardId: currentCard.card_id,
          cardType,
          reportType,
          description: reportDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gửi báo cáo thất bại!');

      toast.success('🎉 Đã gửi báo cáo lỗi! Ban quản trị sẽ kiểm tra sớm.');
      setIsReportModalOpen(false);
      setReportDesc('');
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Xử lý lưu sửa thẻ (Admin/Owner)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard?.card_id) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/admin/manage-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CARD',
          requestingUserId: userId,
          cardId: currentCard.card_id,
          cardType,
          cardData: editFormData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thẻ thất bại!');

      toast.success('✨ Đã cập nhật lại nội dung thẻ!');
      setIsEditModalOpen(false);
      if (onCardUpdated) onCardUpdated({ ...currentCard, ...editFormData });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <>
      {/* 🚨 MODAL 1: BÁO CÁO THẺ LỖI (HỌC VIÊN) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>🚨</span> <span>Báo Cáo Thẻ Bài Lỗi</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Mã thẻ: <strong className="text-slate-800">{currentCard?.card_id}</strong> ({currentCard?.hanzi || currentCard?.kanji})
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại lỗi phát hiện</label>
                <select
                  value={reportType || 'meaning'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white outline-none cursor-pointer"
                >
                  <option value="meaning" className="text-slate-900 font-bold bg-white">Sai nghĩa Tiếng Việt</option>
                  <option value="pinyin" className="text-slate-900 font-bold bg-white">Sai phiên âm Pinyin / Kana</option>
                  <option value="han_viet" className="text-slate-900 font-bold bg-white">Sai âm Hán Việt</option>
                  <option value="example" className="text-slate-900 font-bold bg-white">Lỗi ví dụ minh họa</option>
                  <option value="other" className="text-slate-900 font-bold bg-white">Lỗi khác</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Mô tả chi tiết</label>
                <textarea
                  value={reportDesc || ''}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Ví dụ: Nghĩa từ này bị nhầm, đúng ra phải là..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs outline-none focus:ring-2 focus:ring-slate-800 bg-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md disabled:bg-slate-300"
                >
                  {isSubmittingReport ? 'Đang gửi...' : 'Gửi Báo Cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ MODAL 2: CHỈNH SỬA THẺ TRỰC TIẾP (ADMIN / OWNER) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>✏️</span> <span>Sửa Thẻ Bài ({currentCard?.card_id})</span>
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Chữ Hán / Kanji</label>
                  <input
                    type="text"
                    value={editFormData.hanzi || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hanzi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-serif font-bold text-slate-900 outline-none bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Pinyin / Phiên âm</label>
                  <input
                    type="text"
                    value={editFormData.pinyin || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, pinyin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Âm Hán Việt</label>
                  <input
                    type="text"
                    value={editFormData.han_viet || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, han_viet: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại từ (Danh, Động...)</label>
                  <input
                    type="text"
                    value={editFormData.word_type || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, word_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nghĩa Tiếng Việt</label>
                <input
                  type="text"
                  value={editFormData.vi_meaning || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, vi_meaning: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ví dụ minh họa (Gốc)</label>
                <textarea
                  value={editFormData.example_zh || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, example_zh: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-serif text-slate-900 outline-none bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Dịch nghĩa ví dụ (Tiếng Việt)</label>
                <textarea
                  value={editFormData.example_vi || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, example_vi: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md disabled:bg-slate-300"
                >
                  {isSubmittingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}