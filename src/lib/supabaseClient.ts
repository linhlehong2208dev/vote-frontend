import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Xem file .env.example.'
  );
}

// Client này CHỈ dùng anon key (an toàn để lộ ở frontend) - chỉ để đăng nhập
// (magic link) và lấy JWT gửi kèm request lên backend. Không đọc/ghi trực tiếp
// dữ liệu Supabase từ đây, mọi thao tác dữ liệu đều đi qua backend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
