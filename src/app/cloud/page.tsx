'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { lockScreen } from '@/utils/deviceManager';
import {
  formatFileSize,
  formatTrashExpiry,
  formatTimeOnly,
  formatShortDateTime,
  formatDateDivider,
  formatDateKey,
  removeVietnameseTones,
  isImageFile,
  getFileIcon,
  isTextPreviewable,
  isTableContent,
  detectMessageType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  RoomFile,
  RoomMessage,
  StreamItem,
  TrashItem,
} from '@/utils/dropzone';
import toast from 'react-hot-toast';

interface UploadingFileItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

// Component Highlight từ khóa tìm kiếm (hỗ trợ tiếng Việt không dấu)
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const cleanQ = removeVietnameseTones(query);
  const cleanText = removeVietnameseTones(text);
  if (!cleanText.includes(cleanQ)) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let startIdx = 0;
  const qLen = cleanQ.length;
  let matchPos = cleanText.indexOf(cleanQ, startIdx);

  while (matchPos !== -1) {
    if (matchPos > startIdx) {
      parts.push(text.slice(startIdx, matchPos));
    }
    parts.push(
      <mark key={matchPos} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
        {text.slice(matchPos, matchPos + qLen)}
      </mark>
    );
    startIdx = matchPos + qLen;
    matchPos = cleanText.indexOf(cleanQ, startIdx);
  }

  if (startIdx < text.length) {
    parts.push(text.slice(startIdx));
  }

  return <>{parts}</>;
}

