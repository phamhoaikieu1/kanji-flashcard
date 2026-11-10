import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Admin Client với Service Role Key để có quyền thao tác Storage & DB
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(req: Request) {
  return handleCleanup(req);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

async function handleCleanup(req: Request) {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. TỰ ĐỘNG CHUYỂN FILE HẾT HẠN (15 PHÚT) VÀO THÙNG RÁC (TRASH)
    // Cả file bị người dùng xóa thủ công và file tự hết hạn đều phải chuyển vào thùng rác, không xóa vật lý ngay
    const { data: expiredActiveFiles, error: expireError } = await supabaseAdmin
      .from('room_files')
      .update({
        status: 'trash',
        deleted_at: nowIso,
      })
      .eq('status', 'active')
      .lte('expires_at', nowIso)
      .select('id');

    if (expireError) {
      console.error('Error moving expired files to trash:', expireError);
    }

    const movedToTrashCount = expiredActiveFiles?.length || 0;

    // 2. TÌM CÁC FILE CẦN XÓA VĨNH VIỄN:
    // - File trong thùng rác đã quá 30 ngày (deleted_at <= now - 30 days)
    // - File có status = 'pending_delete' (người dùng bấm xóa vĩnh viễn hoặc dọn sạch thùng rác)
    const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: filesToPurge, error: purgeFetchError } = await supabaseAdmin
      .from('room_files')
      .select('id, storage_path, room_id, status, deleted_at')
      .or(`status.eq.pending_delete,and(status.eq.trash,deleted_at.lte.${thirtyDaysAgoIso})`)
      .limit(100);

    if (purgeFetchError) {
      console.error('Error fetching files to purge:', purgeFetchError);
      return NextResponse.json({
        movedToTrash: movedToTrashCount,
        error: purgeFetchError.message,
      }, { status: 500 });
    }

    let purgedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // 3. Xử lý xóa vĩnh viễn tin cậy: Xóa file khỏi Storage -> Xóa metadata DB
    // Nếu xóa Storage lỗi, giữ status = 'pending_delete' để hệ thống tự động retry lần sau
    if (filesToPurge && filesToPurge.length > 0) {
      for (const file of filesToPurge) {
        try {
          if (file.storage_path) {
            const { error: storageError } = await supabaseAdmin.storage
              .from('dropzone')
              .remove([file.storage_path]);

            if (storageError) {
              console.warn(`Storage delete error for file ${file.id}:`, storageError.message);
              // Đánh dấu pending_delete để lần sau thử lại
              await supabaseAdmin
                .from('room_files')
                .update({ status: 'pending_delete' })
                .eq('id', file.id);
              errors.push({ id: file.id, error: storageError.message });
              continue;
            }
          }

          // Xóa bản ghi khỏi database sau khi Storage đã xác nhận xóa thành công
          const { error: dbError } = await supabaseAdmin
            .from('room_files')
            .delete()
            .eq('id', file.id);

          if (dbError) {
            errors.push({ id: file.id, error: dbError.message });
          } else {
            purgedCount++;
          }
        } catch (err: any) {
          errors.push({ id: file.id, error: err?.message || 'Unknown error' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      movedToTrash: movedToTrashCount,
      purged: purgedCount,
      totalToPurge: filesToPurge?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Unexpected cleanup error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
