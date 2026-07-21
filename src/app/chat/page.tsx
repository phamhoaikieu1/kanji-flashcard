'use client';

import { supabase } from '@/utils/supabase';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTargetUserId = searchParams.get('userId');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeTargetUser, setActiveTargetUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputContent, setInputContent] = useState('');

  // 🌐 State quản lý danh sách User ID đang THỰC SỰ Online
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Kiểm tra User & Khởi tạo danh sách người dùng
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      const { data: profiles } = await supabase.from('profiles').select('*');
      
      let nameCol = 'display_name';
      if (profiles && profiles.length > 0) {
        const firstRow = profiles[0];
        if ('display_name' in firstRow) nameCol = 'display_name';
        else if ('full_name' in firstRow) nameCol = 'full_name';
        else if ('username' in firstRow) nameCol = 'username';
      }

      const otherUsers = (profiles || [])
        .filter((p: any) => p.id !== user.id)
        .map((p: any) => ({
          id: p.id,
          display_name: p[nameCol] || `Học viên (${p.id.substring(0, 4)})`,
          avatar_url: p.avatar_url || ''
        }));

      setConversations(otherUsers);

      if (initialTargetUserId) {
        const target = otherUsers.find((u: any) => u.id === initialTargetUserId);
        if (target) {
          setActiveTargetUser(target);
        } else {
          setActiveTargetUser({
            id: initialTargetUserId,
            display_name: 'Học viên Kanji',
            avatar_url: ''
          });
        }
      } else if (otherUsers.length > 0) {
        setActiveTargetUser(otherUsers[0]);
      }

      setLoading(false);
    };

    initChat();
  }, [router, initialTargetUserId]);

  // 2. 🌐 Điểm danh Online/Offline REALTIME qua Supabase Presence (RAM WebSocket)
  useEffect(() => {
    if (!currentUser) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: { key: currentUser.id }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = Object.keys(state);
        setOnlineUserIds(activeIds); // Cập nhật mảng ID các user đang thực sự mở App/Web
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser]);

  // 3. Kéo tin nhắn cũ & Lắng nghe tin nhắn mới Realtime
  useEffect(() => {
    if (!currentUser || !activeTargetUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeTargetUser.id}),and(sender_id.eq.${activeTargetUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Kênh nhận tin nhắn từ đối phương
    const channel = supabase
      .channel('realtime_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === activeTargetUser.id && newMsg.receiver_id === currentUser.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeTargetUser]);

  // 4. Gửi tin nhắn (Hiển thị ngay lập tức - Optimistic UI)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !activeTargetUser || !currentUser) return;

    const textToSend = inputContent.trim();
    setInputContent('');

    const tempMsg = {
      id: Date.now(),
      sender_id: currentUser.id,
      receiver_id: activeTargetUser.id,
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentUser.id,
        receiver_id: activeTargetUser.id,
        content: textToSend
      }
    ]);

    if (error) {
      toast.error('Gửi tin nhắn thất bại: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Đang kết nối trung tâm tin nhắn...</p>
      </div>
    );
  }

  const isTargetOnline = activeTargetUser && onlineUserIds.includes(activeTargetUser.id);

  return (
    <div className="w-full max-w-md h-[100dvh] flex flex-col bg-white shadow-2xl relative overflow-hidden">
      
      {/* 🔝 HEADER CỦA CỬA SỔ CHAT */}
      <div className="w-full bg-white/80 backdrop-blur-md p-3 border-b border-slate-100 flex items-center justify-between z-20 flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-xs font-bold"
        >
          ← Quay lại
        </button>

        {activeTargetUser ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center overflow-hidden text-xs relative">
              {activeTargetUser.avatar_url ? (
                <img src={activeTargetUser.avatar_url} alt="Ava" className="w-full h-full object-cover" />
              ) : (
                activeTargetUser.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold text-slate-800">{activeTargetUser.display_name}</h3>
              
              {/* 🟢/⚪ STATUS ONLINE THẬT 100% */}
              {isTargetOnline ? (
                <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang hoạt động
                </p>
              ) : (
                <p className="text-[9px] text-slate-400 font-medium">● Ngoại tuyến</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-500">Tin nhắn học tập</span>
        )}

        <div className="w-8" />
      </div>

      {/* 👥 DANH SÁCH USER KHÁC ĐỂ CHỌN CHAT (Thanh ngang) */}
      {conversations.length > 0 && (
        <div className="w-full bg-slate-50/80 px-3 py-2 border-b border-slate-100 flex gap-2 overflow-x-auto flex-shrink-0 no-scrollbar">
          {conversations.map((user) => {
            const isActive = activeTargetUser?.id === user.id;
            const isUserOnline = onlineUserIds.includes(user.id);

            return (
              <button
                key={user.id}
                onClick={() => setActiveTargetUser(user)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border relative ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-slate-300 overflow-hidden text-[8px] flex items-center justify-center text-slate-700 relative">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="a" className="w-full h-full object-cover" />
                  ) : (
                    user.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <span>{user.display_name}</span>
                {/* Chấm xanh góc badge */}
                {isUserOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 💬 KHUNG HIỂN THỊ TIN NHẮN */}
      <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {!activeTargetUser ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
            Hãy chọn một học viên để bắt đầu cuộc trò chuyện!
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium space-y-2 text-center p-4">
            <span className="text-3xl">👋</span>
            <p>Hãy gửi lời chào đến {activeTargetUser.display_name} để cùng rèn luyện Kanji nào!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ✉️ KHUNG NHẬP VÀ GỬI TIN NHẮN */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          placeholder={activeTargetUser ? `Nhắn tin cho ${activeTargetUser.display_name}...` : 'Chọn user để nhắn...'}
          disabled={!activeTargetUser}
          className="flex-grow bg-slate-100 text-slate-800 text-xs font-medium px-4 py-3 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputContent.trim() || !activeTargetUser}
          className="bg-indigo-600 text-white px-4 py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Gửi ➔
        </button>
      </form>

    </div>
  );
}

export default function ChatPage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-slate-100 font-sans select-none overflow-hidden">
      <Suspense fallback={<p className="text-slate-500 font-medium">Đang mở tin nhắn...</p>}>
        <ChatContent />
      </Suspense>
    </main>
  );
}