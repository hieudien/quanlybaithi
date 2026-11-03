# Chuyển demo sang Next.js + Supabase

Chạy demo: `python serve.py` (ở thư mục gốc) rồi mở http://localhost:5173. Cần http vì dùng ES modules.

## Mô hình truy cập

- **Giáo viên**: có tài khoản (Supabase Auth, email + mật khẩu hoặc magic link).
- **Phụ huynh**: KHÔNG tài khoản. Mỗi học sinh có 1 `token` bí mật (20 ký tự). Giáo viên gửi link `https://<domain>/p/<token>`, phụ huynh bấm là xem bài **đã đăng** của đúng học sinh đó. Thiết bị nhớ các link đã mở (localStorage) để chuyển giữa các con.
- Ai có link là xem được → giáo viên có nút **Đổi link** (tạo token mới, link cũ chết) khi link bị lộ.

Nút "Đổi tài khoản" ở view phụ huynh chỉ dành cho demo (quay về trang chọn vai trò). Bản thật bỏ nút này ở `app/p/[token]`; giáo viên đổi thành "Đăng xuất".

## Ánh xạ file → route

| Demo | Next.js (app router) |
|---|---|
| `index.html` | `app/page.tsx` (giới thiệu và hướng dẫn) |
| `start.html` | `app/login/page.tsx` (đăng nhập giáo viên; bỏ phần link mẫu phụ huynh) |
| `teacher/exams.html` | `app/teacher/exams/page.tsx` |
| `teacher/exam.html?id=` | `app/teacher/exams/[id]/page.tsx` |
| `teacher/classes.html` | `app/teacher/classes/page.tsx` |
| `parent/index.html?t=` | `app/p/[token]/page.tsx` (danh sách + chi tiết cùng trang: ≥768px pane bên phải, <768px sheet toàn màn hình; chọn bài có thể đồng bộ `?paper=<id>` trên URL) |
| `css/tokens.css` | `app/globals.css` (hoặc map sang `tailwind.config`) |
| `lib/ui.js` | `components/` (`shell` → `layout.tsx`, `sheet` → `Dialog`) + `lib/format.ts` |
| `lib/db.js` | `lib/db.ts` — **viết lại file này, UI giữ nguyên chữ ký hàm** |

## Việc phải làm khi viết lại `db.js`

- `load/save(table)` → `supabase.from(table)`; join trong `queryPapers`/`listExams` → nested select (`select('*, student:students(*), exam:exams(*, subject:subjects(*), type:exam_types(*))')`).
- `login/logout/currentUser` → Supabase Auth (chỉ giáo viên). `only("teacher")` → RLS.
- **Nhóm "Phụ huynh"** (`getChild`, `listChildPapers`, `getChildPaper`, `markViewed`) → mỗi hàm là 1 RPC `security definer` nhận `token`, gọi bằng anon key. **Không** mở `select` trực tiếp cho `anon` trên bảng nào.
- **Ảnh**: `putImage` → `storage.from('papers').upload` (bucket **private**). Phụ huynh không có session nên không tự tạo signed URL được → RPC `child_paper(token, id)` trả về kèm đường dẫn, rồi gọi Route Handler/Server Action (service role) kiểm tra token và `createSignedUrl(path, 3600)`. Không để bucket public.
- `uid()` → `gen_random_uuid()` mặc định ở DB. `newToken()` → `encode(gen_random_bytes(15), 'hex')`.
- Trang: `await db...` ở đầu file → Server Component hoặc `useEffect`; `render()` → JSX; `esc()` bỏ (JSX tự escape). Bỏ `localStorage` `qlbt:kids` giữ nguyên (đó là tiện ích phía thiết bị).
- Chống dò token: rate-limit RPC (Supabase: dùng Edge Function hoặc Vercel/Upstash limiter), trả cùng một lỗi cho token sai.

## Schema gợi ý

```sql
create table profiles (id uuid primary key references auth.users, name text);           -- chỉ giáo viên
create table classes (id uuid primary key default gen_random_uuid(), name text, year text);
create table students (id uuid primary key default gen_random_uuid(), class_id uuid references classes, name text,
                       token text unique not null default encode(gen_random_bytes(15), 'hex'));
create table subjects (id uuid primary key default gen_random_uuid(), name text);
create table exam_types (id uuid primary key default gen_random_uuid(), name text, weight int);
create table exams (id uuid primary key default gen_random_uuid(), title text, class_id uuid references classes, subject_id uuid references subjects, type_id uuid references exam_types, date date, term text, max_score numeric);
create table papers (id uuid primary key default gen_random_uuid(), exam_id uuid references exams, student_id uuid references students, score numeric, comment text, status text check (status in ('draft','published')), published_at timestamptz, unique (exam_id, student_id));
create table paper_images (id uuid primary key default gen_random_uuid(), paper_id uuid references papers on delete cascade, path text, position int);
create table paper_views (paper_id uuid primary key references papers on delete cascade, viewed_at timestamptz default now());
```

## RLS

- Bật RLS mọi bảng. Giáo viên (`auth.uid()` có trong `profiles`): đọc/ghi tất cả. `anon`: không policy nào (= không truy cập trực tiếp).
- Phụ huynh đi qua RPC: `child_papers(token)` chỉ trả bài `status = 'published'` của học sinh có `token` đó; `mark_viewed(token, paper_id)` kiểm tra bài thuộc học sinh đó.
- Storage `papers` (private): chỉ giáo viên upload/đọc trực tiếp; phụ huynh nhận signed URL ngắn hạn qua server như trên.

## Chưa làm trong demo (v2)

Thông báo khi có bài mới, phụ huynh phản hồi, vẽ/khoanh trên ảnh, upload hàng loạt gán học sinh, so sánh trung bình lớp, xuất PDF, nhiều giáo viên/trường, audit log, hết hạn link.
