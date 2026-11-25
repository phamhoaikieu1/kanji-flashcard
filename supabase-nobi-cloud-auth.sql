-- ==============================================================================
-- SUPABASE MIGRATION SCRIPT: NÂNG CẤP "NOBI CLOUD" THEO TÀI KHOẢN NGƯỜI DÙNG (USER ACCOUNT)
-- (Bảo mật phân quyền dữ liệu theo auth.uid(), Lưu trữ vĩnh viễn, Thùng rác 30 ngày)
-- ==============================================================================

-- 1. Bổ sung cột user_id vào bảng room_files và room_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'room_files' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.room_files ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'room_messages' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.room_messages ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Cho phép room_id và room_code nhận NULL để hỗ trợ mô hình Nobi Cloud cá nhân không cần Room
ALTER TABLE public.room_files ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE public.room_files ALTER COLUMN room_code DROP NOT NULL;
ALTER TABLE public.room_messages ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE public.room_messages ALTER COLUMN room_code DROP NOT NULL;

-- 3. Tạo Indexes tăng tốc độ tra cứu và realtime theo user_id
CREATE INDEX IF NOT EXISTS idx_room_files_user_id ON public.room_files(user_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_user_id ON public.room_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_room_files_user_status ON public.room_files(user_id, status);
CREATE INDEX IF NOT EXISTS idx_room_messages_user_status ON public.room_messages(user_id, status);

-- 4. Kích hoạt Row Level Security (RLS) bảo mật tuyệt đối theo auth.uid()
ALTER TABLE public.room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. BẢO MẬT BẢNG ROOM_FILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own files" ON public.room_files;
CREATE POLICY "Users can view own files" ON public.room_files
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        AND (
            status = 'active'
            OR (status = 'trash' AND (deleted_at IS NULL OR deleted_at > timezone('utc'::text, now()) - interval '30 days'))
        )
    );

DROP POLICY IF EXISTS "Users can insert own files" ON public.room_files;
CREATE POLICY "Users can insert own files" ON public.room_files
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own files" ON public.room_files;
CREATE POLICY "Users can update own files" ON public.room_files
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own files" ON public.room_files;
CREATE POLICY "Users can delete own files" ON public.room_files
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- B. BẢO MẬT BẢNG ROOM_MESSAGES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own messages" ON public.room_messages;
CREATE POLICY "Users can view own messages" ON public.room_messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        AND (
            status = 'active' OR status IS NULL
            OR (status = 'trash' AND (deleted_at IS NULL OR deleted_at > timezone('utc'::text, now()) - interval '30 days'))
        )
    );

DROP POLICY IF EXISTS "Users can insert own messages" ON public.room_messages;
CREATE POLICY "Users can insert own messages" ON public.room_messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.room_messages;
CREATE POLICY "Users can update own messages" ON public.room_messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.room_messages;
CREATE POLICY "Users can delete own messages" ON public.room_messages
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- C. CẤU HÌNH REALTIME THEO USER_ID
-- ------------------------------------------------------------------------------
ALTER TABLE public.room_files REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'room_files'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_files;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'room_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
    END IF;
END $$;
