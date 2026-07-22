import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export function useGrammar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLevel = searchParams.get('level') || 'N1';

  const [allCards, setAllCards] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [leaveDirection, setLeaveDirection] = useState<'left' | 'right' | null>(null);
  
  // Trạng thái Thuộc & Lưu
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Bộ lọc
  const [filterMode, setFilterMode] = useState<'all' | 'learned' | 'unlearned' | 'saved'>('all');
  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [availableLessons, setAvailableLessons] = useState<number[]>([]);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Cấu hình mặt trước
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [frontConfig, setFrontConfig] = useState({
    grammar_point: true,
    structure: true,
  });

  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerInlineAlert = (type: 'success' | 'error', message: string) => {
    setInlineAlert({ type, message });
    setTimeout(() => setInlineAlert(null), 2500);
  };

  // Khôi phục LocalStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`grammar_state_${selectedLevel}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.currentIndex !== undefined) setCurrentIndex(parsed.currentIndex);
        if (parsed.filterMode) setFilterMode(parsed.filterMode);
        if (parsed.isRandom !== undefined) setIsRandom(parsed.isRandom);
        if (parsed.selectedLessons) setSelectedLessons(parsed.selectedLessons);
        if (parsed.frontConfig) setFrontConfig(parsed.frontConfig);
      } catch (e) {
        console.error('Lỗi khi đọc LocalStorage:', e);
      }
    } else {
      setCurrentIndex(0);
      setFilterMode('all');
      setIsRandom(false);
    }
  }, [selectedLevel]);

  // Fetch dữ liệu chuẩn xác từ Supabase
  useEffect(() => {
    const fetchCardsAndProgress = async () => {
      setLoadingData(true);
      try {
        // Query trực tiếp lấy dữ liệu
        const { data, error } = await supabase
          .from('grammar_cards')
          .select('*')
          .order('card_id', { ascending: true });

        if (error) {
          console.error('❌ Lỗi kết nối Supabase:', error.message);
          triggerInlineAlert('error', `Lỗi Supabase: ${error.message}`);
          setLoadingData(false);
          return;
        }

        if (data && data.length > 0) {
          // Chuẩn hóa Level (loại bỏ khoảng trắng)
          const targetLevel = selectedLevel.trim().toUpperCase();
          const filtered = data.filter(
            (card) => card.level && card.level.toString().trim().toUpperCase() === targetLevel
          );

          // Trích xuất số bài học từ card_id (VD: N1_G01_001 -> Bài 1)
          const formattedCards = (filtered.length > 0 ? filtered : data).map((card) => {
            const match = card.card_id?.match(/_G(\d+)_/);
            const lessonNum = match ? parseInt(match[1], 10) : 1;
            return { ...card, lesson: lessonNum };
          });

          setAllCards(formattedCards);

          const lessons = Array.from(new Set(formattedCards.map((c: any) => c.lesson)))
            .sort((a: any, b: any) => a - b) as number[];
          setAvailableLessons(lessons);

          const savedState = localStorage.getItem(`grammar_state_${selectedLevel}`);
          if (!savedState || selectedLessons.length === 0) {
            setSelectedLessons(lessons);
          }

          triggerInlineAlert('success', `🎯 Trình độ ${selectedLevel}: Đã nạp ${formattedCards.length} mẫu ngữ pháp!`);
        } else {
          console.warn('⚠️ Supabase trả về mảng rỗng (Kiểm tra RLS Policy trên Supabase)!');
        }

        // Tải User Progress
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [memorizedRes, savedRes] = await Promise.all([
            supabase.from('user_memorized_grammar').select('card_id').eq('user_id', user.id),
            supabase.from('user_saved_grammar').select('card_id').eq('user_id', user.id)
          ]);

          if (memorizedRes.data) setMemorizedIds(memorizedRes.data.map((item: any) => item.card_id));
          if (savedRes.data) setSavedIds(savedRes.data.map((item: any) => item.card_id));
        }
      } catch (err: any) {
        console.error('Lỗi Fetch Data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchCardsAndProgress();
  }, [selectedLevel]);

  // Lọc danh sách thẻ
  const displayCards = allCards.filter((card) => {
    const isLessonMatch = selectedLessons.length === 0 || selectedLessons.includes(card.lesson);
    const isLearned = memorizedIds.includes(card.card_id);
    const isSaved = savedIds.includes(card.card_id);

    if (!isLessonMatch) return false;
    if (filterMode === 'learned') return isLearned;
    if (filterMode === 'unlearned') return !isLearned;
    if (filterMode === 'saved') return isSaved;
    return true;
  });

  useEffect(() => {
    setIsFlipped(false);
    if (displayCards.length > 0 && currentIndex >= displayCards.length) {
      setCurrentIndex(0);
    }
  }, [filterMode, selectedLessons, isRandom, displayCards.length]);

  useEffect(() => {
    if (!loadingData && allCards.length > 0) {
      const stateToSave = {
        currentIndex,
        filterMode,
        isRandom,
        selectedLessons,
        frontConfig,
      };
      localStorage.setItem(`grammar_state_${selectedLevel}`, JSON.stringify(stateToSave));
    }
  }, [currentIndex, filterMode, isRandom, selectedLessons, frontConfig, selectedLevel, loadingData, allCards]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setLeaveDirection('left');
    setTimeout(() => {
      setLeaveDirection(null);
      if (displayCards.length <= 1) {
        setCurrentIndex(0);
        return;
      }
      if (isRandom) {
        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * displayCards.length);
        }
        setCurrentIndex(nextIndex);
      } else {
        setCurrentIndex(currentIndex < displayCards.length - 1 ? currentIndex + 1 : 0);
      }
    }, 200);
  };

  const handlePrevCard = () => {
    if (currentIndex === 0) return;
    setIsFlipped(false);
    setLeaveDirection('right');
    setTimeout(() => {
      setLeaveDirection(null);
      setCurrentIndex(currentIndex - 1);
    }, 200);
  };

  const handleToggleMemorize = async (cardId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      triggerInlineAlert('error', 'Vui lòng đăng nhập!');
      return;
    }
    const isAlreadyMemorized = memorizedIds.includes(cardId);
    if (isAlreadyMemorized) {
      const { error } = await supabase
        .from('user_memorized_grammar')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setMemorizedIds((prev) => prev.filter((id) => id !== cardId));
        triggerInlineAlert('success', 'Đã bỏ đánh dấu thuộc.');
        if (filterMode === 'learned') handleNextCard();
      }
    } else {
      const { error } = await supabase
        .from('user_memorized_grammar')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setMemorizedIds((prev) => [...prev, cardId]);
        triggerInlineAlert('success', '🎉 Đã thuộc mẫu ngữ pháp này!');
        if (filterMode === 'unlearned') handleNextCard();
      }
    }
  };

  const handleToggleSave = async (cardId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      triggerInlineAlert('error', 'Vui lòng đăng nhập!');
      return;
    }
    const isAlreadySaved = savedIds.includes(cardId);
    if (isAlreadySaved) {
      const { error } = await supabase
        .from('user_saved_grammar')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setSavedIds((prev) => prev.filter((id) => id !== cardId));
        triggerInlineAlert('success', 'Đã bỏ lưu ngữ pháp này.');
        if (filterMode === 'saved') handleNextCard();
      }
    } else {
      const { error } = await supabase
        .from('user_saved_grammar')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setSavedIds((prev) => [...prev, cardId]);
        triggerInlineAlert('success', '⭐ Đã lưu ngữ pháp quan trọng!');
      }
    }
  };

  const safeIndex = currentIndex < displayCards.length ? currentIndex : 0;
  const currentCard = displayCards[safeIndex];

  return {
    router,
    selectedLevel,
    loadingData,
    displayCards,
    currentCard,
    currentIndex: safeIndex,
    isFlipped,
    setIsFlipped,
    leaveDirection,
    memorizedIds,
    savedIds,
    filterMode,
    setFilterMode,
    isRandom,
    setIsRandom,
    selectedLessons,
    setSelectedLessons,
    availableLessons,
    isLessonModalOpen,
    setIsLessonModalOpen,
    isDisplayModalOpen,
    setIsDisplayModalOpen,
    frontConfig,
    setFrontConfig,
    inlineAlert,
    handleNextCard,
    handlePrevCard,
    handleToggleMemorize,
    handleToggleSave,
  };
}