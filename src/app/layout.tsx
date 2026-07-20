import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SessionGuard from "@/components/SessionGuard"; // 👈 Import bộ bảo vệ phiên ở đây

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kanji Flashcard App",
  description: "Ứng dụng rèn luyện Kanji tối ưu dành riêng cho Trang Dang Sensei",
};

// Giữ nguyên cấu hình khóa cứng zoom trên iPhone cực chuẩn của bạn
export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  maximumScale: 1,     
  userScalable: false, 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        <Toaster position="top-center" reverseOrder={false} />
        
        {/* Bọc toàn bộ luồng trang qua SessionGuard để xử lý PWA */}
        <SessionGuard>
          {children}
        </SessionGuard>
      </body>
    </html>
  );
}