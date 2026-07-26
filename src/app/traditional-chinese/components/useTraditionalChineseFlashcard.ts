'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export function useTraditionalChineseFlashcard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Mặc định là A1 nếu không truyền parameter
  const selectedLevel = searchParams.get('level') || 'A1';

  const [allCards, setAllCards] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [leaveDirection, setLeaveDirection] = useState<'left' | 'right' | null>(null);
  
  // Trạng thái Thuộc & Lưu
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Bộ lọc & Cấu hình
  const [filterMode, setFilterMode] = useState<'all' | 'learned' | 'unlearned' | 'saved'>('all');
  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [availableLessons, setAvailableLessons] = useState<number[]>([]);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Cấu hình mặt trước
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [frontConfig, setFrontConfig] = useState({
    hanzi: true,
    pinyin: false,
    han_viet: false,
    vi_meaning: false,
  });

  const [inlineAlert, setInlineAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerInlineAlert = (type: 'success' | 'error', message: string) => {
    setInlineAlert({ type, message });
    setTimeout(() => setInlineAlert(null), 2500);
  };

  // 1. KHÔI PHỤC TRẠNG THÁI TỪ LOCALSTORAGE
  useEffect(() => {
    const savedState = localStorage.getItem(`traditional_chinese_flashcard_state_${selectedLevel}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.currentIndex !== undefined) setCurrentIndex(parsed.currentIndex);
        if (parsed.filterMode) setFilterMode(parsed.filterMode);
        if (parsed.isRandom !== undefined) setIsRandom(parsed.isRandom);
        if (parsed.selectedLessons) setSelectedLessons(parsed.selectedLessons);
        if (parsed.frontConfig) setFrontConfig(parsed.frontConfig);
      } catch (e) {
        console.error('Lỗi khi đọc trạng thái đã lưu:', e);
      }
    } else {
      setCurrentIndex(0);
      setFilterMode('all');
      setIsRandom(false);
    }
  }, [selectedLevel]);

  // 2. FETCH DỮ LIỆU TỪ BẢNG traditional_chinese_vocab & TIẾN ĐỘ USER
  useEffect(() => {
    const fetchCardsAndProgress = async () => {
      setLoadingData(true);
      let allFetchedCards: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('traditional_chinese_vocab')
          .select('*')
          .eq('level', selectedLevel) // Filter cấp độ A1 đến C2
          .order('card_id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Lỗi khi tải dữ liệu thẻ Phồn Thể:', error.message);
          break;
        }

        if (chunk && chunk.length > 0) {
          allFetchedCards = [...allFetchedCards, ...chunk];
          if (chunk.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      if (allFetchedCards.length > 0) {
        setAllCards(allFetchedCards);
        const lessons = Array.from(new Set(allFetchedCards.map((c: any) => c.lesson)))
          .filter((l) => l !== undefined && l !== null)
          .sort((a: any, b: any) => a - b) as number[];
        setAvailableLessons(lessons);

        const savedState = localStorage.getItem(`traditional_chinese_flashcard_state_${selectedLevel}`);
        if (!savedState) {
          setSelectedLessons(lessons);
        }

        triggerInlineAlert('success', `⛩️ Trình độ Phồn Thể ${selectedLevel}: Đã nạp ${allFetchedCards.length} từ!`);
      } else {
        setAllCards([]);
        setAvailableLessons([]);
      }

      // Tải trạng thái Thuộc & Đã lưu của User
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [memorizedRes, savedRes] = await Promise.all([
          supabase.from('user_memorized_traditional_chinese').select('card_id').eq('user_id', user.id),
          supabase.from('user_saved_traditional_chinese').select('card_id').eq('user_id', user.id)
        ]);

        if (memorizedRes.data) setMemorizedIds(memorizedRes.data.map((item: any) => item.card_id));
        if (savedRes.data) setSavedIds(savedRes.data.map((item: any) => item.card_id));
      }

      setLoadingData(false);
    };

    fetchCardsAndProgress();
  }, [selectedLevel]);

  // 3. BỘ LỌC TỪ VỰNG
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

  // 4. TỰ ĐỘNG LƯU TRẠNG THÁI
  useEffect(() => {
    if (!loadingData && allCards.length > 0) {
      const stateToSave = {
        currentIndex,
        filterMode,
        isRandom,
        selectedLessons,
        frontConfig,
      };
      localStorage.setItem(`traditional_chinese_flashcard_state_${selectedLevel}`, JSON.stringify(stateToSave));
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
        .from('user_memorized_traditional_chinese')
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
        .from('user_memorized_traditional_chinese')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setMemorizedIds((prev) => [...prev, cardId]);
        triggerInlineAlert('success', '🎉 Đã thuộc từ Phồn Thể này!');
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
        .from('user_saved_traditional_chinese')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setSavedIds((prev) => prev.filter((id) => id !== cardId));
        triggerInlineAlert('success', 'Đã bỏ lưu từ này.');
        if (filterMode === 'saved') handleNextCard();
      }
    } else {
      const { error } = await supabase
        .from('user_saved_traditional_chinese')
        .insert([{ user_id: user.id, card_id: cardId }]);

      if (error) triggerInlineAlert('error', `Lỗi: ${error.message}`);
      else {
        setSavedIds((prev) => [...prev, cardId]);
        triggerInlineAlert('success', '⭐ Đã lưu từ Phồn Thể quan trọng!');
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