export default function NobiCloudPage() {
  const router = useRouter();

  // Auth User & Profile
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Tab cho cột quản lý File / Thùng rác (Desktop và Drawer Mobile)
  const [fileHubTab, setFileHubTab] = useState<'files' | 'trash'>('files');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Dữ liệu File & Tin nhắn
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [trashFiles, setTrashFiles] = useState<RoomFile[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [trashMessages, setTrashMessages] = useState<RoomMessage[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileItem[]>([]);

  // Phân trang tải thêm mục cũ
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Bộ lọc & Tìm kiếm "Cực nhạy" (Instant Search)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'file' | 'link' | 'code'>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline'); // Cho chip Ảnh
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Smart Collapse: Danh sách các tin nhắn đã mở rộng "Xem thêm"
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  // Jump to Date & Custom Mini Calendar
  const [isJumpDateOpen, setIsJumpDateOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn & Nút "Mới nhất"
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isInitialScrolledRef = useRef(false);
  const userScrolledUpRef = useRef(false);

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
  const streamScrollRef = useRef<HTMLDivElement>(null);
  const streamBottomRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const oldestTimestampRef = useRef<string | null>(null);

  // Cuộn xuống đáy stream (hỗ trợ behavior: 'auto' | 'smooth' hoặc boolean cũ)
  const scrollToBottom = useCallback((behavior: ScrollBehavior | boolean = 'auto') => {
    const scrollBehavior: ScrollBehavior =
      typeof behavior === 'boolean' ? (behavior ? 'smooth' : 'auto') : behavior;

    if (streamScrollRef.current) {
      if (scrollBehavior === 'auto') {
        streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
      } else {
        streamScrollRef.current.scrollTo({
          top: streamScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    } else {
      streamBottomRef.current?.scrollIntoView({ behavior: scrollBehavior });
    }
  }, []);

  // Xử lý khi ảnh trong luồng tải xong: giữ vị trí ở đáy nếu người dùng chưa cuộn lên
  const handleImageLoad = useCallback(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom('auto');
    }
  }, [scrollToBottom]);

  // Xử lý nút bấm cuộn xuống tin nhắn mới nhất
  const handleScrollToLatest = useCallback(() => {
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // 1. Tải danh sách file và tin nhắn ban đầu theo user_id
  const fetchInitialData = useCallback(async (userId: string) => {
    try {
      // 1. File Active của user
      const { data: activeFilesData, error: activeFilesErr } = await supabase
        .from('room_files')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeFilesErr) {
        console.error('Error fetching files:', activeFilesErr);
      } else {
        setFiles((activeFilesData as RoomFile[]) || []);
      }

      // 2. File trong Thùng rác (< 30 ngày)
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: trashFilesData, error: trashFilesErr } = await supabase
        .from('room_files')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'trash')
        .gt('deleted_at', thirtyDaysAgoIso)
        .order('deleted_at', { ascending: false });

      if (trashFilesErr) {
        console.error('Error fetching trash files:', trashFilesErr);
      } else {
        setTrashFiles((trashFilesData as RoomFile[]) || []);
      }

      // 3. Tin nhắn Active của user
      const { data: messagesData, error: messagesErr } = await supabase
        .from('room_messages')
        .select('*')
        .eq('user_id', userId)
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesErr) {
        console.warn('room_messages query note:', messagesErr.message);
      } else {
        const reversedMsgs = ((messagesData as RoomMessage[]) || []).reverse();
        setMessages(reversedMsgs);
      }

      // 4. Tin nhắn trong Thùng rác (< 30 ngày)
      try {
        const { data: trashMsgsData } = await supabase
          .from('room_messages')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'trash')
          .gt('deleted_at', thirtyDaysAgoIso)
          .order('deleted_at', { ascending: false });
        if (trashMsgsData) {
          setTrashMessages(trashMsgsData as RoomMessage[]);
        }
      } catch {
        // Chưa có cột status sẽ bỏ qua
      }

      // Cập nhật timestamp mục cũ nhất để phân trang
      const allTimestamps: number[] = [];
      (activeFilesData || []).forEach((f) => allTimestamps.push(new Date(f.created_at).getTime()));
      (messagesData || []).forEach((m) => allTimestamps.push(new Date(m.created_at).getTime()));

      if (allTimestamps.length > 0) {
        const minTime = Math.min(...allTimestamps);
        oldestTimestampRef.current = new Date(minTime).toISOString();
      }
    } catch (err) {
      console.error('Fetch initial data error:', err);
    }
  }, []);

  // 2. Auth Guard: Bắt buộc đăng nhập tài khoản
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      setIsLoadingAuth(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Vui lòng đăng nhập để truy cập Nobi Cloud!');
        router.push('/login');
        return;
      }

      if (isMounted) {
        setCurrentUser(user);
        // Tải profile của user
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (profile) setUserProfile(profile);

        await fetchInitialData(user.id);
        setIsLoadingAuth(false);
        fetch('/api/dropzone/cleanup', { method: 'POST' }).catch(() => {});
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, [router, fetchInitialData]);

  // Tự động cuộn xuống đáy khi khởi tạo dữ liệu lần đầu xong
  useEffect(() => {
    if (!isLoadingAuth && !isInitialScrolledRef.current) {
      isInitialScrolledRef.current = true;
      // Cuộn tức thì không animation ở lần mở đầu tiên
      scrollToBottom('auto');
      const rafId = requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      const timer = setTimeout(() => {
        if (!userScrolledUpRef.current) {
          scrollToBottom('auto');
        }
      }, 80);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [isLoadingAuth, scrollToBottom]);

  // 3. Tải thêm dữ liệu cũ hơn khi cuộn lên đỉnh (Pagination)
  const loadMoreOldData = useCallback(async () => {
    if (!currentUser?.id || !oldestTimestampRef.current || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const scrollContainer = streamScrollRef.current;
    const prevScrollHeight = scrollContainer?.scrollHeight || 0;
    const prevScrollTop = scrollContainer?.scrollTop || 0;

    try {
      const beforeIso = oldestTimestampRef.current;

      const [olderFilesRes, olderMessagesRes] = await Promise.all([
        supabase
          .from('room_files')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .lt('created_at', beforeIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('room_messages')
          .select('*')
          .eq('user_id', currentUser.id)
          .or('status.eq.active,status.is.null')
          .lt('created_at', beforeIso)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const olderFiles = (olderFilesRes.data as RoomFile[]) || [];
      const olderMessages = (olderMessagesRes.data as RoomMessage[]) || [];

      if (olderFiles.length === 0 && olderMessages.length === 0) {
        setHasMore(false);
      } else {
        if (olderFiles.length > 0) {
          setFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newOnes = olderFiles.filter((f) => !existingIds.has(f.id));
            return [...prev, ...newOnes];
          });
        }

        if (olderMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = olderMessages.filter((m) => !existingIds.has(m.id)).reverse();
            return [...newOnes, ...prev];
          });
        }

        const newTimestamps: number[] = [];
        olderFiles.forEach((f) => newTimestamps.push(new Date(f.created_at).getTime()));
        olderMessages.forEach((m) => newTimestamps.push(new Date(m.created_at).getTime()));

        if (newTimestamps.length > 0) {
          const minTime = Math.min(...newTimestamps);
          oldestTimestampRef.current = new Date(minTime).toISOString();
        }

        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentUser?.id, isLoadingMore, hasMore]);

  // Xử lý sự kiện scroll: Tải thêm mục cũ khi lên đỉnh & Hiển thị nút "↓ Mới nhất" khi cuộn ngược lên
  const handleStreamScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      if (target.scrollTop < 60 && hasMore && !isLoadingMore) {
        loadMoreOldData();
      }

      // Kiểm tra khoảng cách tới đáy: nếu cách đáy > 300px thì hiển thị nút cuộn xuống
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceFromBottom > 300) {
        setShowScrollBottomBtn(true);
        userScrolledUpRef.current = true;
      } else {
        setShowScrollBottomBtn(false);
        userScrolledUpRef.current = false;
      }
    },
    [loadMoreOldData, hasMore, isLoadingMore]
  );

  // 4. Supabase Realtime Channel: Chỉ lắng nghe thay đổi của đúng user_id hiện tại
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`nobi_cloud_user_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_files',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFile = payload.new as RoomFile;
            if (newFile.status === 'active') {
              setFiles((prev) => (prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]));
              setTimeout(() => {
                if (!userScrolledUpRef.current) scrollToBottom('smooth');
              }, 100);
            } else if (newFile.status === 'trash') {
              setTrashFiles((prev) => (prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RoomFile;
            if (updated.status === 'active') {
              setTrashFiles((prev) => prev.filter((f) => f.id !== updated.id));
              setFiles((prev) => {
                const exists = prev.some((f) => f.id === updated.id);
                return exists ? prev.map((f) => (f.id === updated.id ? updated : f)) : [updated, ...prev];
              });
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
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as RoomMessage;
            if (newMsg.status !== 'trash' && newMsg.status !== 'pending_delete') {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              setTimeout(() => {
                if (!userScrolledUpRef.current) scrollToBottom('smooth');
              }, 100);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RoomMessage;
            if (updated.status === 'trash') {
              setMessages((prev) => prev.filter((m) => m.id !== updated.id));
              setTrashMessages((prev) => [updated, ...prev.filter((m) => m.id !== updated.id)]);
            } else if (updated.status === 'active' || !updated.status) {
              setTrashMessages((prev) => prev.filter((m) => m.id !== updated.id));
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === updated.id);
                return exists ? prev.map((m) => (m.id === updated.id ? updated : m)) : [...prev, updated];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setMessages((prev) => prev.filter((m) => m.id !== oldId));
              setTrashMessages((prev) => prev.filter((m) => m.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, scrollToBottom]);

  // 5. Xử lý Upload file gắn chặt với user_id
  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!currentUser?.id) return;

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
        userScrolledUpRef.current = false;
        setShowScrollBottomBtn(false);
        setTimeout(() => scrollToBottom('smooth'), 50);

        try {
          const storagePath = `users/${currentUser.id}/${tempId}`;

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

          const { error: dbError } = await supabase.from('room_files').insert({
            id: tempId,
            user_id: currentUser.id,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            status: 'active',
            expires_at: null,
          });

          if (dbError) throw dbError;

          toast.success(`Đã lưu trữ: ${file.name}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Thất bại';
          console.error('Upload failed:', err);
          toast.error(`Lỗi tải file "${file.name}": ${msg}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== tempId));
        }
      }
    },
    [currentUser?.id, scrollToBottom]
  );

  // 6. Xử lý Gửi tin nhắn gắn chặt với user_id
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.id || !inputText.trim() || isSendingMessage) return;

    const content = inputText.trim();
    const tempId = crypto.randomUUID();
    const msgType = detectMessageType(content);

    setInputText('');
    setIsSendingMessage(true);

    const optimisticMsg: RoomMessage = {
      id: tempId,
      user_id: currentUser.id,
      content,
      message_type: msgType,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const { error } = await supabase.from('room_messages').insert({
        id: tempId,
        user_id: currentUser.id,
        content,
        message_type: msgType,
        status: 'active',
        expires_at: null,
      });

      if (error) {
        console.error('Send message error:', error);
        toast.error('Lỗi khi gửi tin nhắn');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(content);
      }
    } catch (err: unknown) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(content);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 7. Tải file trực tiếp
  const handleDirectDownload = useCallback((file: RoomFile) => {
    if (file.status !== 'active') {
      toast.error('File đang trong thùng rác. Vui lòng khôi phục trước khi tải!');
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

  // 8. Xem nhanh Text / Code UTF-8
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

  // 9. Xem nhanh ảnh (Lightbox)
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

  // 10. Global Paste (Ctrl+V) & Kéo thả
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
        toast('Đã dán ảnh, đang tải lên Nobi Cloud...', { icon: '📋' });
        handleUploadFiles(filesToUpload);
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (!isInputFocused) {
        const textData = e.clipboardData?.getData('text/plain');
        if (textData && textData.trim()) {
          e.preventDefault();
          setInputText((prev) => (prev ? prev + '\n' + textData : textData));
          chatInputRef.current?.focus();
          toast('Đã dán text vào khung chat', { icon: '✍️' });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUploadFiles]);

  // Kéo thả toàn màn hình
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

    const handleDragOver = (e: DragEvent) => e.preventDefault();

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

  // 11. Quản lý Thùng rác (Soft Delete)
  const handleMoveFileToTrash = useCallback(async (file: RoomFile) => {
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
        if (currentUser?.id) fetchInitialData(currentUser.id);
      } else {
        toast.success(`Đã chuyển file "${file.file_name}" vào thùng rác`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.id, fetchInitialData]);

  const handleMoveMessageToTrash = useCallback(async (msg: RoomMessage) => {
    const nowIso = new Date().toISOString();
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setTrashMessages((prev) => [{ ...msg, status: 'trash', deleted_at: nowIso }, ...prev]);

    try {
      const { error } = await supabase
        .from('room_messages')
        .update({ status: 'trash', deleted_at: nowIso })
        .eq('id', msg.id);

      if (error) {
        toast.error('Lỗi khi xóa tin nhắn');
        if (currentUser?.id) fetchInitialData(currentUser.id);
      } else {
        toast.success('Đã chuyển tin nhắn vào thùng rác');
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.id, fetchInitialData]);

  const handleRestoreFile = useCallback(async (file: RoomFile) => {
    setTrashFiles((prev) => prev.filter((f) => f.id !== file.id));
    setFiles((prev) => [{ ...file, status: 'active', deleted_at: null }, ...prev]);

    try {
      const { error } = await supabase
        .from('room_files')
        .update({ status: 'active', deleted_at: null })
        .eq('id', file.id);

      if (error) {
        toast.error('Lỗi khi khôi phục');
        if (currentUser?.id) fetchInitialData(currentUser.id);
      } else {
        toast.success(`Đã khôi phục file "${file.file_name}"`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.id, fetchInitialData]);

  const handleRestoreMessage = useCallback(async (msg: RoomMessage) => {
    setTrashMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setMessages((prev) => [...prev, { ...msg, status: 'active', deleted_at: null }]);

    try {
      const { error } = await supabase
        .from('room_messages')
        .update({ status: 'active', deleted_at: null })
        .eq('id', msg.id);

      if (error) {
        toast.error('Lỗi khi khôi phục tin nhắn');
        if (currentUser?.id) fetchInitialData(currentUser.id);
      } else {
        toast.success('Đã khôi phục tin nhắn');
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.id, fetchInitialData]);

  const handlePermanentDeleteFile = useCallback(async (file: RoomFile) => {
    if (!confirm(`Xóa vĩnh viễn file "${file.file_name}"?`)) return;
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

  const handlePermanentDeleteMessage = useCallback(async (msg: RoomMessage) => {
    if (!confirm('Xóa vĩnh viễn tin nhắn này?')) return;
    setTrashMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      await supabase.from('room_messages').delete().eq('id', msg.id);
      toast.success('Đã xóa vĩnh viễn tin nhắn');
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleEmptyTrash = useCallback(async () => {
    const totalTrash = trashFiles.length + trashMessages.length;
    if (totalTrash === 0) return;
    if (!confirm(`Xóa vĩnh viễn toàn bộ ${totalTrash} mục trong thùng rác?`)) return;

    const targetFiles = [...trashFiles];
    const targetMsgs = [...trashMessages];
    setTrashFiles([]);
    setTrashMessages([]);

    try {
      if (targetFiles.length > 0) {
        const fileIds = targetFiles.map((f) => f.id);
        const paths = targetFiles.map((f) => f.storage_path).filter(Boolean);
        await supabase.from('room_files').update({ status: 'pending_delete' }).in('id', fileIds);
        if (paths.length > 0) {
          await supabase.storage.from('dropzone').remove(paths);
        }
        await supabase.from('room_files').delete().in('id', fileIds);
      }

      if (targetMsgs.length > 0) {
        const msgIds = targetMsgs.map((m) => m.id);
        await supabase.from('room_messages').delete().in('id', msgIds);
      }

      toast.success('Đã dọn sạch thùng rác');
    } catch (err) {
      console.error(err);
      if (currentUser?.id) fetchInitialData(currentUser.id);
    }
  }, [trashFiles, trashMessages, currentUser?.id, fetchInitialData]);

  // 12. Smart Collapse: Bật/tắt xem thêm tin nhắn dài
  const toggleExpandMessage = useCallback((id: string) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 13. Hợp nhất Dòng thời gian & Lọc & Tìm kiếm "Cực nhạy"
  const allStreamItems: StreamItem[] = useMemo(() => {
    const list: StreamItem[] = [
      ...files.map((f) => ({ kind: 'file' as const, item: f })),
      ...messages.map((m) => ({ kind: 'message' as const, item: m })),
    ];
    return list.sort(
      (a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime()
    );
  }, [files, messages]);

  // Lọc theo Dải chip lọc 1 chạm
  const filteredByChipItems = useMemo(() => {
    return allStreamItems.filter((streamItem) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'image') {
        return streamItem.kind === 'file' && isImageFile(streamItem.item.file_name, streamItem.item.mime_type);
      }
      if (activeFilter === 'file') {
        return streamItem.kind === 'file' && !isImageFile(streamItem.item.file_name, streamItem.item.mime_type);
      }
      if (activeFilter === 'link') {
        return streamItem.kind === 'message' && streamItem.item.message_type === 'link';
      }
      if (activeFilter === 'code') {
        return (
          streamItem.kind === 'message' &&
          (streamItem.item.message_type === 'code' || isTableContent(streamItem.item.content))
        );
      }
      return true;
    });
  }, [allStreamItems, activeFilter]);

  // Lọc theo Tìm kiếm tức thì
  const finalStreamItems = useMemo(() => {
    const cleanQ = removeVietnameseTones(searchQuery);
    if (!cleanQ) return filteredByChipItems;

    return filteredByChipItems.filter((streamItem) => {
      if (streamItem.kind === 'file') {
        return removeVietnameseTones(streamItem.item.file_name).includes(cleanQ);
      } else {
        return removeVietnameseTones(streamItem.item.content).includes(cleanQ);
      }
    });
  }, [filteredByChipItems, searchQuery]);

  // Danh sách ID kết quả tìm kiếm
  const searchResultIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return finalStreamItems.map((it) => it.item.id);
  }, [finalStreamItems, searchQuery]);

  // Điều hướng kết quả tìm kiếm
  const handleJumpSearchResult = useCallback(
    (direction: 'next' | 'prev') => {
      if (searchResultIds.length === 0) return;
      let nextIndex = activeSearchIndex;
      if (direction === 'next') {
        nextIndex = (activeSearchIndex + 1) % searchResultIds.length;
      } else {
        nextIndex = (activeSearchIndex - 1 + searchResultIds.length) % searchResultIds.length;
      }
      setActiveSearchIndex(nextIndex);
      const targetId = searchResultIds[nextIndex];
      const targetEl = document.getElementById(`stream-item-${targetId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => targetEl.classList.remove('ring-2', 'ring-indigo-500'), 1500);
      }
    },
    [searchResultIds, activeSearchIndex]
  );

  // Phân nhóm dòng thời gian theo ngày
  const groupedTimeline = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: StreamItem[] }> = [];
    const map = new Map<string, StreamItem[]>();

    for (const item of finalStreamItems) {
      const key = formatDateKey(item.item.created_at);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    map.forEach((items, key) => {
      const firstItem = items[0];
      const label = formatDateDivider(firstItem.item.created_at);
      groups.push({ key, label, items });
    });

    return groups;
  }, [finalStreamItems]);

  // 1. Click Outside & ESC listener để đóng Popover lịch thông minh
  useEffect(() => {
    if (!isJumpDateOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(e.target as Node)) {
        setIsJumpDateOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsJumpDateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJumpDateOpen]);

  // 2. Map số lượng mục theo từng ngày YYYY-MM-DD
  const dateItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of finalStreamItems) {
      const key = formatDateKey(item.item.created_at);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [finalStreamItems]);

  // 3. Danh sách các năm khả dụng (dữ liệu thực tế + năm hiện tại)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear]);
    dateItemCounts.forEach((_, key) => {
      const y = parseInt(key.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    // Biên độ năm xung quanh để chọn
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear + 1);
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [dateItemCounts]);

  // Chuyển tháng trước / tháng sau
  const handlePrevMonth = useCallback(() => {
    setCalendarMonth((prevMonth) => {
      if (prevMonth === 0) {
        setCalendarYear((prevYear) => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarMonth((prevMonth) => {
      if (prevMonth === 11) {
        setCalendarYear((prevYear) => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  }, []);

  // Tính toán ma trận các ngày trong tháng (tuần bắt đầu từ Thứ Hai T2 -> CN)
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    // Tuần bắt đầu từ Thứ 2: T2 (0), T3 (1), ..., CN (6)
    const startPadding = (firstDay + 6) % 7;

    const days: Array<{ day: number; dateKey: string } | null> = [];

    // Ô trống đệm đầu tháng
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Các ngày trong tháng
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
      days.push({ day: d, dateKey });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  // Nhảy tới ngày và tự động đóng lịch
  const handleJumpToDate = useCallback((dateKey: string) => {
    setIsJumpDateOpen(false);
    const dateEl = document.getElementById(`date-group-${dateKey}`);
    if (dateEl) {
      dateEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      toast('Không tìm thấy mục nào trong ngày này', { icon: 'ℹ️' });
    }
  }, []);

  // Toggle mở lịch và đồng bộ năm/tháng
  const handleToggleCalendar = useCallback(() => {
    if (!isJumpDateOpen) {
      // Khi mở lịch, chuyển về năm/tháng hiện tại
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
    }
    setIsJumpDateOpen((prev) => !prev);
  }, [isJumpDateOpen]);

  // Tổng hợp Thùng rác
  const allTrashItems: TrashItem[] = useMemo(() => {
    const list: TrashItem[] = [
      ...trashFiles.map((f) => ({ kind: 'file' as const, item: f })),
      ...trashMessages.map((m) => ({ kind: 'message' as const, item: m })),
    ];
    return list.sort(
      (a, b) =>
        new Date(b.item.deleted_at || b.item.created_at).getTime() -
        new Date(a.item.deleted_at || a.item.created_at).getTime()
    );
  }, [trashFiles, trashMessages]);

  const userDisplayName =
    userProfile?.full_name ||
    userProfile?.display_name ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'Người dùng';

  if (isLoadingAuth) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Đang đồng bộ Nobi Cloud cá nhân...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-100 text-slate-800 flex flex-col font-sans select-none antialiased overflow-hidden">
      
      {/* 1. MÀN PHỦ KÉO THẢ TOÀN MÀN HÌNH */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mb-4 animate-bounce">
            ☁️
          </div>
          <h2 className="text-2xl font-black tracking-wide">Thả file vào Nobi Cloud</h2>
          <p className="text-sm text-indigo-100 mt-1">Lưu trữ vĩnh viễn vào tài khoản cá nhân của bạn</p>
        </div>
      )}

      {/* 2. TOP HEADER */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition flex items-center space-x-1"
            title="Về trang học tập"
          >
            <span>←</span>
            <span className="text-xs font-bold hidden sm:inline">Học tập</span>
          </button>
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-2 sm:pl-3">
            <span className="text-xl">☁️</span>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  Nobi Cloud
                </span>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cá nhân
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[200px]">
                {currentUser?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Nút khóa nhanh màn hình */}
          <button
            type="button"
            onClick={() => lockScreen()}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-xl text-xs font-bold transition active:scale-95"
            title="Khóa màn hình"
          >
            <span>🔒</span>
            <span className="hidden sm:inline">Khóa màn hình</span>
          </button>

          {/* Avatar Người dùng */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-black overflow-hidden flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userDisplayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 truncate max-w-[100px] hidden md:inline">
              {userDisplayName}
            </span>
          </div>

          {/* Nút mở File Hub Drawer trên Mobile */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition active:scale-95"
          >
            <span>📁 Kho & Rác</span>
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {files.length}
            </span>
            {allTrashItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Thùng rác có mục lưu" />
            )}
          </button>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto p-2 sm:p-4 gap-4">
        
        {/* ================= CỘT TRÁI (CHÍNH): TIMELINE NOBI CLOUD ================= */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
          
          {/* THANH TÌM KIẾM & BỘ LỌC ĐA TẦNG GHIM CỐ ĐỊNH TRÊN ĐẦU */}
          <div className="border-b border-slate-100 bg-slate-50/80 p-2 sm:p-3 space-y-2 flex-shrink-0 z-20">
            
            {/* Hàng 1: Ô tìm kiếm tức thì (Instant Search) + Jump to Date */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-2.5 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveSearchIndex(0);
                  }}
                  placeholder="Tìm tin nhắn, code, file trong Nobi Cloud (gõ không dấu)..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-16 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
                {searchQuery && (
                  <div className="absolute right-2 flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400 mr-1">
                      {searchResultIds.length > 0 ? `${activeSearchIndex + 1}/${searchResultIds.length}` : '0'}
                    </span>
                    <button
                      onClick={() => handleJumpSearchResult('prev')}
                      disabled={searchResultIds.length === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                      title="Kết quả trước"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleJumpSearchResult('next')}
                      disabled={searchResultIds.length === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                      title="Kết quả tiếp theo"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-700 text-xs"
                      title="Xóa tìm kiếm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Nút Nhảy đến ngày & Popover Lịch Mini thông minh */}
              <div ref={calendarPopoverRef} className="relative">
                <button
                  onClick={handleToggleCalendar}
                  className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs ${
                    isJumpDateOpen
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Chọn ngày trên lịch"
                >
                  <span>📅</span>
                  <span className="hidden sm:inline">Lịch ngày</span>
                </button>

                {isJumpDateOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-1.5rem)]">
                    
                    {/* Header Lịch: Mũi tên chuyển tháng < >, Select Tháng & Năm */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-1">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-bold transition active:scale-90"
                        title="Tháng trước"
                      >
                        ◀
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <select
                          value={calendarMonth}
                          onChange={(e) => setCalendarMonth(Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>
                              Tháng {i + 1}
                            </option>
                          ))}
                        </select>

                        <select
                          value={calendarYear}
                          onChange={(e) => setCalendarYear(Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {availableYears.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-bold transition active:scale-90"
                        title="Tháng sau"
                      >
                        ▶
                      </button>
                    </div>

                    {/* Hàng thứ trong tuần (T2 đến CN) */}
                    <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center text-[10px] font-bold text-slate-400">
                      <span>T2</span>
                      <span>T3</span>
                      <span>T4</span>
                      <span>T5</span>
                      <span>T6</span>
                      <span>T7</span>
                      <span className="text-rose-500">CN</span>
                    </div>

                    {/* Lưới các ô ngày trong tháng */}
                    <div className="grid grid-cols-7 gap-1 py-1">
                      {calendarDays.map((item, index) => {
                        if (!item) {
                          return <div key={`empty-${index}`} className="h-8" />;
                        }

                        const { day, dateKey } = item;
                        const count = dateItemCounts.get(dateKey) || 0;
                        const hasData = count > 0;

                        const now = new Date();
                        const todayKey = formatDateKey(now.toISOString());
                        const isToday = dateKey === todayKey;

                        return (
                          <button
                            key={dateKey}
                            disabled={!hasData}
                            onClick={() => handleJumpToDate(dateKey)}
                            title={
                              hasData
                                ? `${count} mục vào ngày ${day}/${calendarMonth + 1}/${calendarYear}`
                                : 'Không có dữ liệu'
                            }
                            className={`h-8 rounded-lg flex flex-col items-center justify-center text-xs transition relative ${
                              hasData
                                ? 'bg-indigo-50 text-indigo-700 font-extrabold hover:bg-indigo-600 hover:text-white border border-indigo-200/80 shadow-2xs cursor-pointer active:scale-95'
                                : 'text-slate-300 cursor-default font-normal'
                            } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                          >
                            <span className="leading-none">{day}</span>
                            {hasData && (
                              <span className="w-1 h-1 rounded-full bg-indigo-600 group-hover:bg-white mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Lịch: Về hôm nay & Tổng số ngày */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => {
                          const now = new Date();
                          const todayKey = formatDateKey(now.toISOString());
                          setCalendarYear(now.getFullYear());
                          setCalendarMonth(now.getMonth());
                          if (dateItemCounts.has(todayKey)) {
                            handleJumpToDate(todayKey);
                          } else {
                            toast('Hôm nay chưa có dữ liệu lưu trữ', { icon: 'ℹ️' });
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1 active:scale-95 transition"
                      >
                        <span>⚡ Về hôm nay</span>
                      </button>

                      <span className="text-[10px] text-slate-400">
                        {dateItemCounts.size} ngày có dữ liệu
                      </span>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* Hàng 2: Dải chip lọc 1 chạm */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <div className="flex items-center space-x-1.5">
                {[
                  { key: 'all' as const, label: '🌐 Tất cả' },
                  { key: 'image' as const, label: '🖼️ Ảnh' },
                  { key: 'file' as const, label: '📄 File' },
                  { key: 'link' as const, label: '🔗 Link' },
                  { key: 'code' as const, label: '💻 Code / Bảng' },
                ].map((chip) => {
                  const isActive = activeFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => setActiveFilter(chip.key)}
                      className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition flex-shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Chuyển đổi View Lưới khi lọc Ảnh */}
              {activeFilter === 'image' && (
                <div className="flex items-center space-x-1 flex-shrink-0 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      viewMode === 'timeline' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Chế độ dòng thời gian"
                  >
                    Dòng chảy
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Chế độ Lưới (Bộ sưu tập)"
                  >
                    Lưới ảnh
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* DÒNG CHẢY NỘI DUNG CHÍNH (TIMELINE) */}
          <div
            ref={streamScrollRef}
            onScroll={handleStreamScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 relative"
          >
            {isLoadingMore && (
              <div className="flex items-center justify-center py-2 text-xs text-indigo-600 font-semibold space-x-1.5 animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Đang tải các ngày trước...</span>
              </div>
            )}

            {finalStreamItems.length === 0 && uploadingFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl text-indigo-600">
                  ☁️
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Nobi Cloud cá nhân đang sẵn sàng'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {searchQuery
                      ? 'Thử thay đổi từ khóa hoặc bộ lọc phía trên.'
                      : 'Lưu trữ vĩnh viễn hình ảnh, tài liệu và văn bản. Bấm Ctrl+V hoặc kéo thả để tải lên.'}
                  </p>
                </div>
              </div>
            ) : activeFilter === 'image' && viewMode === 'grid' ? (
              /* CHẾ ĐỘ LƯỚI BỘ SƯU TẬP ẢNH */
              <div className="space-y-6">
                {groupedTimeline.map((group) => {
                  const imageFiles = group.items.filter(
                    (it) => it.kind === 'file' && isImageFile(it.item.file_name, it.item.mime_type)
                  );
                  if (imageFiles.length === 0) return null;

                  return (
                    <div key={group.key} className="space-y-2">
                      <div className="text-xs font-bold text-slate-600 bg-slate-100/90 px-3 py-1 rounded-lg inline-block">
                        {group.label} ({imageFiles.length} ảnh)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {imageFiles.map((it) => {
                          const file = it.item as RoomFile;
                          const { data: pubData } = supabase.storage.from('dropzone').getPublicUrl(file.storage_path);
                          const imgUrl = pubData?.publicUrl;

                          return (
                            <div
                              key={file.id}
                              onClick={() => handleOpenImagePreview(file)}
                              className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition"
                            >
                              {imgUrl && (
                                <img
                                  src={imgUrl}
                                  alt={file.file_name}
                                  loading="lazy"
                                  onLoad={handleImageLoad}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end text-white">
                                <p className="text-[11px] font-bold truncate">{file.file_name}</p>
                                <p className="text-[9px] text-slate-300 font-mono">{formatFileSize(file.file_size)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* CHẾ ĐỘ TIMELINE CHÍNH THEO NGÀY */
              groupedTimeline.map((group) => (
                <div key={group.key} id={`date-group-${group.key}`} className="space-y-3">
                  
                  {/* Sticky Date Divider */}
                  <div className="sticky top-2 z-10 flex justify-center my-3 pointer-events-none">
                    <span className="bg-slate-200/95 backdrop-blur-md text-slate-700 text-xs font-bold px-3.5 py-1 rounded-full shadow-2xs border border-slate-300/70 pointer-events-auto">
                      {group.label}
                    </span>
                  </div>

                  {/* Danh sách mục trong ngày */}
                  {group.items.map((streamItem) => {
                    const isMessage = streamItem.kind === 'message';

                    if (isMessage) {
                      const msg = streamItem.item as RoomMessage;
                      const isLink = msg.message_type === 'link';
                      const isCode = msg.message_type === 'code';
                      const isTable = isTableContent(msg.content);

                      const lineCount = msg.content.split('\n').length;
                      const isLongContent = lineCount > 6 || msg.content.length > 350;
                      const isExpanded = expandedMessageIds.has(msg.id);

                      return (
                        <div
                          key={msg.id}
                          id={`stream-item-${msg.id}`}
                          className={`flex flex-col items-start space-y-1 transition duration-150 ${
                            isTable || isCode ? 'w-full max-w-[96%] sm:max-w-[85%]' : 'max-w-[90%] sm:max-w-[75%]'
                          }`}
                        >
                          <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs text-slate-800 text-xs sm:text-sm group relative">
                            
                            {/* Actions: Copy & Xóa vào thùng rác */}
                            <div className="absolute top-2 right-2 flex items-center space-x-1 z-10 opacity-70 group-hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  toast.success('Đã sao chép toàn bộ nội dung!');
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/70 rounded transition"
                                title="Sao chép nội dung"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleMoveMessageToTrash(msg)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Chuyển vào thùng rác"
                              >
                                🗑
                              </button>
                            </div>

                            {/* Khung nội dung */}
                            <div className="pr-14">
                              {isLink ? (
                                <a
                                  href={msg.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 font-semibold underline break-all flex items-center space-x-1"
                                >
                                  <span>🔗</span>
                                  <span>
                                    <HighlightedText text={msg.content} query={searchQuery} />
                                  </span>
                                </a>
                              ) : isCode ? (
                                <div className="relative">
                                  <div
                                    className={`relative ${
                                      isLongContent && !isExpanded ? 'max-h-36 overflow-hidden' : ''
                                    }`}
                                  >
                                    <pre className="font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap select-text">
                                      <HighlightedText text={msg.content} query={searchQuery} />
                                    </pre>
                                    {isLongContent && !isExpanded && (
                                      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none rounded-b-xl" />
                                    )}
                                  </div>
                                  {isLongContent && (
                                    <button
                                      onClick={() => toggleExpandMessage(msg.id)}
                                      className="mt-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                                    >
                                      <span>
                                        {isExpanded
                                          ? '⌃ Thu gọn'
                                          : `⌄ Xem thêm (${lineCount > 6 ? `còn ${lineCount - 6} dòng` : 'đầy đủ'})`}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : isTable ? (
                                <div className="relative">
                                  <div
                                    className={`relative ${
                                      isLongContent && !isExpanded ? 'max-h-36 overflow-hidden' : ''
                                    }`}
                                  >
                                    <pre
                                      className="font-mono text-xs bg-slate-900/95 text-slate-100 p-3 sm:p-3.5 rounded-xl overflow-x-auto whitespace-pre select-text leading-relaxed border border-slate-800 shadow-inner"
                                      style={{ tabSize: 4 }}
                                    >
                                      <HighlightedText text={msg.content} query={searchQuery} />
                                    </pre>
                                    {isLongContent && !isExpanded && (
                                      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none rounded-b-xl" />
                                    )}
                                  </div>
                                  {isLongContent && (
                                    <button
                                      onClick={() => toggleExpandMessage(msg.id)}
                                      className="mt-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                                    >
                                      <span>
                                        {isExpanded
                                          ? '⌃ Thu gọn'
                                          : `⌄ Xem thêm (${lineCount > 6 ? `còn ${lineCount - 6} dòng` : 'đầy đủ'})`}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="relative">
                                  <div
                                    className={`relative ${
                                      isLongContent && !isExpanded ? 'max-h-36 overflow-hidden' : ''
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words select-text leading-relaxed">
                                      <HighlightedText text={msg.content} query={searchQuery} />
                                    </p>
                                    {isLongContent && !isExpanded && (
                                      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none" />
                                    )}
                                  </div>
                                  {isLongContent && (
                                    <button
                                      onClick={() => toggleExpandMessage(msg.id)}
                                      className="mt-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                                    >
                                      <span>
                                        {isExpanded
                                          ? '⌃ Thu gọn'
                                          : `⌄ Xem thêm (${lineCount > 6 ? `còn ${lineCount - 6} dòng` : 'đầy đủ'})`}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                              <span>⏱ {formatTimeOnly(msg.created_at)}</span>
                              <span className="text-indigo-500 font-medium">
                                {isTable ? '📊 Bảng' : isCode ? '💻 Code' : isLink ? '🔗 Link' : '💬 Text'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Render Thẻ File / Ảnh trong Stream
                    const file = streamItem.item as RoomFile;
                    const isImage = isImageFile(file.file_name, file.mime_type);
                    const isText = isTextPreviewable(file.file_name, file.mime_type);
                    const { data: pubData } = supabase.storage.from('dropzone').getPublicUrl(file.storage_path);
                    const fileUrl = pubData?.publicUrl;

                    return (
                      <div
                        key={file.id}
                        id={`stream-item-${file.id}`}
                        className="flex flex-col items-start space-y-1 max-w-[92%] sm:max-w-[80%] transition duration-150"
                      >
                        <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:border-slate-300 transition group">
                          
                          {/* Header của File */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0">
                                {getFileIcon(file.file_name, file.mime_type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={file.file_name}>
                                  <HighlightedText text={file.file_name} query={searchQuery} />
                                </p>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span>•</span>
                                  <span>⏱ {formatTimeOnly(file.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleMoveFileToTrash(file)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Chuyển vào thùng rác"
                            >
                              🗑
                            </button>
                          </div>

                          {/* Thumbnail ảnh xem nhanh ngay trong luồng */}
                          {isImage && fileUrl && (
                            <div
                              onClick={() => handleOpenImagePreview(file)}
                              className="mt-2.5 relative rounded-xl overflow-hidden cursor-pointer group/img bg-slate-100 border border-slate-200/70 max-h-64 flex items-center justify-center"
                            >
                              <img
                                src={fileUrl}
                                alt={file.file_name}
                                loading="lazy"
                                onLoad={handleImageLoad}
                                className="w-full h-auto object-cover max-h-64 group-hover/img:scale-[1.02] transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                🔍 Bấm để phóng to
                              </div>
                            </div>
                          )}

                          {/* Các nút hành động trên thẻ file */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleDirectDownload(file)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition active:scale-95 flex items-center space-x-1 shadow-2xs"
                                title="Tải về máy tính / điện thoại"
                              >
                                <span>📥 Tải về</span>
                              </button>

                              {isText && (
                                <button
                                  onClick={() => handleOpenTextPreview(file)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95"
                                  title="Xem văn bản UTF-8"
                                >
                                  👁 Xem
                                </button>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400">Đã lưu trữ Nobi Cloud</span>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}

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

            <div ref={streamBottomRef} />
          </div>

          {/* Nút tròn nổi: Cuộn xuống tin nhắn mới nhất */}
          {showScrollBottomBtn && (
            <button
              onClick={handleScrollToLatest}
              className="absolute bottom-20 right-4 sm:right-6 z-20 flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg border border-indigo-500/30 text-xs font-bold transition-all animate-in fade-in slide-in-from-bottom-2 duration-150"
              title="Cuộn xuống tin nhắn mới nhất"
            >
              <span className="text-sm font-black">↓</span>
              <span>Mới nhất</span>
            </button>
          )}

          {/* THANH NHẬP LIỆU GHIM ĐÁY */}
          <div className="p-2.5 sm:p-3.5 bg-white border-t border-slate-200/80 flex items-end gap-2 flex-shrink-0 z-10">
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

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-base sm:text-lg transition active:scale-95 flex-shrink-0"
              title="Đính kèm file hoặc ảnh lên Nobi Cloud"
            >
              📎
            </button>

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
                placeholder="Nhập tin nhắn, link, dán bảng Excel hoặc Ctrl+V ảnh..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-28 overflow-y-auto"
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSendingMessage}
              className={`p-2 sm:p-2.5 rounded-xl text-white font-bold transition flex-shrink-0 active:scale-95 ${
                inputText.trim() && !isSendingMessage
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                  : 'bg-slate-300 cursor-not-allowed text-slate-100'
              }`}
              title="Lưu vào Nobi Cloud (Enter)"
            >
              ➤
            </button>
          </div>

        </div>

        {/* ================= CỘT PHẢI (DESKTOP): KHO FILE & THÙNG RÁC 30 NGÀY ================= */}
        <div className="hidden lg:flex w-96 flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-shrink-0">
          
          {/* Thông tin tài khoản Nobi Cloud */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-sm overflow-hidden flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                '☁️'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{userDisplayName}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser?.email}</p>
            </div>
          </div>

          {/* Tab Navigation: File trong Cloud vs Thùng rác */}
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
                    allTrashItems.length > 0
                      ? 'bg-amber-100 text-amber-700 font-bold'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {allTrashItems.length}
                </span>
              </button>
            </div>

            {fileHubTab === 'trash' && allTrashItems.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="text-[10px] font-bold text-rose-600 hover:underline mb-1"
              >
                Dọn sạch
              </button>
            )}
          </div>

          {/* Danh sách Kho File / Thùng rác */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fileHubTab === 'files' ? (
              files.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-1">
                  <p className="text-xs font-medium">Chưa có file nào trong Nobi Cloud</p>
                  <p className="text-[11px] text-slate-400">Kéo thả file vào khung chat để tải lên</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-base">{getFileIcon(file.file_name, file.mime_type)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{formatShortDateTime(file.created_at)}</span>
                        </div>
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
                        onClick={() => handleMoveFileToTrash(file)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Xóa vào thùng rác"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : allTrashItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <p className="text-xs font-medium">Thùng rác trống</p>
                <p className="text-[11px] text-slate-400">Mục đã xóa sẽ lưu ở đây trong 30 ngày</p>
              </div>
            ) : (
              allTrashItems.map((trashItem) => {
                const isMsg = trashItem.kind === 'message';
                const item = trashItem.item;
                const trashExpiry = formatTrashExpiry(item.deleted_at);

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">{isMsg ? '💬' : '📄'}</span>
                        <p className="text-xs font-bold text-slate-800 truncate line-through decoration-slate-300">
                          {isMsg ? (item as RoomMessage).content : (item as RoomFile).file_name}
                        </p>
                      </div>
                      <p className="text-[10px] text-amber-700 mt-0.5">{trashExpiry.text}</p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          isMsg
                            ? handleRestoreMessage(item as RoomMessage)
                            : handleRestoreFile(item as RoomFile)
                        }
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md"
                        title="Khôi phục"
                      >
                        Khôi phục
                      </button>
                      <button
                        onClick={() =>
                          isMsg
                            ? handlePermanentDeleteMessage(item as RoomMessage)
                            : handlePermanentDeleteFile(item as RoomFile)
                        }
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
            ☁️ Nobi Cloud lưu trữ vĩnh viễn. Thùng rác tự động dọn sạch sau 30 ngày.
          </div>

        </div>

      </main>

      {/* 4. DRAWER TRÊN MOBILE */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2" />

            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-slate-900">Kho File & Thùng rác Nobi Cloud</span>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 pt-1 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setFileHubTab('files')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
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
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                    fileHubTab === 'trash'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Thùng rác</span>
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                      allTrashItems.length > 0
                        ? 'bg-amber-100 text-amber-700 font-bold'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {allTrashItems.length}
                  </span>
                </button>
              </div>

              {fileHubTab === 'trash' && allTrashItems.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="text-xs font-bold text-rose-600 hover:underline pb-2 px-1"
                >
                  Dọn sạch
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Danh sách theo tab */}
              <div className="space-y-2">
                {fileHubTab === 'files' ? (
                  files.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-1">
                      <p className="text-xs font-medium">Chưa có file nào trong Nobi Cloud</p>
                      <p className="text-[11px] text-slate-400">Bấm kẹp ghim (📎) bên dưới để tải lên</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-base">{getFileIcon(file.file_name, file.mime_type)}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                              {file.file_name}
                            </p>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>•</span>
                              <span>{formatShortDateTime(file.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleDirectDownload(file)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold active:scale-95 transition shadow-2xs"
                            title="Tải về"
                          >
                            📥 Tải về
                          </button>
                          <button
                            onClick={() => handleMoveFileToTrash(file)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Chuyển vào thùng rác"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : allTrashItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-1">
                    <p className="text-xs font-medium">Thùng rác trống</p>
                    <p className="text-[11px] text-slate-400">Mục đã xóa sẽ lưu ở đây trong 30 ngày</p>
                  </div>
                ) : (
                  allTrashItems.map((trashItem) => {
                    const isMsg = trashItem.kind === 'message';
                    const item = trashItem.item;
                    const trashExpiry = formatTrashExpiry(item.deleted_at);

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{isMsg ? '💬' : '📄'}</span>
                            <p className="text-xs font-bold text-slate-800 truncate line-through decoration-slate-300">
                              {isMsg ? (item as RoomMessage).content : (item as RoomFile).file_name}
                            </p>
                          </div>
                          <p className="text-[10px] text-amber-700 mt-0.5">{trashExpiry.text}</p>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              isMsg
                                ? handleRestoreMessage(item as RoomMessage)
                                : handleRestoreFile(item as RoomFile)
                            }
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition active:scale-95"
                            title="Khôi phục"
                          >
                            Khôi phục
                          </button>
                          <button
                            onClick={() =>
                              isMsg
                                ? handlePermanentDeleteMessage(item as RoomMessage)
                                : handlePermanentDeleteFile(item as RoomFile)
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 text-xs rounded-lg transition"
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

            </div>

            <div className="p-3 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-100 text-center flex-shrink-0">
              ☁️ Nobi Cloud lưu trữ vĩnh viễn · Thùng rác tự dọn sau 30 ngày.
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL XEM NHANH FILE TEXT / CODE (UTF-8) */}
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
