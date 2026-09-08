# vote-frontend

Giao diện bình chọn tiết mục văn nghệ, style Kahoot, mobile-first. Dùng chung
với `vote-backend` đã có sẵn (xem thư mục `backend-patch/` đi kèm để thêm
tính năng Pause/Resume vào backend).

## Cài đặt

```bash
npm install
cp .env.example .env
# Điền VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (lấy trong Supabase > Settings > API,
# dùng anon key, KHÔNG dùng service role key), VITE_API_BASE_URL trỏ tới vote-backend.
npm run dev
```

Mở `http://localhost:5173/?session=<sessionId>` cho người xem,
`http://localhost:5173/admin?session=<sessionId>` cho MC/admin.

## Luồng hoạt động

1. Người dùng đăng nhập bằng magic link email (Supabase Auth OTP) — email phải
   thuộc domain được backend cho phép (`ALLOWED_EMAIL_DOMAIN`), nếu không sẽ bị
   backend trả về lỗi `forbidden_domain` khi gọi API đầu tiên.
2. Sau khi đăng nhập, app gọi `POST /api/join` (idempotent) rồi bắt đầu poll
   `GET /api/session/:id` mỗi 1.5s để đồng bộ trạng thái với các máy khác —
   không dùng WebSocket, cùng triết lý polling ngắn mà backend đã dùng ở
   `closeSessionCron.ts`, nên không cần thêm hạ tầng realtime.
3. Trạng thái `session.status` quyết định màn hình:
   - `pending`: câu hỏi hiện ra nhưng đáp án bị khóa (chờ MC bấm Bắt đầu).
   - `active`: vòng đếm ngược chạy (tick mượt ở client giữa các lần poll dựa
     trên `ended_at` trả về từ server), đáp án mở để chọn/đổi.
   - `paused`: vòng đếm đứng yên ở `remaining_seconds`, đáp án bị khóa lại.
   - `closed`: tự động gọi `GET /api/results/:id` và hiển thị bảng xếp hạng
     ngay lập tức — đây là phần "hiển thị kết quả liền" mà không cần MC làm gì
     thêm, mọi người tham gia đều tự thấy kết quả khi trạng thái chuyển sang
     `closed` (dù do hết giờ tự động qua cron, hay do MC bấm "Kết thúc ngay").
4. Trang admin (`/admin`) có thêm các nút Bắt đầu / Tạm dừng / Tiếp tục / Kết
   thúc ngay, gọi thẳng các endpoint tương ứng ở `vote-backend` (yêu cầu
   `isAdmin`).

## Vì sao poll thay vì Supabase Realtime?

Để không phải mở thêm RLS policies cho `sessions`/`selections`/`votes` (hiện
tại chỉ backend service-role được đọc/ghi các bảng này) và giữ nguyên mô hình
bảo mật đang có: mọi truy cập dữ liệu đều đi qua backend, frontend chỉ dùng
Supabase Auth để lấy JWT. Poll 1.5s là đủ mượt cho quy mô ~150 người và không
tạo tải đáng kể.

## Trạng thái session cần thêm ở backend

Xem `backend-patch/` — cần thêm cột `remaining_seconds`, `paused_at` và trạng
thái `pending`/`paused` vào bảng `sessions`, cùng 2 endpoint mới
`/session/:id/pause` và `/session/:id/resume`. Khi tạo session mới (hiện chưa
có endpoint tạo — đang thao tác tay trên Supabase), nhớ set `status = 'pending'`
làm mặc định.

## Build production

```bash
npm run build   # ra thư mục dist/, deploy lên Vercel/Netlify tuỳ ý
```
