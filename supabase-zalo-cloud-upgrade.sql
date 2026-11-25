-- ==============================================================================
-- SUPABASE MIGRATION SCRIPT: NÂNG CẤP DROPZONE SANG MÔ HÌNH "ZALO CLOUD"
-- (Lưu trữ vĩnh viễn, Thùng rác 30 ngày cho cả File và Tin nhắn)
-- ==============================================================================

-- 1. Bỏ ràng buộc bắt buộc hết hạn 15 phút (expires_at cho phép NULL)
ALTER TABLE public.room_files ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.room_messages ALTER COLUMN expires_at DROP NOT NULL;

-- 2. Bổ sung cột status và deleted_at cho bảng room_messages (để tin nhắn cũng vào Thùng rác)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'room_messages' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.room_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'room_messages' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.room_messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Cập nhật Check Constraint cho status của bảng room_messages
DO $$
BEGIN
    ALTER TABLE public.room_messages DROP CONSTRAINT IF EXISTS room_messages_status_check;
    ALTER TABLE public.room_messages ADD CONSTRAINT room_messages_status_check 
        CHECK (status IN ('active', 'trash', 'pending_delete'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Tạo Index tối ưu truy vấn cho room_messages theo status và deleted_at
CREATE INDEX IF NOT EXISTS idx_room_messages_status ON public.room_messages(status);
CREATE INDEX IF NOT EXISTS idx_room_messages_deleted_at ON public.room_messages(deleted_at);

-- 5. Cập nhật Row Level Security (RLS) cho room_messages:
-- Cho phép SELECT tin nhắn active và tin nhắn trong thùng rác (< 30 ngày)
DROP POLICY IF EXISTS "Public can view room_messages" ON public.room_messages;
CREATE POLICY "Public can view room_messages" ON public.room_messages
    FOR SELECT TO public
    USING (
        status = 'active'
        OR status IS NULL
        OR (status = 'trash' AND (deleted_at IS NULL OR deleted_at > timezone('utc'::text, now()) - interval '30 days'))
    );

-- Cho phép UPDATE tin nhắn (chuyển thùng rác / khôi phục)
DROP POLICY IF EXISTS "Public can update room_messages" ON public.room_messages;
CREATE POLICY "Public can update room_messages" ON public.room_messages
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 6. Cập nhật RLS Policy cho room_files (Bỏ lọc expires_at 15 phút, lưu trữ vĩnh viễn)
DROP POLICY IF EXISTS "Public can view room_files" ON public.room_files;
DROP POLICY IF EXISTS "Public can view active unexpired room_files" ON public.room_files;
CREATE POLICY "Public can view room_files" ON public.room_files
    FOR SELECT TO public
    USING (
        status = 'active'
        OR (status = 'trash' AND (deleted_at IS NULL OR deleted_at > timezone('utc'::text, now()) - interval '30 days'))
    );

DROP POLICY IF EXISTS "Public can update room_files" ON public.room_files;
CREATE POLICY "Public can update room_files" ON public.room_files
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 7. Kích hoạt Supabase Realtime cho cả UPDATE của room_messages nếu chưa có
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_files REPLICA IDENTITY FULL;
