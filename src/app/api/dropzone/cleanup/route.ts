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
    const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. TÌM VÀ XÓA VĨNH VIỄN CÁC FILE TRONG THÙNG RÁC:
    // - File có status = 'pending_delete'
    // - File có status = 'trash' và deleted_at <= 30 ngày trước
    const { data: filesToPurge, error: purgeFetchError } = await supabaseAdmin
      .from('room_files')
      .select('id, storage_path, room_id, status, deleted_at')
      .or(`status.eq.pending_delete,and(status.eq.trash,deleted_at.lte.${thirtyDaysAgoIso})`)
      .limit(100);

    if (purgeFetchError) {
      console.error('Error fetching files to purge:', purgeFetchError);
    }

    let purgedFilesCount = 0;
    const fileErrors: Array<{ id: string; error: string }> = [];

    if (filesToPurge && filesToPurge.length > 0) {
      for (const file of filesToPurge) {
        try {
          if (file.storage_path) {
            const { error: storageError } = await supabaseAdmin.storage
              .from('dropzone')
              .remove([file.storage_path]);

            if (storageError) {
              console.warn(`Storage delete error for file ${file.id}:`, storageError.message);
              await supabaseAdmin
                .from('room_files')
                .update({ status: 'pending_delete' })
                .eq('id', file.id);
              fileErrors.push({ id: file.id, error: storageError.message });
              continue;
            }
          }

          const { error: dbError } = await supabaseAdmin
            .from('room_files')
            .delete()
            .eq('id', file.id);

          if (dbError) {
            fileErrors.push({ id: file.id, error: dbError.message });
          } else {
            purgedFilesCount++;
          }
        } catch (err: any) {
          fileErrors.push({ id: file.id, error: err?.message || 'Unknown error' });
        }
      }
    }

    // 2. TÌM VÀ XÓA VĨNH VIỄN TIN NHẮN TRONG THÙNG RÁC QUÁ 30 NGÀY HOẶC PENDING_DELETE:
    let purgedMessagesCount = 0;
    const { data: messagesToPurge, error: msgFetchError } = await supabaseAdmin
      .from('room_messages')
      .delete()
      .or(`status.eq.pending_delete,and(status.eq.trash,deleted_at.lte.${thirtyDaysAgoIso})`)
      .select('id');

    if (!msgFetchError && messagesToPurge) {
      purgedMessagesCount = messagesToPurge.length;
    }

    return NextResponse.json({
      success: true,
      purgedFiles: purgedFilesCount,
      purgedMessages: purgedMessagesCount,
      totalFilesToPurge: filesToPurge?.length || 0,
      errors: fileErrors.length > 0 ? fileErrors : undefined,
    });
  } catch (err: any) {
    console.error('Unexpected cleanup error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
