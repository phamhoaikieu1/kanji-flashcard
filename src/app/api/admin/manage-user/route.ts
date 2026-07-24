import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kmaifmhbipuxabsgvyxm.supabase.co/',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYWlmbWhiaXB1eGFic2d2eXhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODA0NiwiZXhwIjoyMTAwMDU0MDQ2fQ.fHAHPXVA9F9eEB64Gi5iDtalBEFQWCKLpxJVmeFnMGI',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, displayName, userId, newRole, newPassword, requestingUserId } = body;

    // 1. Kiểm tra quyền Admin/Owner
    const { data: requestingProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    if (profileErr || !requestingProfile || !['admin', 'owner'].includes(requestingProfile.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này!' }, { status: 403 });
    }

    const requestingRole = requestingProfile.role;

    // ------------------- ACTION 0: LẤY TẤT CẢ HỌC VIÊN (SERVER-SIDE) -------------------
    if (action === 'GET_USERS') {
      const { data: profiles, error: fetchErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, users: profiles || [] });
    }

    // ------------------- ACTION 1: TẠO TÀI KHOẢN MỚI -------------------
    if (action === 'CREATE_USER') {
      if (!email || !password || !displayName) {
        return NextResponse.json({ error: 'Thiếu thông tin tạo tài khoản!' }, { status: 400 });
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }

      if (newUser.user) {
        const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id,
          full_name: displayName,
          email: email,
          role: 'user',
        }, { onConflict: 'id' });

        if (profileErr) {
          return NextResponse.json({ error: `Tạo Auth xong nhưng lỗi chèn Profile: ${profileErr.message}` }, { status: 400 });
        }
      }

      return NextResponse.json({ success: true, user: newUser.user });
    }

    // ------------------- ACTION 2: ĐỔI MẬT KHẨU -------------------
    if (action === 'RESET_PASSWORD') {
      if (!userId || !newPassword) {
        return NextResponse.json({ error: 'Thiếu thông tin đổi mật khẩu!' }, { status: 400 });
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ------------------- ACTION 3: CẬP NHẬT QUA VAI TRÒ -------------------
    if (action === 'UPDATE_ROLE') {
      if (!userId || !newRole) {
        return NextResponse.json({ error: 'Thiếu thông tin phân quyền!' }, { status: 400 });
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const targetRole = targetProfile?.role || 'user';

      if (requestingRole === 'admin') {
        if (targetRole === 'admin' && newRole === 'user') {
          return NextResponse.json({ error: 'Admin không thể hạ cấp Admin khác!' }, { status: 403 });
        }
        if (targetRole === 'owner' || newRole === 'owner') {
          return NextResponse.json({ error: 'Admin không thể can thiệp quyền Owner!' }, { status: 403 });
        }
      }

      const { error: roleErr } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (roleErr) {
        return NextResponse.json({ error: roleErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ!' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server nội bộ!' }, { status: 500 });
  }
}