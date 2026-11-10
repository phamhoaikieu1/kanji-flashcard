'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import {
  fromBase64Url,
  toBase64Url,
  formatFileSize,
  formatTimeLeft,
  formatTrashExpiry,
  formatShortDateTime,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  Room,
  RoomFile,
} from '@/utils/dropzone';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

interface UploadingFileItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

export default function DropzoneRoomPage() {
  const router = useRouter();
  const params = useParams();
  const rawCodeSlug = (params?.code as string) || '';

  // Giải mã mã phòng gốc từ Base64URL
  const roomCode = fromBase64Url(rawCodeSlug);

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomNotFound, setRoomNotFound] = useState(false);

  // Tab hiện tại: 'files' (File đang hoạt động) hoặc 'trash' (Thùng rác)
  const [activeTab, setActiveTab] = useState<'files' | 'trash'>('files');

  const [files, setFiles] = useState<RoomFile[]>([]);
  const [trashFiles, setTrashFiles] = useState<RoomFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fullRoomUrl, setFullRoomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Tính toán URL đầy đủ của phòng cho QR Code và Copy Link
  useEffect(() => {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://tmpnobi.vercel.app');
    const slug = toBase64Url(roomCode);
    setFullRoomUrl(`${origin}/room/${slug}`);
  }, [roomCode]);

  // 2. Tải thông tin phòng từ Supabase (có Dual Fallback)
  const loadRoom = useCallback(async () => {
    if (!roomCode) return;
    setIsLoadingRoom(true);

    try {
      let { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .maybeSingle();

      // Fallback: nếu không tìm thấy theo roomCode và rawCodeSlug khác roomCode, thử tìm theo rawCodeSlug
      if (!data && rawCodeSlug && rawCodeSlug !== roomCode) {
        const fallback = await supabase
          .from('rooms')
          .select('*')
          .eq('code', rawCodeSlug)
          .maybeSingle();
        if (fallback.data) {
          data = fallback.data;
        }
      }

      if (error) {
        console.error('Error fetching room:', error);
        toast.error('Lỗi khi tải dữ liệu phòng');
        return;
      }

      if (!data) {
        setRoomNotFound(true);
      } else {
        setRoom(data as Room);
        setRoomNotFound(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể kết nối đến máy chủ');
    } finally {
      setIsLoadingRoom(false);
    }
  }, [roomCode, rawCodeSlug]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // 3. Tải danh sách file: File active và File trong Thùng rác (Trash)
  const fetchFiles = useCallback(async (roomId: string) => {
    try {
      const nowIso = new Date().toISOString();

      // Query 1: Lấy file active còn hạn
      const { data: activeData, error: activeErr } = await supabase
        .from('room_files')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (activeErr) {
        console.error('Error fetching active files:', activeErr);
      } else {
        setFiles((activeData as RoomFile[]) || []);
      }

      // Query 2: Lấy file trong thùng rác (chưa quá 30 ngày)
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: trashData, error: trashErr } = await supabase
        .from('room_files')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'trash')
        .gt('deleted_at', thirtyDaysAgoIso)
        .order('deleted_at', { ascending: false });

      if (trashErr) {
        console.error('Error fetching trash files:', trashErr);
      } else {
        setTrashFiles((trashData as RoomFile[]) || []);
      }
    } catch (err) {
      console.error('Fetch files error:', err);
    }
  }, []);

  useEffect(() => {
    if (room?.id) {
      fetchFiles(room.id);
      // Gọi ngầm endpoint dọn dẹp để kích hoạt chuyển file hết hạn sang rác và xóa rác quá 30 ngày
      fetch('/api/dropzone/cleanup', { method: 'POST' }).catch(() => {});
    }
  }, [room?.id, fetchFiles]);

  // 4. Supabase Realtime Channel: Đồng bộ tức thì trên tất cả thiết bị
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room_files_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'room_files',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const nowIso = new Date().toISOString();

          if (payload.eventType === 'INSERT') {
            const newFile = payload.new as RoomFile;
            if (newFile.status === 'active' && newFile.expires_at > nowIso) {
              setFiles((prev) => {
                if (prev.some((f) => f.id === newFile.id)) return prev;
                return [newFile, ...prev];
              });
            } else if (newFile.status === 'trash') {
              setTrashFiles((prev) => {
                if (prev.some((f) => f.id === newFile.id)) return prev;
                return [newFile, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RoomFile;

            if (updated.status === 'active') {
              // Xóa khỏi trash (nếu có)
              setTrashFiles((prev) => prev.filter((f) => f.id !== updated.id));

              if (updated.expires_at > nowIso) {
                // Cập nhật hoặc thêm vào danh sách active
                setFiles((prev) => {
                  const exists = prev.some((f) => f.id === updated.id);
                  if (exists) {
                    return prev.map((f) => (f.id === updated.id ? updated : f));
                  }
                  return [updated, ...prev];
                });
              } else {
                // Đã hết hạn -> xóa khỏi active
                setFiles((prev) => prev.filter((f) => f.id !== updated.id));
              }
            } else if (updated.status === 'trash') {
              // Chuyển từ active sang trash
              setFiles((prev) => prev.filter((f) => f.id !== updated.id));
              setTrashFiles((prev) => {
                const exists = prev.some((f) => f.id === updated.id);
                if (exists) {
                  return prev.map((f) => (f.id === updated.id ? updated : f));
                }
                return [updated, ...prev];
              });
            } else if (updated.status === 'pending_delete') {
              // Bị xóa vĩnh viễn
              setFiles((prev) => prev.filter((f) => f.id !== updated.id));
              setTrashFiles((prev) => prev.filter((f) => f.id !== updated.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setFiles((prev) => prev.filter((f) => f.id !== oldId));
              setTrashFiles((prev) => prev.filter((f) => f.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // 5. Tự động làm mới dữ liệu khi quay lại tab (Visibility & Window Focus)
  useEffect(() => {
    if (!room?.id) return;

    const handleRecheck = () => {
      if (document.visibilityState === 'visible') {
        fetchFiles(room.id);
      }
    };

    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);

    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [room?.id, fetchFiles]);

  // 6. Đồng hồ đếm ngược từng giây tại Client: Tự động chuyển file hết hạn vào Thùng rác
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const expiredFiles: RoomFile[] = [];

      setFiles((prev) => {
        const remaining: RoomFile[] = [];
        for (const file of prev) {
          if (new Date(file.expires_at).getTime() <= now) {
            expiredFiles.push(file);
          } else {
            remaining.push(file);
          }
        }
        return remaining;
      });

      // Nếu có file vừa chạm mốc hết hạn 15 phút, tự động chuyển vào Thùng rác và đồng bộ
      if (expiredFiles.length > 0) {
        const nowIso = new Date().toISOString();
        const expiredIds = expiredFiles.map((f) => f.id);

        // Optimistic update vào trash
        setTrashFiles((prev) => [
          ...expiredFiles.map((f) => ({ ...f, status: 'trash' as const, deleted_at: nowIso })),
          ...prev,
        ]);

        // Cập nhật database
        supabase
          .from('room_files')
          .update({ status: 'trash', deleted_at: nowIso })
          .in('id', expiredIds)
          .then(({ error }) => {
            if (error) console.warn('Auto move to trash error:', error);
          });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 7. Xử lý Upload file
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!room) return;

    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;

    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File "${file.name}" vượt quá dung lượng tối đa ${MAX_FILE_SIZE_MB}MB!`);
        continue;
      }

      const tempId = crypto.randomUUID();
      const newUploadItem: UploadingFileItem = {
        id: tempId,
        name: file.name,
        size: file.size,
        progress: 10,
      };

      setUploadingFiles((prev) => [...prev, newUploadItem]);

      try {
        const storagePath = `${room.id}/${tempId}`;

        const { error: uploadError } = await supabase.storage
          .from('dropzone')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setUploadingFiles((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, progress: 85 } : item))
        );

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        const { error: dbError } = await supabase.from('room_files').insert({
          id: tempId,
          room_id: room.id,
          room_code: room.code,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          status: 'active',
          expires_at: expiresAt,
        });

        if (dbError) throw dbError;

        await supabase
          .from('rooms')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', room.id);

        toast.success(`Đã tải lên: ${file.name}`);
      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`Lỗi khi tải file "${file.name}": ${err?.message || 'Thất bại'}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((item) => item.id !== tempId));
      }
    }
  };

  // 8. Xử lý Tải xuống file (Chỉ cho phép file đang active và còn hạn)
  const handleDownload = (file: RoomFile) => {
    if (file.status !== 'active') {
      toast.error('File đang trong thùng rác. Vui lòng khôi phục trước khi tải xuống!');
      return;
    }
    if (new Date(file.expires_at).getTime() <= Date.now()) {
      toast.error('File đã hết hạn!');
      return;
    }

    try {
      const { data } = supabase.storage.from('dropzone').getPublicUrl(file.storage_path);
      if (!data?.publicUrl) {
        toast.error('Không tìm thấy đường link tải file!');
        return;
      }

      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.download = file.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải xuống');
    }
  };

  // 9. Tính năng 1: GIA HẠN FILE (+15 PHÚT)
  const handleExtendExpiry = async (file: RoomFile) => {
    if (file.status !== 'active') {
      toast.error('Không thể gia hạn file trong thùng rác!');
      return;
    }
    if (new Date(file.expires_at).getTime() <= Date.now()) {
      toast.error('File đã hết hạn, không thể gia hạn!');
      return;
    }

    // Đặt expires_at = thời điểm hiện tại + 15 phút
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Optimistic update
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, expires_at: newExpiresAt } : f))
    );

    try {
      const { error } = await supabase
        .from('room_files')
        .update({ expires_at: newExpiresAt })
        .eq('id', file.id);

      if (error) {
        toast.error('Lỗi khi gia hạn file');
        if (room) fetchFiles(room.id);
      } else {
        toast.success(`Đã gia hạn +15 phút cho "${file.file_name}"`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi gia hạn');
    }
  };

  // 10. Tính năng 2A: CHUYỂN VÀO THÙNG RÁC (khi bấm nút Xóa ở danh sách chính)
  const handleMoveToTrash = async (file: RoomFile) => {
    const nowIso = new Date().toISOString();

    // Optimistic update: xóa khỏi files, thêm vào trashFiles
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    const trashedFile: RoomFile = {
      ...file,
      status: 'trash',
      deleted_at: nowIso,
    };
    setTrashFiles((prev) => [trashedFile, ...prev]);

    try {
      const { error } = await supabase
        .from('room_files')
        .update({
          status: 'trash',
          deleted_at: nowIso,
        })
        .eq('id', file.id);

      if (error) {
        toast.error('Lỗi khi chuyển vào thùng rác');
        if (room) fetchFiles(room.id);
      } else {
        toast.success(`Đã chuyển "${file.file_name}" vào thùng rác`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối');
    }
  };

  // 11. Tính năng 2B: KHÔI PHỤC FILE TỪ THÙNG RÁC
  const handleRestoreFile = async (file: RoomFile) => {
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Optimistic: xóa khỏi trash, đưa vào active files kèm 15 phút mới
    setTrashFiles((prev) => prev.filter((f) => f.id !== file.id));
    const restoredFile: RoomFile = {
      ...file,
      status: 'active',
      deleted_at: null,
      expires_at: newExpiresAt,
    };
    setFiles((prev) => [restoredFile, ...prev]);

    try {
      const { error } = await supabase
        .from('room_files')
        .update({
          status: 'active',
          deleted_at: null,
          expires_at: newExpiresAt,
        })
        .eq('id', file.id);

      if (error) {
        toast.error('Lỗi khi khôi phục file');
        if (room) fetchFiles(room.id);
      } else {
        toast.success(`Đã khôi phục "${file.file_name}" (+15 phút mới)`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối');
    }
  };

  // 12. Tính năng 2C: XÓA VĨNH VIỄN 1 FILE TRONG THÙNG RÁC
  const handlePermanentDelete = async (file: RoomFile) => {
    if (!confirm(`Xóa vĩnh viễn "${file.file_name}" khỏi hệ thống? Không thể khôi phục.`)) return;

    // Optimistic
    setTrashFiles((prev) => prev.filter((f) => f.id !== file.id));

    try {
      // Đánh dấu pending_delete trước
      await supabase
        .from('room_files')
        .update({ status: 'pending_delete' })
        .eq('id', file.id);

      // Xóa file khỏi Storage
      const { error: storageError } = await supabase.storage
        .from('dropzone')
        .remove([file.storage_path]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
      }

      // Xóa metadata DB
      const { error: dbError } = await supabase
        .from('room_files')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        console.error('DB delete error:', dbError);
      }

      toast.success(`Đã xóa vĩnh viễn "${file.file_name}"`);
    } catch (err) {
      console.error('Permanent delete error:', err);
      toast.error('Lỗi khi xóa file, hệ thống sẽ tự động thử lại sau');
    }
  };

  // 13. Tính năng 2D: DỌN SẠCH THÙNG RÁC
  const handleEmptyTrash = async () => {
    if (trashFiles.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn toàn bộ ${trashFiles.length} file trong thùng rác?`)) return;

    const targets = [...trashFiles];
    setTrashFiles([]);

    try {
      const ids = targets.map((f) => f.id);
      const paths = targets.map((f) => f.storage_path).filter(Boolean);

      // Đánh dấu pending_delete
      await supabase
        .from('room_files')
        .update({ status: 'pending_delete' })
        .in('id', ids);

      // Xóa Storage
      if (paths.length > 0) {
        await supabase.storage.from('dropzone').remove(paths);
      }

      // Xóa DB
      await supabase
        .from('room_files')
        .delete()
        .in('id', ids);

      toast.success('Đã dọn sạch thùng rác');
    } catch (err) {
      console.error('Empty trash error:', err);
      toast.error('Lỗi khi dọn thùng rác');
      if (room) fetchFiles(room.id);
    }
  };

  // 14. Copy Link phòng
  const handleCopyLink = () => {
    if (!fullRoomUrl) return;
    navigator.clipboard.writeText(fullRoomUrl);
    toast.success('Đã sao chép liên kết phòng vào bộ nhớ tạm!');
  };

  // Xử lý tạo phòng nhanh nếu phòng chưa tồn tại
  const handleCreateThisRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({ code: roomCode })
        .select()
        .single();

      if (error) {
        toast.error(`Không thể tạo phòng: ${error.message}`);
        return;
      }

      toast.success(`Đã tạo phòng "${roomCode}" thành công!`);
      setRoom(data as Room);
      setRoomNotFound(false);
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ!');
    }
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Đang vào phòng chia sẻ...</p>
        </div>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-xs border border-slate-200/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl mx-auto text-slate-500">
            🔍
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Phòng chưa tồn tại</h2>
            <p className="text-xs text-slate-500">
              Mã phòng <span className="font-bold text-slate-800 font-mono">"{roomCode}"</span> chưa được tạo trên hệ thống.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleCreateThisRoom}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-95"
            >
              + Tạo phòng này ngay
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
              title="Về trang chủ"
            >
              ←
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Phòng:</span>
              <span className="font-extrabold text-base text-indigo-600 tracking-wider bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100/60 font-mono">
                {roomCode}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <span>Sao chép link</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cột Trái & Giữa: Vùng Upload & Danh sách file / Thùng rác */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Vùng Dropzone Upload (Chỉ hiển thị khi ở tab 'files') */}
            {activeTab === 'files' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) {
                    handleUploadFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center cursor-pointer transition-all duration-150 ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
                    : 'border-slate-300/80 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-xs'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleUploadFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                <div className="space-y-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg mx-auto">
                    📤
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Kéo thả file vào đây hoặc <span className="text-indigo-600 underline">chọn từ thiết bị</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tối đa {MAX_FILE_SIZE_MB}MB mỗi file · Tự hủy sau 15 phút
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tiến trình Upload */}
            {uploadingFiles.length > 0 && (
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Đang tải lên ({uploadingFiles.length})
                </h4>
                {uploadingFiles.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">{item.name}</span>
                      <span className="text-slate-400 text-[11px]">{formatFileSize(item.size)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 animate-pulse"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Card Danh sách file & Thùng rác */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              
              {/* Tab Navigation Header */}
              <div className="border-b border-slate-100 px-4 pt-3 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                      activeTab === 'files'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>File trong phòng</span>
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-slate-200/70 text-slate-600 rounded-full">
                      {files.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('trash')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                      activeTab === 'trash'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Thùng rác</span>
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      trashFiles.length > 0
                        ? 'bg-amber-100 text-amber-700 font-extrabold'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {trashFiles.length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 pb-2">
                  {activeTab === 'trash' && trashFiles.length > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md transition active:scale-95"
                      title="Xóa vĩnh viễn toàn bộ thùng rác"
                    >
                      Dọn sạch thùng rác
                    </button>
                  )}

                  <button
                    onClick={() => room && fetchFiles(room.id)}
                    className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                    title="Làm mới"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Tab 1: File đang hoạt động */}
              {activeTab === 'files' && (
                <div className="p-4 sm:p-5">
                  {files.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 space-y-1">
                      <p className="text-xs font-medium">Chưa có file nào trong phòng</p>
                      <p className="text-[11px] text-slate-400">Kéo thả file ở trên để chia sẻ ngay</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {files.map((file) => {
                        const timerInfo = formatTimeLeft(file.expires_at);

                        return (
                          <div
                            key={file.id}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0 text-slate-500">
                                📄
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                                  {file.file_name}
                                </p>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span>•</span>
                                  <span className="inline-flex items-center space-x-1 font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                                    <span>⏱ {timerInfo.text}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Các nút hành động: Tải xuống, Gia hạn +15p, Xóa (vào rác) */}
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleDownload(file)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Tải file"
                              >
                                Tải
                              </button>

                              <button
                                onClick={() => handleExtendExpiry(file)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Gia hạn thêm 15 phút tồn tại"
                              >
                                +15p
                              </button>

                              <button
                                onClick={() => handleMoveToTrash(file)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Chuyển vào thùng rác"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Thùng rác (Trash) */}
              {activeTab === 'trash' && (
                <div className="p-4 sm:p-5">
                  {trashFiles.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 space-y-1">
                      <p className="text-xs font-medium">Thùng rác trống</p>
                      <p className="text-[11px] text-slate-400">
                        File xóa thủ công hoặc hết hạn 15 phút sẽ được giữ ở đây trong 30 ngày
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {trashFiles.map((file) => {
                        const trashExpiry = formatTrashExpiry(file.deleted_at);

                        return (
                          <div
                            key={file.id}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm flex-shrink-0 text-amber-600">
                                🗑
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate line-through decoration-slate-300" title={file.file_name}>
                                  {file.file_name}
                                </p>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span>•</span>
                                  <span className="text-slate-400">
                                    Xóa: {formatShortDateTime(file.deleted_at || file.created_at)}
                                  </span>
                                  <span>•</span>
                                  <span className="text-amber-700 font-medium">
                                    {trashExpiry.text}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Các nút hành động trong Thùng rác: Khôi phục & Xóa vĩnh viễn */}
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleRestoreFile(file)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Khôi phục file và gia hạn 15 phút mới"
                              >
                                Khôi phục
                              </button>

                              <button
                                onClick={() => handlePermanentDelete(file)}
                                className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Xóa vĩnh viễn khỏi Storage và Database"
                              >
                                Xóa vĩnh viễn
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* Cột Phải: QR Code & Thông tin chia sẻ */}
          <div className="space-y-5">
            
            {/* Thẻ QR Code */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs text-center space-y-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-sm">Quét mã vào phòng</h3>
                <p className="text-[11px] text-slate-400">
                  Dùng camera điện thoại để truy cập tức thì
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-xl inline-block shadow-2xs mx-auto">
                {fullRoomUrl && (
                  <QRCodeSVG
                    value={fullRoomUrl}
                    size={160}
                    level="M"
                    includeMargin={false}
                    className="w-full h-auto max-w-[160px]"
                  />
                )}
              </div>

              {/* Thông tin phòng & Copy */}
              <div className="space-y-1.5 pt-1">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500 truncate mr-2 text-[11px]" title={fullRoomUrl}>
                    {fullRoomUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-indigo-600 font-bold hover:underline text-[11px] flex-shrink-0"
                  >
                    Sao chép
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                  <span>Mã:</span>
                  <strong className="text-slate-700 font-mono font-bold">{roomCode}</strong>
                  <span>(phân biệt hoa/thường)</span>
                </div>
              </div>
            </div>

            {/* Thông tin thùng rác & gia hạn */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5 text-[11px] text-slate-500 space-y-1.5">
              <div className="font-semibold text-slate-700 flex items-center space-x-1">
                <span>💡</span>
                <span>Lưu ý về file & thùng rác</span>
              </div>
              <ul className="space-y-1 text-slate-500 pl-4 list-disc">
                <li>Bấm <strong>+15p</strong> để gia hạn thời gian tồn tại của file.</li>
                <li>File hết hạn hoặc bị xóa sẽ được lưu trong <strong>Thùng rác 30 ngày</strong> trước khi xóa vĩnh viễn.</li>
                <li>Mọi thao tác gia hạn, khôi phục hoặc xóa đều được đồng bộ Realtime.</li>
              </ul>
            </div>

          </div>

        </div>
      </main>

      <div className="py-4" />
    </div>
  );
}
