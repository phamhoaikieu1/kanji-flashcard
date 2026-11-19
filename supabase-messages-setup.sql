-- ==============================================================================
-- SUPABASE MIGRATION: BẢNG TIN NHẮN PHÒNG (ROOM_MESSAGES) & REALTIME
-- ==============================================================================

-- 1. Bảng lưu trữ tin nhắn / text trong phòng
CREATE TABLE IF NOT EXISTS public.room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    sender_type TEXT DEFAULT 'device', -- 'pc' | 'mobile' | 'web'
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'link' | 'code'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL -- Hết hạn cùng logic 15 phút (hoặc theo phòng)
);

-- Index tăng tốc truy vấn theo phòng và thời gian
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON public.room_messages(created_at);

-- 2. Kích hoạt Supabase Realtime cho bảng room_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'room_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
    END IF;
END $$;

-- 3. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Cho phép tất cả mọi người đọc tin nhắn trong phòng
DROP POLICY IF EXISTS "Public can view room_messages" ON public.room_messages;
CREATE POLICY "Public can view room_messages" ON public.room_messages
    FOR SELECT TO public USING (true);

-- Policy INSERT: Cho phép gửi tin nhắn mới
DROP POLICY IF EXISTS "Public can insert room_messages" ON public.room_messages;
CREATE POLICY "Public can insert room_messages" ON public.room_messages
    FOR INSERT TO public WITH CHECK (true);

-- Policy DELETE: Cho phép xóa tin nhắn
DROP POLICY IF EXISTS "Public can delete room_messages" ON public.room_messages;
CREATE POLICY "Public can delete room_messages" ON public.room_messages
    FOR DELETE TO public USING (true);
