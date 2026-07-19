import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Khởi tạo một đối tượng kết nối duy nhất để dùng cho toàn bộ Frontend công khai
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);