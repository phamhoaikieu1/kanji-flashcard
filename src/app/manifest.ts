import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kanji Flashcard',
    short_name: 'KanjiApp',
    description: 'Ứng dụng học chữ Kanji thông minh',
    start_url: '/',
    display: 'standalone', // 👈 Dòng này quyết định việc ẩn thanh URL Safari
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}