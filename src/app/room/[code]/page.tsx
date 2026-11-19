'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import {
  fromBase64Url,
  toBase64Url,
  formatFileSize,
  formatTimeLeft,
  formatTrashExpiry,
  formatShortDateTime,
  isImageFile,
  isTextPreviewable,
  detectMessageType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  Room,
  RoomFile,
  RoomMessage,
  StreamItem,
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

  // Tab cho cột quản lý File/Thùng rác (Desktop và Drawer Mobile)
  const [fileHubTab, setFileHubTab] = useState<'files' | 'trash'>('files');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Dữ liệu File & Tin nhắn
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [trashFiles, setTrashFiles] = useState<RoomFile[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileItem[]>([]);

  // Input chat & Paste / Drag-and-drop
  const [inputText, setInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  // Modal xem nhanh File Text / Code (UTF-8)
  const [textPreviewModal, setTextPreviewModal] = useState<{
    fileName: string;
    content: string;
    fileSize: number;
    isLoading: boolean;
  } | null>(null);

  // Modal xem nhanh Ảnh (Lightbox)
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    fileName: string;
    url: string;
    fileSize: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const streamBottomRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // 1. Tính toán URL đầy đủ của phòng cho QR Code và Copy Link
  const fullRoomUrl = useMemo(() => {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://tmpnobi.vercel.app');
    const slug = toBase64Url(roomCode);
    return `${origin}/room/${slug}`;
  }, [roomCode]);

  // Cuộn xuống đáy stream
  const scrollToBottom = useCallback((smooth = true) => {
    streamBottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // 2. Tải thông tin phòng từ Supabase
  const loadRoom = useCallback(async () => {
    if (!roomCode) return;
    setIsLoadingRoom(true);

    try {
      let roomData: Room | null = null;
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .maybeSingle();

      if (data) {
        roomData = data as Room;
      } else if (rawCodeSlug && rawCodeSlug !== roomCode) {
        const fallback = await supabase
          .from('rooms')
          .select('*')
          .eq('code', rawCodeSlug)
          .maybeSingle();
        if (fallback.data) {
          roomData = fallback.data as Room;
        }
      }

      if (error) {
        console.error('Error fetching room:', error);
        toast.error('Lỗi khi tải dữ liệu phòng');
        return;
      }

      if (!roomData) {
        setRoomNotFound(true);
      } else {
        setRoom(roomData);
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

  // 3. Tải danh sách file và tin nhắn
  const fetchFiles = useCallback(async (roomId: string) => {
    try {
      const nowIso = new Date().toISOString();

      // File active
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

      // File trong thùng rác (< 30 ngày)
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

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('room_messages query note:', error.message);
        return;
      }
      setMessages((data as RoomMessage[]) || []);
    } catch (err) {
      console.warn('fetchMessages exception:', err);
    }
  }, []);

  useEffect(() => {
    if (room?.id) {
      fetchFiles(room.id);
      fetchMessages(room.id);
      fetch('/api/dropzone/cleanup', { method: 'POST' }).catch(() => {});
    }
  }, [room?.id, fetchFiles, fetchMessages]);

  // 4. Supabase Realtime Channel: Đồng bộ cả Files & Messages
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room_sync_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_files',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const nowIso = new Date().toISOString();

          if (payload.eventType === 'INSERT') {
            const newFile = payload.new as RoomFile;
            if (newFile.status === 'active' && newFile.expires_at > nowIso) {
              setFiles((prev) => (prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]));
              setTimeout(() => scrollToBottom(true), 100);
            } else if (newFile.status === 'trash') {
              setTrashFiles((prev) => (prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RoomFile;
            if (updated.status === 'active') {
              setTrashFiles((prev) => prev.filter((f) => f.id !== updated.id));
              if (updated.expires_at > nowIso) {
                setFiles((prev) => {
                  const exists = prev.some((f) => f.id === updated.id);
                  return exists ? prev.map((f) => (f.id === updated.id ? updated : f)) : [updated, ...prev];
                });
              } else {
                setFiles((prev) => prev.filter((f) => f.id !== updated.id));
              }
            } else if (updated.status === 'trash') {
              setFiles((prev) => prev.filter((f) => f.id !== updated.id));
              setTrashFiles((prev) => {
                const exists = prev.some((f) => f.id === updated.id);
                return exists ? prev.map((f) => (f.id === updated.id ? updated : f)) : [updated, ...prev];
              });
            } else if (updated.status === 'pending_delete') {
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as RoomMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => scrollToBottom(true), 100);
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setMessages((prev) => prev.filter((m) => m.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, scrollToBottom]);

  // 5. Làm mới khi chuyển tab trình duyệt
  useEffect(() => {
    if (!room?.id) return;

    const handleRecheck = () => {
      if (document.visibilityState === 'visible') {
        fetchFiles(room.id);
        fetchMessages(room.id);
      }
    };

    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);

    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [room?.id, fetchFiles, fetchMessages]);

  // 6. Đếm ngược tự hủy 15 phút tại Client cho file và tin nhắn
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      const expiredFiles: RoomFile[] = [];

      setFiles((prev) => {
        const remaining: RoomFile[] = [];
        for (const file of prev) {
          if (new Date(file.expires_at).getTime() <= currentTime) {
            expiredFiles.push(file);
          } else {
            remaining.push(file);
          }
        }
        return remaining;
      });

      // Tự động ẩn tin nhắn hết hạn
      setMessages((prev) => prev.filter((m) => new Date(m.expires_at).getTime() > currentTime));

      if (expiredFiles.length > 0) {
        const nowIso = new Date().toISOString();
        const expiredIds = expiredFiles.map((f) => f.id);

        setTrashFiles((prev) => [
          ...expiredFiles.map((f) => ({ ...f, status: 'trash' as const, deleted_at: nowIso })),
          ...prev,
        ]);

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

  // 7. Xử lý Upload file (Tải lên nhanh & Song song)
  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!room) return;

      const filesToUpload = Array.from(fileList);
      if (filesToUpload.length === 0) return;

      for (const file of filesToUpload) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`File "${file.name}" vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB!`);
          continue;
        }

        const tempId = crypto.randomUUID();
        const newUploadItem: UploadingFileItem = {
          id: tempId,
          name: file.name,
          size: file.size,
          progress: 25,
        };

        setUploadingFiles((prev) => [...prev, newUploadItem]);
        setTimeout(() => scrollToBottom(true), 50);

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

          toast.success(`Đã chia sẻ: ${file.name}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Thất bại';
          console.error('Upload failed:', err);
          toast.error(`Lỗi tải file "${file.name}": ${msg}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== tempId));
        }
      }
    },
    [room, scrollToBottom]
  );

  // 8. Xử lý Gửi tin nhắn Text / Link / Code
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!room || !inputText.trim() || isSendingMessage) return;

    const content = inputText.trim();
    const tempId = crypto.randomUUID();
    const msgType = detectMessageType(content);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    setInputText('');
    setIsSendingMessage(true);

    const optimisticMsg: RoomMessage = {
      id: tempId,
      room_id: room.id,
      room_code: room.code,
      content,
      message_type: msgType,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const { error } = await supabase.from('room_messages').insert({
        id: tempId,
        room_id: room.id,
        room_code: room.code,
        content,
        message_type: msgType,
        expires_at: expiresAt,
      });

      if (error) {
        console.error('Send message error:', error);
        toast.error('Chưa thể lưu tin nhắn (hãy đảm bảo đã chạy SQL tạo bảng room_messages trên Supabase)');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(content);
      } else {
        await supabase
          .from('rooms')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', room.id);
      }
    } catch (err: unknown) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(content);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 9. CƠ CHẾ TẢI FILE CHUẨN (Lấy file nhanh): Ép download header & không mở tab mới
  const handleDirectDownload = useCallback((file: RoomFile) => {
    if (file.status !== 'active') {
      toast.error('File đang trong thùng rác. Vui lòng khôi phục trước khi tải!');
      return;
    }
    const nowTime = Date.now();
    if (new Date(file.expires_at).getTime() <= nowTime) {
      toast.error('File đã hết hạn!');
      return;
    }

    try {
      const { data } = supabase.storage
        .from('dropzone')
        .getPublicUrl(file.storage_path, { download: file.file_name });

      if (!data?.publicUrl) {
        toast.error('Không tìm thấy đường link tải file!');
        return;
      }

      // Tải trực tiếp không mở tab mới
      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.setAttribute('download', file.file_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Đang tải về: ${file.file_name}`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải file');
    }
  }, []);

  // 10. XEM NHANH FILE (Quick Preview):
  // - File text / code: Fetch + TextDecoder('utf-8') chuẩn font tiếng Việt
  const handleOpenTextPreview = useCallback(async (file: RoomFile) => {
    setTextPreviewModal({
      fileName: file.file_name,
      content: '',
      fileSize: file.file_size,
      isLoading: true,
    });

    try {
      const { data } = supabase.storage.from('dropzone').getPublicUrl(file.storage_path);
      if (!data?.publicUrl) throw new Error('Không lấy được đường dẫn file');

      const res = await fetch(data.publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const decodedText = new TextDecoder('utf-8').decode(arrayBuffer);

      setTextPreviewModal({
        fileName: file.file_name,
        content: decodedText,
        fileSize: file.file_size,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      console.error('Preview text error:', err);
      toast.error('Lỗi khi đọc file dạng văn bản: ' + msg);
      setTextPreviewModal(null);
    }
  }, []);

  // - File ảnh: Mở Lightbox xem kích thước lớn
  const handleOpenImagePreview = useCallback((file: RoomFile) => {
    const { data } = supabase.storage.from('dropzone').getPublicUrl(file.storage_path);
    if (data?.publicUrl) {
      setImagePreviewModal({
        fileName: file.file_name,
        url: data.publicUrl,
        fileSize: file.file_size,
      });
    }
  }, []);

  // 11. HỖ TRỢ GLOBAL PASTE (Ctrl+V) & KÉO THẢ TOÀN MÀN HÌNH
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const filesToUpload: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(
              now.getMinutes()
            ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const ext = file.type.split('/')[1] || 'png';
            const renamed = new File(
              [file],
              file.name === 'image.png' ? `screenshot_${timeStr}.${ext}` : file.name,
              { type: file.type }
            );
            filesToUpload.push(renamed);
          }
        }
      }

      if (filesToUpload.length > 0) {
        e.preventDefault();
        toast('Đã dán ảnh từ bộ nhớ tạm, đang tải lên...', { icon: '📋' });
        handleUploadFiles(filesToUpload);
        return;
      }

      // Nếu người dùng không focus vào bất kỳ ô input/textarea nào và vừa paste 1 đoạn text
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (!isInputFocused) {
        const textData = e.clipboardData?.getData('text/plain');
        if (textData && textData.trim()) {
          e.preventDefault();
          setInputText((prev) => (prev ? prev + '\n' + textData : textData));
          chatInputRef.current?.focus();
          toast('Đã dán text vào thanh gửi', { icon: '✍️' });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUploadFiles]);

  // Full-screen Drag & Drop (Chống flicker overlay)
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        setIsWindowDragging(false);
        dragCounterRef.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleUploadFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleUploadFiles]);

  // 12. Quản lý Thùng rác & Gia hạn +15p
  const handleExtendExpiry = useCallback(async (file: RoomFile) => {
    if (file.status !== 'active') return;
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, expires_at: newExpiresAt } : f)));

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
  }, [room, fetchFiles]);

  const handleMoveToTrash = useCallback(async (file: RoomFile) => {
    const nowIso = new Date().toISOString();
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    setTrashFiles((prev) => [{ ...file, status: 'trash', deleted_at: nowIso }, ...prev]);

    try {
      const { error } = await supabase
        .from('room_files')
        .update({ status: 'trash', deleted_at: nowIso })
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
  }, [room, fetchFiles]);

  const handleRestoreFile = useCallback(async (file: RoomFile) => {
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    setTrashFiles((prev) => prev.filter((f) => f.id !== file.id));
    setFiles((prev) => [{ ...file, status: 'active', deleted_at: null, expires_at: newExpiresAt }, ...prev]);

    try {
      const { error } = await supabase
        .from('room_files')
        .update({ status: 'active', deleted_at: null, expires_at: newExpiresAt })
        .eq('id', file.id);

      if (error) {
        toast.error('Lỗi khi khôi phục');
        if (room) fetchFiles(room.id);
      } else {
        toast.success(`Đã khôi phục "${file.file_name}" (+15 phút)`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [room, fetchFiles]);

  const handlePermanentDelete = useCallback(async (file: RoomFile) => {
    if (!confirm(`Xóa vĩnh viễn "${file.file_name}"?`)) return;
    setTrashFiles((prev) => prev.filter((f) => f.id !== file.id));

    try {
      await supabase.from('room_files').update({ status: 'pending_delete' }).eq('id', file.id);
      await supabase.storage.from('dropzone').remove([file.storage_path]);
      await supabase.from('room_files').delete().eq('id', file.id);
      toast.success(`Đã xóa vĩnh viễn "${file.file_name}"`);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleEmptyTrash = useCallback(async () => {
    if (trashFiles.length === 0) return;
    if (!confirm(`Xóa vĩnh viễn toàn bộ ${trashFiles.length} file trong thùng rác?`)) return;

    const targets = [...trashFiles];
    setTrashFiles([]);

    try {
      const ids = targets.map((f) => f.id);
      const paths = targets.map((f) => f.storage_path).filter(Boolean);

      await supabase.from('room_files').update({ status: 'pending_delete' }).in('id', ids);
      if (paths.length > 0) {
        await supabase.storage.from('dropzone').remove(paths);
      }
      await supabase.from('room_files').delete().in('id', ids);
      toast.success('Đã dọn sạch thùng rác');
    } catch (err) {
      console.error(err);
      if (room) fetchFiles(room.id);
    }
  }, [trashFiles, room, fetchFiles]);

  const handleCopyLink = useCallback(() => {
    if (!fullRoomUrl) return;
    navigator.clipboard.writeText(fullRoomUrl);
    toast.success('Đã sao chép liên kết phòng!');
  }, [fullRoomUrl]);

  const handleCreateThisRoom = async () => {
    try {
      const { data, error } = await supabase.from('rooms').insert({ code: roomCode }).select().single();
      if (error) {
        toast.error(`Không thể tạo phòng: ${error.message}`);
        return;
      }
      toast.success(`Đã tạo phòng "${roomCode}" thành công!`);
      setRoom(data as Room);
      setRoomNotFound(false);
    } catch {
      toast.error('Lỗi kết nối máy chủ!');
    }
  };

  // 13. HỢP NHẤT DÒNG THỜI GIAN (UNIFIED STREAM): Sắp xếp file và tin nhắn theo thời gian tăng dần
  const streamItems: StreamItem[] = useMemo(() => {
    const list: StreamItem[] = [
      ...files.map((f) => ({ kind: 'file' as const, item: f })),
      ...messages.map((m) => ({ kind: 'message' as const, item: m })),
    ];
    return list.sort(
      (a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime()
    );
  }, [files, messages]);

  // Tự động cuộn xuống đáy khi có tin nhắn/file mới
  useEffect(() => {
    scrollToBottom(true);
  }, [streamItems.length, scrollToBottom]);

  if (isLoadingRoom) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Đang kết nối phòng chia sẻ...</p>
        </div>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-xs border border-slate-200/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl mx-auto text-slate-500">
            🔍
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Phòng chưa tồn tại</h2>
            <p className="text-xs text-slate-500">
              Mã phòng <span className="font-bold text-slate-800 font-mono">&quot;{roomCode}&quot;</span> chưa được tạo trên hệ thống.
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
    <div className="h-[100dvh] bg-slate-100 text-slate-800 flex flex-col font-sans select-none antialiased overflow-hidden">
      
      {/* 1. MÀN PHỦ KÉO THẢ TOÀN MÀN HÌNH (Full-screen Drag & Drop Overlay) */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mb-4 animate-bounce">
            📥
          </div>
          <h2 className="text-2xl font-black tracking-wide">Thả file vào bất kỳ đâu</h2>
          <p className="text-sm text-indigo-100 mt-1">Hệ thống sẽ tải lên và đồng bộ tức thì sang thiết bị kia</p>
        </div>
      )}

      {/* 2. TOP HEADER */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
            title="Về trang chủ"
          >
            ←
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-400">Phòng:</span>
            <span className="font-extrabold text-sm sm:text-base text-indigo-600 tracking-wider bg-indigo-50/90 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono">
              {roomCode}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Nút mở File Hub Drawer trên Mobile */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition active:scale-95"
          >
            <span>📁 Kho File</span>
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {files.length}
            </span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition active:scale-95"
            title="Sao chép liên kết phòng"
          >
            <span>Sao chép link</span>
          </button>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE (Desktop Split-view / Mobile 100dvh Unified Stream) */}
      <main className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto p-2 sm:p-4 gap-4">
        
        {/* ================= CỘT TRÁI (CHÍNH): UNIFIED STREAM ================= */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
          
          {/* Subheader: Gợi ý thao tác nhanh */}
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime kết nối</span>
            </div>
            <div className="hidden sm:flex items-center space-x-3 text-slate-400">
              <span>📋 Bấm <strong>Ctrl+V</strong> để dán ảnh/text</span>
              <span>•</span>
              <span>📥 Kéo thả file bất kỳ đâu</span>
            </div>
          </div>

          {/* Dòng thời gian duy nhất (Unified Stream) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 scroll-smooth">
            
            {streamItems.length === 0 && uploadingFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-2xl">
                  💬
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Chưa có nội dung nào trong phòng</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Gõ tin nhắn, dán ảnh chụp màn hình (Ctrl+V) hoặc kéo thả file vào đây để gửi tức thì.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {streamItems.map((item) => {
                  if (item.kind === 'message') {
                    const msg = item.item;
                    const isLink = msg.message_type === 'link';
                    const isCode = msg.message_type === 'code';

                    return (
                      <div key={msg.id} className="flex flex-col items-start space-y-1 max-w-[90%] sm:max-w-[75%]">
                        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs text-slate-800 text-xs sm:text-sm group relative">
                          
                          {/* Nút Copy 1 chạm nổi bật */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              toast.success('Đã sao chép nội dung!');
                            }}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/70 rounded transition"
                            title="Sao chép nội dung"
                          >
                            📋
                          </button>

                          <div className="pr-6">
                            {isLink ? (
                              <a
                                href={msg.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 font-semibold underline break-all flex items-center space-x-1"
                              >
                                <span>🔗</span>
                                <span>{msg.content}</span>
                              </a>
                            ) : isCode ? (
                              <pre className="font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap select-text">
                                {msg.content}
                              </pre>
                            ) : (
                              <p className="whitespace-pre-wrap break-words select-text leading-relaxed">
                                {msg.content}
                              </p>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                            <span>⏱ {formatShortDateTime(msg.created_at)}</span>
                            <span className="text-indigo-500 font-medium">Text</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Thẻ File trong Stream
                  const file = item.item;
                  const timerInfo = formatTimeLeft(file.expires_at);
                  const isImage = isImageFile(file.file_name, file.mime_type);
                  const isText = isTextPreviewable(file.file_name, file.mime_type);
                  const { data: publicData } = supabase.storage
                    .from('dropzone')
                    .getPublicUrl(file.storage_path);
                  const fileUrl = publicData?.publicUrl;

                  return (
                    <div key={file.id} className="flex flex-col items-start space-y-1 max-w-[92%] sm:max-w-[80%]">
                      <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs hover:border-slate-300 transition">
                        
                        {/* Header của File */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0">
                              {isImage ? '🖼' : '📄'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={file.file_name}>
                                {file.file_name}
                              </p>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span>•</span>
                                <span className="text-indigo-600 font-mono font-bold bg-indigo-50 px-1 rounded text-[10px]">
                                  ⏱ {timerInfo.text}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail ảnh xem nhanh ngay trong luồng */}
                        {isImage && fileUrl && (
                          <div
                            onClick={() => handleOpenImagePreview(file)}
                            className="mt-2.5 relative rounded-xl overflow-hidden cursor-pointer group bg-slate-100 border border-slate-200/70 max-h-56 flex items-center justify-center"
                          >
                            <img
                              src={fileUrl}
                              alt={file.file_name}
                              loading="lazy"
                              className="w-full h-auto object-cover max-h-56 group-hover:scale-[1.02] transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                              🔍 Bấm để phóng to
                            </div>
                          </div>
                        )}

                        {/* Các nút hành động trên thẻ file: Tải xuống trực tiếp + Xem nhanh + Xóa */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            {/* Nút Tải xuống chuẩn */}
                            <button
                              onClick={() => handleDirectDownload(file)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition active:scale-95 flex items-center space-x-1 shadow-2xs"
                              title="Tải trực tiếp về thư mục Download"
                            >
                              <span>📥 Tải về</span>
                            </button>

                            {/* Nút Xem nhanh (Text / Code) */}
                            {isText && (
                              <button
                                onClick={() => handleOpenTextPreview(file)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95"
                                title="Xem nội dung văn bản chuẩn tiếng Việt"
                              >
                                👁 Xem
                              </button>
                            )}

                            {/* Nút Gia hạn */}
                            <button
                              onClick={() => handleExtendExpiry(file)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition active:scale-95"
                              title="Gia hạn thêm 15 phút"
                            >
                              +15p
                            </button>
                          </div>

                          <button
                            onClick={() => handleMoveToTrash(file)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Chuyển vào thùng rác"
                          >
                            🗑
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}

                {/* Các file đang upload */}
                {uploadingFiles.map((up) => (
                  <div key={up.id} className="max-w-[85%] bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-900 truncate max-w-[200px]">{up.name}</span>
                      <span className="text-indigo-600 text-[11px] font-mono">{formatFileSize(up.size)}</span>
                    </div>
                    <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-200 animate-pulse"
                        style={{ width: `${up.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            <div ref={streamBottomRef} />
          </div>

          {/* Thanh nhập liệu ghim đáy (Sticky Bottom Input Bar) */}
          <div className="p-2.5 sm:p-3.5 bg-white border-t border-slate-200/80 flex items-end gap-2 flex-shrink-0 z-10">
            {/* Input file ẩn */}
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

            {/* Nút Kẹp ghim đính kèm File / Ảnh */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-base sm:text-lg transition active:scale-95 flex-shrink-0"
              title="Đính kèm file hoặc ảnh"
            >
              📎
            </button>

            {/* Khung gõ text */}
            <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-xl transition flex items-center px-3 py-1.5">
              <textarea
                ref={chatInputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Gõ tin nhắn, paste link hoặc Ctrl+V ảnh..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-28 overflow-y-auto"
              />
            </div>

            {/* Nút Gửi */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSendingMessage}
              className={`p-2 sm:p-2.5 rounded-xl text-white font-bold transition flex-shrink-0 active:scale-95 ${
                inputText.trim() && !isSendingMessage
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                  : 'bg-slate-300 cursor-not-allowed text-slate-100'
              }`}
              title="Gửi (Enter)"
            >
              ➤
            </button>
          </div>

        </div>

        {/* ================= CỘT PHẢI (DESKTOP): KHO FILE, QR & THÙNG RÁC ================= */}
        <div className="hidden lg:flex w-96 flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-shrink-0">
          
          {/* QR Code & Mã phòng */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-center space-y-2.5">
            <div className="p-2.5 bg-white border border-slate-200/70 rounded-xl inline-block shadow-2xs mx-auto">
              {fullRoomUrl && (
                <QRCodeSVG
                  value={fullRoomUrl}
                  size={120}
                  level="M"
                  includeMargin={false}
                  className="w-full h-auto max-w-[120px]"
                />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">Quét camera điện thoại để vào</p>
              <p className="text-[11px] text-slate-400 font-mono">Mã: {roomCode}</p>
            </div>
          </div>

          {/* Tab Navigation: File trong phòng vs Thùng rác */}
          <div className="border-b border-slate-100 px-3 pt-2 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setFileHubTab('files')}
                className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition ${
                  fileHubTab === 'files'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>Kho File</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded-full">
                  {files.length}
                </span>
              </button>

              <button
                onClick={() => setFileHubTab('trash')}
                className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition ${
                  fileHubTab === 'trash'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>Thùng rác</span>
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    trashFiles.length > 0
                      ? 'bg-amber-100 text-amber-700 font-bold'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {trashFiles.length}
                </span>
              </button>
            </div>

            {fileHubTab === 'trash' && trashFiles.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="text-[10px] font-bold text-rose-600 hover:underline mb-1"
              >
                Dọn sạch
              </button>
            )}
          </div>

          {/* Danh sách file trong Kho */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fileHubTab === 'files' ? (
              files.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-1">
                  <p className="text-xs font-medium">Chưa có file nào</p>
                  <p className="text-[11px] text-slate-400">Kéo thả file vào luồng để tải lên</p>
                </div>
              ) : (
                files.map((file) => {
                  const timerInfo = formatTimeLeft(file.expires_at);
                  return (
                    <div
                      key={file.id}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-bold font-mono">⏱ {timerInfo.text}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleDirectDownload(file)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold"
                          title="Tải về"
                        >
                          📥
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Xóa vào thùng rác"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : trashFiles.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <p className="text-xs font-medium">Thùng rác trống</p>
                <p className="text-[11px] text-slate-400">File xóa/hết hạn sẽ lưu ở đây 30 ngày</p>
              </div>
            ) : (
              trashFiles.map((file) => {
                const trashExpiry = formatTrashExpiry(file.deleted_at);
                return (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate line-through decoration-slate-300">
                        {file.file_name}
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">{trashExpiry.text}</p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleRestoreFile(file)}
                        className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md"
                        title="Khôi phục"
                      >
                        Khôi phục
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(file)}
                        className="p-1 text-rose-500 hover:bg-rose-50 text-xs rounded"
                        title="Xóa vĩnh viễn"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-100">
            💡 File tự hủy sau 15 phút. Bấm <strong>+15p</strong> trên thẻ file để gia hạn.
          </div>

        </div>

      </main>

      {/* 4. DRAWER / BOTTOM SHEET TRÊN MOBILE (Khi bấm nút "Kho File") */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Header Drawer */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-slate-900">Quản lý Kho File & QR</span>
                <span className="text-xs text-slate-400">({files.length} file)</span>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Nội dung Drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* QR Code trên mobile */}
              <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="p-2 bg-white rounded-xl inline-block mx-auto border border-slate-200">
                  {fullRoomUrl && <QRCodeSVG value={fullRoomUrl} size={110} level="M" />}
                </div>
                <p className="text-[11px] text-slate-500">Mã phòng: <strong className="font-mono">{roomCode}</strong></p>
              </div>

              {/* Danh sách file */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Danh sách file</h4>
                {files.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Chưa có file nào trong phòng</p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{file.file_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(file.file_size)}</p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDirectDownload(file)}
                          className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >
                          Tải về
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL XEM NHANH FILE TEXT / CODE (UTF-8 chuẩn) */}
      {textPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            onClick={() => setTextPreviewModal(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-slate-900 truncate" title={textPreviewModal.fileName}>
                  {textPreviewModal.fileName}
                </h3>
                <p className="text-[11px] text-slate-400">{formatFileSize(textPreviewModal.fileSize)} · UTF-8</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(textPreviewModal.content);
                    toast.success('Đã sao chép toàn bộ nội dung!');
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Sao chép hết
                </button>
                <button
                  onClick={() => setTextPreviewModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-900 text-slate-100 font-mono text-xs select-text leading-relaxed">
              {textPreviewModal.isLoading ? (
                <div className="py-12 text-center text-slate-400">Đang tải và giải mã nội dung UTF-8...</div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textPreviewModal.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL XEM NHANH ẢNH (LIGHTBOX) */}
      {imagePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            onClick={() => setImagePreviewModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center z-10">
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <span className="text-sm font-bold truncate max-w-xs sm:max-w-md">{imagePreviewModal.fileName}</span>
              <div className="flex items-center space-x-3">
                <a
                  href={imagePreviewModal.url}
                  download={imagePreviewModal.fileName}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  Tải ảnh gốc
                </a>
                <button
                  onClick={() => setImagePreviewModal(null)}
                  className="p-1 text-white/80 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            <img
              src={imagePreviewModal.url}
              alt={imagePreviewModal.fileName}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
