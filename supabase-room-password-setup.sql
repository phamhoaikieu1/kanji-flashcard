-- ==============================================================================
-- SUPABASE MIGRATION: THÊM CỘT PASSWORD CHO BẢNG ROOMS & BỔ SUNG POLICY UPDATE
-- ==============================================================================

-- 1. Thêm cột password vào bảng rooms (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'rooms' 
          AND column_name = 'password'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN password TEXT;
    END IF;
END $$;

-- 2. Ràng buộc độ dài mật khẩu: từ 1 đến 9 ký tự (cho phép NULL đối với phòng chưa đặt mật khẩu)
DO $$
BEGIN
    ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_password_length_check;
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_password_length_check 
        CHECK (password IS NULL OR (char_length(password) >= 1 AND char_length(password) <= 9));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Bổ sung RLS Policy UPDATE cho bảng rooms (cần thiết để client có thể đặt và đổi mật khẩu)
DROP POLICY IF EXISTS "Public can update rooms" ON public.rooms;
CREATE POLICY "Public can update rooms" ON public.rooms
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- 4. Kích hoạt Supabase Realtime cho bảng rooms (đồng bộ ngay khi có thiết bị đổi mật khẩu)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END $$;
