const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Chỉ dùng để FE tự route đúng màn hình (UX) sau khi đăng nhập.
 * KHÔNG phải kiểm tra bảo mật thật - mọi API ghi/đọc nhạy cảm đều được
 * backend (authMiddleware + requireAdmin) verify lại độc lập bằng ADMIN_EMAILS
 * phía server, nên dù giá trị này bị sửa/giả mạo trên client cũng không
 * tạo ra lỗ hổng quyền thật.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
