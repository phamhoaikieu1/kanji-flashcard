-- ==============================================================================
-- SUPABASE MIGRATION SCRIPT: PUBLIC DROPZONE (CHIA SẺ FILE THEO MÃ PHÒNG + THÙNG RÁC)
-- ==============================================================================

-- 1. Bảng lưu trữ phòng (rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Case-sensitive (Ab != ab)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index tra cứu mã phòng
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);

-- 2. Bảng lưu trữ file trong phòng (room_files)
CREATE TABLE IF NOT EXISTS public.room_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Định dạng: dropzone/{room_id}/{file_id}
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trash', 'pending_delete')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ -- Thời điểm chuyển vào thùng rác (xóa vĩnh viễn sau 30 ngày)
);

-- Bổ sung cột deleted_at nếu bảng đã tồn tại từ trước
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'room_files' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.room_files ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Cập nhật check constraint cho status nếu cần
DO $$
BEGIN
    ALTER TABLE public.room_files DROP CONSTRAINT IF EXISTS room_files_status_check;
    ALTER TABLE public.room_files ADD CONSTRAINT room_files_status_check 
        CHECK (status IN ('active', 'trash', 'pending_delete'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Index tối ưu tra cứu file theo room_id, status và thời gian
CREATE INDEX IF NOT EXISTS idx_room_files_room_id ON public.room_files(room_id);
CREATE INDEX IF NOT EXISTS idx_room_files_status ON public.room_files(status);
CREATE INDEX IF NOT EXISTS idx_room_files_expires_at ON public.room_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_room_files_deleted_at ON public.room_files(deleted_at);

-- 3. Kích hoạt Supabase Realtime cho bảng room_files (kiểm tra an toàn tránh lỗi 42710 nếu đã add rồi)
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
END $$;

-- 4. Cấu hình Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_files ENABLE ROW LEVEL SECURITY;

-- Policy cho bảng rooms: Cho phép đọc và tạo phòng
DROP POLICY IF EXISTS "Public can view rooms" ON public.rooms;
CREATE POLICY "Public can view rooms" ON public.rooms
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert rooms" ON public.rooms;
CREATE POLICY "Public can insert rooms" ON public.rooms
    FOR INSERT TO public WITH CHECK (true);

-- Policy cho bảng room_files:
-- SELECT: Cho phép đọc file active chưa hết hạn HOẶC file trong trash chưa quá 30 ngày
DROP POLICY IF EXISTS "Public can view active unexpired room_files" ON public.room_files;
DROP POLICY IF EXISTS "Public can view room_files" ON public.room_files;
CREATE POLICY "Public can view room_files" ON public.room_files
    FOR SELECT TO public
    USING (
        (status = 'active' AND expires_at > timezone('utc'::text, now()))
        OR
        (status = 'trash' AND (deleted_at IS NULL OR deleted_at > timezone('utc'::text, now()) - interval '30 days'))
    );

-- INSERT: Cho phép upload file mới
DROP POLICY IF EXISTS "Public can insert room_files" ON public.room_files;
CREATE POLICY "Public can insert room_files" ON public.room_files
    FOR INSERT TO public WITH CHECK (true);

-- UPDATE: Cho phép gia hạn expires_at, chuyển vào trash, khôi phục hoặc đặt pending_delete
DROP POLICY IF EXISTS "Public can update room_files" ON public.room_files;
CREATE POLICY "Public can update room_files" ON public.room_files
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- DELETE: Cho phép xóa file
DROP POLICY IF EXISTS "Public can delete room_files" ON public.room_files;
CREATE POLICY "Public can delete room_files" ON public.room_files
    FOR DELETE TO public USING (true);

-- 5. Cấu hình Storage Bucket 'dropzone'
INSERT INTO storage.buckets (id, name, public)
VALUES ('dropzone', 'dropzone', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read dropzone bucket" ON storage.objects;
CREATE POLICY "Public can read dropzone bucket" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'dropzone');

DROP POLICY IF EXISTS "Public can upload to dropzone bucket" ON storage.objects;
CREATE POLICY "Public can upload to dropzone bucket" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'dropzone');

DROP POLICY IF EXISTS "Public can delete from dropzone bucket" ON storage.objects;
CREATE POLICY "Public can delete from dropzone bucket" ON storage.objects
    FOR DELETE TO public
    USING (bucket_id = 'dropzone');

-- 6. Function tự động:
-- A) Chuyển file hết hạn 15 phút sang Thùng rác (trash)
-- B) Xóa vĩnh viễn file trong Thùng rác quá 30 ngày
CREATE OR REPLACE FUNCTION public.cleanup_expired_room_files()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    moved_to_trash_count integer := 0;
    purged_count integer := 0;
BEGIN
    -- 1. Chuyển các file active đã quá hạn 15 phút vào Thùng rác
    UPDATE public.room_files
    SET status = 'trash',
        deleted_at = timezone('utc'::text, now())
    WHERE status = 'active'
      AND expires_at <= timezone('utc'::text, now());
    GET DIAGNOSTICS moved_to_trash_count = ROW_COUNT;

    -- 2. Xóa các file trong Thùng rác đã quá 30 ngày hoặc đang chờ xóa
    DELETE FROM public.room_files
    WHERE (status = 'trash' AND deleted_at <= timezone('utc'::text, now()) - interval '30 days')
       OR status = 'pending_delete';
    GET DIAGNOSTICS purged_count = ROW_COUNT;

    RETURN moved_to_trash_count + purged_count;
END;
$$;
