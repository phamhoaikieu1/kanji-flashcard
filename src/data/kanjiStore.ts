// Định nghĩa kiểu dữ liệu (Interface) cho 1 thẻ Kanji chuẩn chỉnh
export interface KanjiCard {
  id: number;
  kanji: string;
  ja_writing: string;
  zh_pronunciation: string;
  han_viet: string;
  vi_meaning: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  tags: string[];
}

// Kho dữ liệu mẫu tập trung (Single Source of Truth)
export const KANJI_DATA: KanjiCard[] = [
  {
    id: 1,
    kanji: "日",
    ja_writing: "ひ / にち (hi / nichi)",
    zh_pronunciation: "rì",
    han_viet: "Nhật",
    vi_meaning: "Ngày, mặt trời, nước Nhật",
    level: "N5",
    tags: ["thời gian", "tự nhiên"]
  },
  {
    id: 2,
    kanji: "月",
    ja_writing: "つき / げつ (tsuki / getsu)",
    zh_pronunciation: "yuè",
    han_viet: "Nguyệt",
    vi_meaning: "Tháng, mặt trăng",
    level: "N5",
    tags: ["thời gian", "tự nhiên"]
  },
  {
    id: 3,
    kanji: "水",
    ja_writing: "みず / スイ (mizu / sui)",
    zh_pronunciation: "shuǐ",
    han_viet: "Thủy",
    vi_meaning: "Nước",
    level: "N5",
    tags: ["tự nhiên", "sinh hoạt"]
  }
];