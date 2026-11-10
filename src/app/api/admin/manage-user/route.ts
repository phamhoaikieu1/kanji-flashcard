import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kmaifmhbipuxabsgvyxm.supabase.co/',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Hàm hỗ trợ lấy Token và xác thực người dùng từ Authorization Header hoặc Cookie
async function getAuthenticatedUser(req: Request) {
  try {
    let token: string | null = null;

    // 1. Lấy token từ header Authorization (Bearer <token>)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Nếu không có header, tìm token trong Cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [key, ...v] = c.trim().split('=');
            return [key.trim(), v.join('=')];
          })
        );

        token = cookies['sb-access-token'] || cookies['sb-auth-token'] || null;

        if (!token) {
          const sbCookieKey = Object.keys(cookies).find(
            (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (sbCookieKey) {
            try {
              const parsed = JSON.parse(decodeURIComponent(cookies[sbCookieKey]));
              token = parsed.access_token || parsed[0] || null;
            } catch {
              token = cookies[sbCookieKey];
            }
          }
        }
      }
    }

    if (!token) return null;

    // Xác thực token thông qua Supabase Auth API
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    return user;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      action, email, password, displayName, userId, newRole, newPassword,
      isLockedSettings, lockedCourses, banDuration
    } = body;

    // 1. Xác thực người dùng thông qua Session/Token từ Supabase Auth
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Phiên làm việc hết hạn hoặc chưa đăng nhập!' }, { status: 401 });
    }

    // 2. Kiểm tra quyền Admin/Owner trong bảng profiles
    const { data: requestingProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !requestingProfile || !['admin', 'owner'].includes(requestingProfile.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này!' }, { status: 403 });
    }

    const requestingRole = requestingProfile.role;

    // ------------------- ACTION 0: LẤY TẤT CẢ HỌC VIÊN -------------------
    if (action === 'GET_USERS') {
      const { data: authUsersData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();

      if (authErr) {
        return NextResponse.json({ error: `Lỗi tải danh sách Auth: ${authErr.message}` }, { status: 400 });
      }

      const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
      const profileMap: { [key: string]: any } = {};
      profiles?.forEach((p) => { profileMap[p.id] = p; });

      const mergedUsers = await Promise.all(
        authUsersData.users.map(async (authUser) => {
          let p = profileMap[authUser.id];

          if (!p) {
            const nameToUse = authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Học viên';
            const { data: createdProfile } = await supabaseAdmin
              .from('profiles')
              .upsert({
                id: authUser.id,
                email: authUser.email,
                full_name: nameToUse,
                role: 'user',
              }, { onConflict: 'id' })
              .select()
              .single();

            p = createdProfile || { role: 'user', full_name: nameToUse };
          }

          return {
            id: authUser.id,
            email: authUser.email,
            full_name: p?.full_name || p?.display_name || authUser.user_metadata?.full_name || 'Học viên',
            role: p?.role || 'user',
            avatar_url: p?.avatar_url || '',
            created_at: authUser.created_at,
            is_locked_settings: p?.is_locked_settings || false,
            locked_courses: p?.locked_courses || [],
            ban_until: p?.ban_until || null,
          };
        })
      );

      mergedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return NextResponse.json({ success: true, users: mergedUsers });
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
        await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id,
          full_name: displayName,
          email: email,
          role: 'user',
        }, { onConflict: 'id' });
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

    // ------------------- ACTION 3: CẬP NHẬT VAI TRÒ (ROLE) -------------------
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
        .upsert({ id: userId, role: newRole }, { onConflict: 'id' });

      if (roleErr) {
        return NextResponse.json({ error: roleErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ------------------- ACTION 4: CẬP NHẬT TRẠNG THÁI KHÓA -------------------
    if (action === 'UPDATE_LOCK_STATUS') {
      if (!userId) {
        return NextResponse.json({ error: 'Thiếu ID người dùng!' }, { status: 400 });
      }

      let banUntilDate: Date | null = null;
      if (banDuration === '1h') {
        banUntilDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
      } else if (banDuration === '4h') {
        banUntilDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
      } else if (banDuration === '8am') {
        const tomorrow8AM = new Date();
        tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
        tomorrow8AM.setHours(8, 0, 0, 0);
        banUntilDate = tomorrow8AM;
      } else if (banDuration === 'forever') {
        // Sử dụng mốc năm 2099 để đánh dấu khóa vĩnh viễn cho tới khi mở lại
        banUntilDate = new Date('2099-12-31T23:59:59.000Z');
      } else if (banDuration === 'unlock') {
        banUntilDate = null;
      }

      const { error: updateErr } = await supabaseAdmin.from('profiles').update({
        is_locked_settings: isLockedSettings ?? false,
        locked_courses: lockedCourses || [],
        ban_until: banUntilDate ? banUntilDate.toISOString() : null,
      }).eq('id', userId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // ------------------- ACTION 5: XÓA TÀI KHOẢN -------------------
    if (action === 'DELETE_USER') {
      if (!userId) {
        return NextResponse.json({ error: 'Thiếu ID người dùng!' }, { status: 400 });
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const targetRole = targetProfile?.role || 'user';

      if (targetRole === 'admin' || targetRole === 'owner') {
        return NextResponse.json({ error: 'Tài khoản Admin/Owner không thể xóa! Vui lòng hạ cấp tài khoản về Học viên thường trước khi xóa.' }, { status: 400 });
      }

      // Xóa trong kho Auth gốc
      const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthErr) {
        return NextResponse.json({ error: deleteAuthErr.message }, { status: 400 });
      }

      // Đảm bảo dọn sạch bảng public.profiles
      await supabaseAdmin.from('profiles').delete().eq('id', userId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ!' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server nội bộ!' }, { status: 500 });
  }
}