'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CardActionModals } from '@/components/CardActionModals';

interface AdminCardReportsProps {
  currentAdminId: string;
}

export function AdminCardReports({ currentAdminId }: AdminCardReportsProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý việc mở Modal Sửa thẻ từ Báo cáo
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editingCardType, setEditingCardType] = useState<any>('basic_chinese');
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch danh sách báo cáo
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/manage-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_REPORTS',
          requestingUserId: currentAdminId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reports) {
        setReports(data.reports);
      } else {
        toast.error(`Không thể lấy danh sách báo lỗi: ${data.error || 'Lỗi không xác định'}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi khi tải báo cáo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAdminId) fetchReports();
  }, [currentAdminId]);

  // Cập nhật trạng thái báo cáo (Đã xong / Xóa)
  const handleUpdateStatus = async (reportId: number, status: 'resolved' | 'ignored' | 'delete') => {
    try {
      const res = await fetch('/api/admin/manage-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_REPORT_STATUS',
          requestingUserId: currentAdminId,
          reportId,
          reportStatus: status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Đã cập nhật trạng thái báo cáo!');
      await fetchReports();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  // Mở nhanh Modal sửa thẻ từ báo cáo (Bọc dữ liệu an toàn)
  const handleOpenEditFromReport = (report: any) => {
    if (!report.card_detail) {
      toast.error('Không tìm thấy dữ liệu thẻ bài gốc!');
      return;
    }

    const safeCardDetail = {
      ...report.card_detail,
      hanzi: report.card_detail.hanzi || report.card_detail.kanji || report.card_detail.title || '',
      pinyin: report.card_detail.pinyin || '',
      meaning: report.card_detail.meaning || '',
      example: report.card_detail.example || '',
      han_viet: report.card_detail.han_viet || '',
    };

    setEditingCard(safeCardDetail);
    setEditingCardType(report.card_type);
    setEditingReportId(report.id);
    setIsEditModalOpen(true);
  };

  // Tên loại thẻ
  const getCardTypeName = (type: string) => {
    switch (type) {
      case 'kanji': return 'Từ vựng Kanji';
      case 'grammar': return 'Ngữ pháp Tiếng Nhật';
      case 'hsk': return 'Tiếng Trung HSK';
      case 'basic_chinese': return 'Tiếng Trung Cơ Bản';
      default: return type;
    }
  };

  // Tên loại lỗi
  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'meaning': return 'Sai nghĩa Tiếng Việt';
      case 'pinyin': return 'Sai phiên âm / Pinyin';
      case 'han_viet': return 'Sai âm Hán Việt';
      case 'example': return 'Lỗi ví dụ minh họa';
      case 'other': return 'Lỗi khác';
      default: return type;
    }
  };

  // Định dạng thời gian
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return <p className="text-xs text-slate-500 font-bold py-8 text-center animate-pulse">Đang nạp danh sách báo cáo lỗi thẻ...</p>;
  }

  return (
    <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>📬</span> <span>Danh Sách Học Viên Báo Lỗi Thẻ ({reports.length})</span>
        </h2>
        <button
          onClick={fetchReports}
          className="text-[10px] font-extrabold text-indigo-600 hover:underline flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span>🔄</span> <span>Tải lại</span>
        </button>
      </div>

      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
        {reports.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-600">🎉 Tuyệt vời! Hiện chưa có báo cáo lỗi thẻ nào.</p>
          </div>
        ) : (
          reports.map((r) => {
            const card = r.card_detail;
            const wordName = card?.hanzi || card?.kanji || card?.title || 'Thẻ bài';
            const levelName = card?.level || '';
            const lessonNum = card?.lesson || 1;
            const isResolved = r.status === 'resolved';

            return (
              <div
                key={r.id}
                className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all ${
                  isResolved
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                {/* DÒNG 1: THÔNG TIN TỪ VỰNG & THỜI GIAN */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-slate-900 text-white shadow-sm">
                      {getCardTypeName(r.card_type)}
                    </span>
                    
                    <span className="text-[11px] font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                      {levelName ? `Cấp ${levelName} • ` : ''}Bài {lessonNum} • Từ: "{wordName}"
                    </span>

                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                      Lỗi: {getReportTypeName(r.report_type)}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 font-mono bg-white/80 px-2 py-0.5 rounded-md border border-slate-100">
                    🕒 {formatDateTime(r.created_at)}
                  </span>
                </div>

                {/* DÒNG 2: MÔ TẢ NỘI DUNG BÁO LỖI */}
                <p className="text-xs font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                  "{r.description || 'Không có mô tả chi tiết'}"
                </p>

                {/* DÒNG 3: NGƯỜI BÁO & CÁC NÚT HÀNH ĐỘNG */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <p className="text-[10px] text-slate-500 font-bold">
                    Báo bởi: <span className="text-slate-900 font-extrabold">{r.reporter_name}</span> ({r.reporter_email})
                  </p>

                  <div className="flex items-center gap-1.5">
                    {/* NÚT SỬA NGAY */}
                    <button
                      onClick={() => handleOpenEditFromReport(r)}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-[10px] shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                      title="Chỉnh sửa nội dung thẻ này trực tiếp"
                    >
                      <span>✏️</span> <span>Sửa Ngay</span>
                    </button>

                    {/* HIỂN THỊ NÚT "ĐÃ XONG" HOẶC BADGE "ĐÃ XỬ LÝ" */}
                    {!isResolved ? (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'resolved')}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Đánh dấu báo cáo này đã xử lý (Không cần sửa thẻ)"
                      >
                        ✔ Đã xong
                      </button>
                    ) : (
                      <span className="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-xl text-[10px] border border-emerald-300 flex items-center gap-1">
                        ✅ Đã xử lý
                      </span>
                    )}

                    {/* NÚT XÓA BÁO CÁO */}
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'delete')}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-[10px] hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL SỬA THẺ */}
      {editingCard && (
        <CardActionModals
          key={editingReportId || editingCard.id}
          currentCard={editingCard}
          cardType={editingCardType}
          userId={currentAdminId}
          isReportModalOpen={false}
          setIsReportModalOpen={() => {}}
          isEditModalOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
          onCardUpdated={async () => {
            if (editingReportId) {
              await handleUpdateStatus(editingReportId, 'resolved');
            }
            await fetchReports();
          }}
        />
      )}
    </div>
  );
}