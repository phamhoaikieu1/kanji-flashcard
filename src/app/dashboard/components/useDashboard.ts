'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState<string>('user');

  // Trạng thái BXH, Profile và Modal
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [totalSystemCards, setTotalSystemCards] = useState<number>(0);

  // Modals Chọn Cấp Độ
  const [isLevelModalOpen, setIsLevelModalOpen] = useState<boolean>(false);
  const [isGrammarModalOpen, setIsGrammarModalOpen] = useState<boolean>(false);
  const [isHskModalOpen, setIsHskModalOpen] = useState<boolean>(false);
  const [isBasicChineseModalOpen, setIsBasicChineseModalOpen] = useState<boolean>(false);
  const [isTraditionalChineseModalOpen, setIsTraditionalChineseModalOpen] = useState<boolean>(false);
  const [isEnglishModalOpen, setIsEnglishModalOpen] = useState<boolean>(false);

  // Hàm fetch dữ liệu độc lập không gây loop
  const fetchDashboardData = useCallback(async (currentUser: any) => {
    try {
      // 1. Đếm TỔNG SỐ THẺ hệ thống
      const [
        jpRes,
        grammarRes,
        hskRes,
        basicRes,
        tradRes,
        englishRes
      ] = await Promise.all([
        supabase.from('flashcards').select('card_id', { count: 'exact', head: true }),
        supabase.from('grammar_cards').select('card_id', { count: 'exact', head: true }),
        supabase.from('hsk_vocab').select('card_id', { count: 'exact', head: true }),
        supabase.from('basic_chinese_vocab').select('card_id', { count: 'exact', head: true }),
        supabase.from('traditional_chinese_vocab').select('card_id', { count: 'exact', head: true }),
        supabase.from('english_vocab_cards').select('card_id', { count: 'exact', head: true }),
      ]);

      const totalCards = (jpRes.count || 0) + (grammarRes.count || 0) + (hskRes.count || 0) + (basicRes.count || 0) + (tradRes.count || 0) + (englishRes.count || 0);
      setTotalSystemCards(totalCards);

      // 2. Kéo dữ liệu đã thuộc từ tất cả các phần học
      const [
        vocabMemorizedRes,
        grammarMemorizedRes,
        hskMemorizedRes,
        basicChineseMemorizedRes,
        traditionalMemorizedRes,
        englishMemorizedRes
      ] = await Promise.all([
        supabase.from('user_memorized_cards').select('user_id, card_id'),
        supabase.from('user_memorized_grammar').select('user_id, card_id'),
        supabase.from('user_memorized_hsk').select('user_id, card_id'),
        supabase.from('user_memorized_basic_chinese').select('user_id, card_id'),
        supabase.from('user_memorized_traditional_chinese').select('user_id, card_id'),
        supabase.from('user_memorized_english').select('user_id, card_id'),
      ]);

      const userCounts: { [key: string]: number } = {};

      vocabMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      grammarMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      hskMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      basicChineseMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      traditionalMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      englishMemorizedRes.data?.forEach((item: any) => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      // 3. Kéo dữ liệu profiles
      const { data: profileData } = await supabase.from('profiles').select('*');

      let nameCol = 'full_name';
      if (profileData && profileData.length > 0) {
        const firstRow = profileData[0];
        if ('full_name' in firstRow) nameCol = 'full_name';
        else if ('display_name' in firstRow) nameCol = 'display_name';
        else if ('username' in firstRow) nameCol = 'username';
        else if ('name' in firstRow) nameCol = 'name';
      }

      const profileMap: { [key: string]: { name: string; avatar: string; role: string; email: string } } = {};
      profileData?.forEach((p: any) => {
        if (p.id) {
          profileMap[p.id] = {
            name: p[nameCol] || '',
            avatar: p.avatar_url || '',
            role: p.role || 'user',
            email: p.email || '',
          };
        }
      });

      const myProfileName = profileMap[currentUser.id]?.name || currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || 'Học viên Kanji';
      setDisplayName(myProfileName);

      if (profileMap[currentUser.id]) {
        if (profileMap[currentUser.id].avatar) setCurrentAvatarUrl(profileMap[currentUser.id].avatar);
        setUserRole(profileMap[currentUser.id].role || 'user');
      }

      // 4. Gom và sắp xếp danh sách Bảng Xếp Hạng
      const allUserIds = Array.from(
        new Set([...Object.keys(userCounts), ...Object.keys(profileMap), currentUser.id])
      );

      const realLeaderboard = allUserIds
        .map((uid) => {
          const isMe = uid === currentUser.id;
          const pData = profileMap[uid] || {};

          return {
            id: uid,
            display_name: pData.name || (isMe ? myProfileName : `Học viên (${uid.substring(0, 4)})`),
            avatar_url: pData.avatar || '',
            role: pData.role || 'user',
            email: pData.email || '',
            total_words: userCounts[uid] || 0,
            is_current: isMe,
          };
        })
        .sort((a, b) => b.total_words - a.total_words);

      setLeaderboardData(realLeaderboard);
    } catch (err: any) {
      console.error('Lỗi tính toán BXH:', err.message);
    }
  }, []);

  // Khởi tạo 1 lần duy nhất khi Mount trang
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      if (isMounted) {
        setUser(currentUser);
        await fetchDashboardData(currentUser);
        setLoading(false);
      }
    };

    init();
    return () => { isMounted = false; };
  }, [router, fetchDashboardData]);

  // Thăng/Hạ cấp Role trực tiếp từ Modal BXH
  const handleToggleRoleFromModal = async (targetUser: any, newRole: string) => {
    const targetName = targetUser.display_name || 'Học viên';
    const actionText = newRole === 'admin' ? 'BỔ NHIỆM ADMIN' : 'HẠ CẤP';
    if (!confirm(`Xác nhận ${actionText} cho ${targetName}?`)) return;

    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROLE',
          userId: targetUser.id,
          newRole,
          requestingUserId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại!');

      toast.success(`Cập nhật quyền cho ${targetName} thành công!`);
      
      setSelectedProfile((prev: any) => prev ? { ...prev, role: newRole } : null);
      if (user) await fetchDashboardData(user);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  // Đổi mật khẩu nhanh từ Modal BXH
  const handleResetPasswordFromModal = async (targetUser: any, newPasswordVal: string) => {
    if (!newPasswordVal || newPasswordVal.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự trở lên!');
      return false;
    }

    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          userId: targetUser.id,
          newPassword: newPasswordVal,
          requestingUserId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đổi mật khẩu thất bại!');

      toast.success(`🔑 Đã đổi mật khẩu cho ${targetUser.display_name}!`);
      return true;
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
      return false;
    }
  };

  // 📚 TỪ VỰNG TIẾNG NHẬT JLPT
  const levels = [
    { code: 'N5', label: 'Tiếng Nhật N5', equiv: 'Sơ cấp 1 - Nhập môn Hiragana/Katakana & Kanji cơ bản' },
    { code: 'N4', label: 'Tiếng Nhật N4', equiv: 'Sơ cấp 2 - Giao tiếp hàng ngày & Kanji thông dụng' },
    { code: 'N3', label: 'Tiếng Nhật N3', equiv: 'Trung cấp - Đọc hiểu hội thoại & ngữ cảnh công việc' },
    { code: 'N2', label: 'Tiếng Nhật N2', equiv: 'Thượng cấp - Làm việc tại doanh nghiệp Nhật Bản' },
    { code: 'N1', label: 'Tiếng Nhật N1', equiv: 'Cao cấp - Đọc hiểu báo chí & trình độ chuyên sâu' },
  ];

  // 📖 NGỮ PHÁP TIẾNG NHẬT JLPT
  const grammarLevels = [
    { code: 'N5', label: 'Ngữ Pháp N5', equiv: 'Cấu trúc câu cơ bản & cách chia động từ đơn giản' },
    { code: 'N4', label: 'Ngữ Pháp N4', equiv: 'Mẫu câu biểu thị lý do, điều kiện & giả định' },
    { code: 'N3', label: 'Ngữ Pháp N3', equiv: 'Mẫu câu trung cấp biểu thị cảm xúc & so sánh' },
    { code: 'N2', label: 'Ngữ Pháp N2', equiv: 'Mẫu câu trang trọng, kính ngữ & văn phong công sở' },
    { code: 'N1', label: 'Ngữ Pháp N1', equiv: 'Cấu trúc văn viết, sách báo & văn học cổ điển' },
  ];

  // 🇨🇳 TIẾNG TRUNG HSK
  const hskLevels = [
    { code: 'HSK1', label: 'Tiếng Trung HSK 1', equiv: 'Sơ cấp 1 (Tương đương N5)' },
    { code: 'HSK2', label: 'Tiếng Trung HSK 2', equiv: 'Sơ cấp 2 (Tương đương N4)' },
    { code: 'HSK3', label: 'Tiếng Trung HSK 3', equiv: 'Trung cấp 1 (Tương đương N3)' },
    { code: 'HSK4', label: 'Tiếng Trung HSK 4', equiv: 'Trung cấp 2 (Tương đương N2)' },
    { code: 'HSK5', label: 'Tiếng Trung HSK 5', equiv: 'Cao cấp (Tương đương N1)' },
    { code: 'HSK6', label: 'Tiếng Trung HSK 6', equiv: 'Thành thạo (Trình độ trên N1)' },
  ];

  // 🏮 TIẾNG TRUNG CƠ BẢN
  const basicChineseLevels = [
    { code: 'CB1', label: 'Tiếng Trung Cơ Bản 1', equiv: 'Nhập môn - Nhận diện chữ & giao tiếp cơ bản' },
    { code: 'CB2', label: 'Tiếng Trung Cơ Bản 2', equiv: 'Sơ cấp - Mở rộng từ vựng giao tiếp hàng ngày' },
    { code: 'CB3', label: 'Tiếng Trung Cơ Bản 3', equiv: 'Trung cấp - Làm quen câu phức & giao tiếp thành thạo' },
    { code: 'CB4', label: 'Tiếng Trung Cơ Bản 4', equiv: 'Nâng cao (Sắp ra mắt)' },
    { code: 'CB5', label: 'Tiếng Trung Cơ Bản 5', equiv: 'Nâng cao (Sắp ra mắt)' },
    { code: 'CB6', label: 'Tiếng Trung Cơ Bản 6', equiv: 'Chuyên sâu (Sắp ra mắt)' },
  ];

  // ⛩️ TIẾNG TRUNG PHỒN THỂ
  const traditionalChineseLevels = [
    { code: 'A1', label: 'Phồn Thể A1', equiv: 'Nhập môn (Sơ cấp 1) - Từ vựng & Giao tiếp cơ bản' },
    { code: 'A2', label: 'Phồn Thể A2', equiv: 'Sơ cấp 2 - Mở rộng chủ đề cuộc sống hàng ngày' },
    { code: 'B1', label: 'Phồn Thể B1', equiv: 'Trung cấp 1 - Đọc hiểu đoạn văn & diễn đạt ý kiến' },
    { code: 'B2', label: 'Phồn Thể B2', equiv: 'Trung cấp 2 - Thảo luận chuyên sâu & làm việc' },
    { code: 'C1', label: 'Phồn Thể C1', equiv: 'Cao cấp 1 - Sử dụng linh hoạt trong học thuật/kinh doanh' },
    { code: 'C2', label: 'Phồn Thể C2', equiv: 'Thành thạo - Tương đương người bản xứ' },
  ];

  // 🇬🇧 TIẾNG ANH CEFR
  const englishLevels = [
    { code: 'A1', label: 'Tiếng Anh A1', equiv: 'Căn bản (Beginner) - Từ vựng & Mẫu câu giao tiếp nhập môn' },
    { code: 'A2', label: 'Tiếng Anh A2', equiv: 'Sơ cấp (Elementary) - Chủ đề giao tiếp thông dụng hàng ngày' },
    { code: 'B1', label: 'Tiếng Anh B1', equiv: 'Trung cấp (Intermediate) - Diễn đạt ý kiến & Đọc hiểu đời sống' },
    { code: 'B2', label: 'Tiếng Anh B2', equiv: 'Trung cao cấp (Upper-Intermediate) - Thảo luận & Học thuật/Công việc' },
    { code: 'C1', label: 'Tiếng Anh C1', equiv: 'Cao cấp (Advanced) - Sử dụng linh hoạt trong môi trường chuyên nghiệp' },
    { code: 'C2', label: 'Tiếng Anh C2', equiv: 'Thành thạo (Proficient) - Trình độ tương đương người bản xứ' },
  ];

  const handleOpenMyProfile = () => {
    const myWords = leaderboardData.find((p) => p.is_current)?.total_words || 0;
    setSelectedProfile({
      id: user.id,
      display_name: displayName,
      avatar_url: currentAvatarUrl,
      role: userRole,
      total_words: myWords,
      is_current: true,
    });
  };

  return {
    router,
    user,
    userRole,
    loading,
    displayName,
    leaderboardData,
    currentAvatarUrl,
    selectedProfile,
    setSelectedProfile,
    totalSystemCards,
    isLevelModalOpen,
    setIsLevelModalOpen,
    isGrammarModalOpen,
    setIsGrammarModalOpen,
    isHskModalOpen,
    setIsHskModalOpen,
    isBasicChineseModalOpen,
    setIsBasicChineseModalOpen,
    isTraditionalChineseModalOpen,
    setIsTraditionalChineseModalOpen,
    isEnglishModalOpen,
    setIsEnglishModalOpen,
    levels,
    grammarLevels,
    hskLevels,
    basicChineseLevels,
    traditionalChineseLevels,
    englishLevels,
    handleOpenMyProfile,
    handleToggleRoleFromModal,
    handleResetPasswordFromModal,
  };
}