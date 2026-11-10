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

const TABLE_MAP: { [key: string]: string } = {
  kanji: 'flashcards',
  grammar: 'grammar_cards',
  hsk: 'hsk_vocab',
  basic_chinese: 'basic_chinese_vocab',
  traditional_chinese: 'traditional_chinese_vocab',
  english: 'english_vocab_cards',
};

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
      action, cardId, cardType, cardData,
      reportType, description, reportId, reportStatus
    } = body;

    // Lấy thông tin user đã đăng nhập thực sự từ Supabase Auth
    const user = await getAuthenticatedUser(req);

    // ------------------- ACTION 1: BÁO CÁO THẺ LỖI -------------------
    if (action === 'CREATE_REPORT') {
      if (!cardId || !cardType || !reportType) {
        return NextResponse.json({ error: 'Thiếu thông tin báo cáo lỗi!' }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from('card_reports').insert([{
        user_id: user ? user.id : null,
        card_id: cardId,
        card_type: cardType,
        report_type: reportType,
        description: description || '',
        status: 'pending',
      }]);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: 'Đã gửi báo cáo lỗi thành công!' });
    }

    // --- KIỂM TRA XÁC THỰC NGƯỜI DÙNG & QUYỀN ADMIN/OWNER ---
    if (!user) {
      return NextResponse.json({ error: 'Phiên làm việc hết hạn hoặc chưa đăng nhập!' }, { status: 401 });
    }

    const { data: requestingProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !requestingProfile || !['admin', 'owner'].includes(requestingProfile.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này!' }, { status: 403 });
    }

    // ------------------- ACTION 2: CHỈNH SỬA THẺ BÀI TRỰC TIẾP -------------------
    if (action === 'UPDATE_CARD') {
      if (!cardId || !cardType || !cardData) {
        return NextResponse.json({ error: 'Thiếu dữ liệu cập nhật thẻ!' }, { status: 400 });
      }

      const tableName = TABLE_MAP[cardType];
      if (!tableName) return NextResponse.json({ error: 'Loại thẻ không hợp lệ!' }, { status: 400 });

      const { error: updateErr } = await supabaseAdmin
        .from(tableName)
        .update(cardData)
        .eq('card_id', cardId);

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

      // Nếu truyền reportId -> Tự động chuyển trạng thái báo cáo thành đã xử lý
      if (reportId) {
        await supabaseAdmin
          .from('card_reports')
          .update({ status: 'resolved' })
          .eq('id', reportId);
      }

      return NextResponse.json({ success: true });
    }

    // ------------------- ACTION 3: LẤY DANH SÁCH BÁO CÁO (KÈM DỮ LIỆU TỪ VỰNG) -------------------
    if (action === 'GET_REPORTS') {
      const { data: reports, error: fetchErr } = await supabaseAdmin
        .from('card_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

      // Kéo thông tin học viên báo cáo
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email');
      const profileMap: { [key: string]: any } = {};
      profiles?.forEach((p) => { profileMap[p.id] = p; });

      // Lấy chi tiết thẻ bài gốc để Admin xem chữ Hán/bài học trực tiếp
      const enrichedReports = await Promise.all((reports || []).map(async (r) => {
        const tableName = TABLE_MAP[r.card_type];
        let cardDetail: any = null;

        if (tableName) {
          const { data: cardData } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('card_id', r.card_id)
            .single();
          cardDetail = cardData;
        }

        return {
          ...r,
          reporter_name: profileMap[r.user_id]?.full_name || 'Học viên ẩn danh',
          reporter_email: profileMap[r.user_id]?.email || '',
          card_detail: cardDetail, // Chi tiết thẻ chứa hanzi, lesson, level...
        };
      }));

      return NextResponse.json({ success: true, reports: enrichedReports });
    }

    // ------------------- ACTION 4: CẬP NHẬT / XÓA BÁO CÁO -------------------
    if (action === 'UPDATE_REPORT_STATUS') {
      if (!reportId) return NextResponse.json({ error: 'Thiếu ID báo cáo!' }, { status: 400 });

      if (reportStatus === 'delete') {
        const { error: delErr } = await supabaseAdmin.from('card_reports').delete().eq('id', reportId);
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
      } else {
        const { error: upErr } = await supabaseAdmin
          .from('card_reports')
          .update({ status: reportStatus })
          .eq('id', reportId);
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ!' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server nội bộ!' }, { status: 500 });
  }
}