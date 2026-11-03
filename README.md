# Quản lý bài thi

Web để giáo viên đăng ảnh bài thi giấy của học sinh, kèm điểm và nhận xét. Phụ huynh xem kết quả từng bài qua một đường link riêng, không cần tạo tài khoản.

Trạng thái:
- `demo/`: bản HTML thuần, dữ liệu trong trình duyệt. Giữ để đối chiếu.
- `web/`: bản **Next.js** (App Router, TypeScript) đã chuyển đủ giao diện và luồng, vẫn dùng **dữ liệu demo trong trình duyệt** (`web/lib/db.ts`), **chưa nối Supabase**.
- Bước tiếp theo: nối Supabase, không viết backend riêng. Kế hoạch ở cuối file được viết để Claude thực hiện.

## Chạy bản Next.js (web/)

```bash
cd web
npm install
npm run dev
```

Mở http://localhost:3000. Trang `/` là giới thiệu, `/start` để chọn giáo viên hoặc link mẫu phụ huynh.

## Chạy demo HTML (demo/)

```bash
python serve.py
```

Mở http://localhost:5173. Điện thoại cùng mạng Wi-Fi mở `http://<IP máy tính>:5173`.

- Cần chạy qua http (không mở file trực tiếp) vì demo dùng ES modules.
- Dữ liệu nằm trong trình duyệt của từng máy (localStorage + IndexedDB), **không chia sẻ giữa các máy**. Link phụ huynh chép từ máy này không mở được trên máy khác.
- Mở bằng IP LAN không phải secure context: không có `crypto.randomUUID` và `navigator.clipboard`, code đã có cách dự phòng.
- Muốn tạo lại dữ liệu mẫu: nút "Đặt lại dữ liệu mẫu" ở `start.html`, hoặc tăng `SEED_VERSION` trong `demo/lib/db.js`.

## Cấu trúc

```
web/                    bản Next.js (xem bảng ánh xạ bên dưới)
  app/page.tsx          giới thiệu và hướng dẫn
  app/start/page.tsx    chọn vai trò
  app/teacher/...       exams, exams/[id], classes (layout dùng components/Shell)
  app/p/[token]/        trang phụ huynh qua link
  components/           Shell, Sheet (+FilterSheet, ZoomSheet), Toast, ui
  lib/db.ts             lớp dữ liệu duy nhất (hiện: localStorage + IndexedDB)
  lib/format.ts         định dạng ngày/điểm, nén ảnh, chép clipboard
  app/globals.css       tokens + component (copy từ demo/css)
demo/
  index.html            giới thiệu tính năng và hướng dẫn sử dụng
  start.html            chọn vai trò (giáo viên / link mẫu phụ huynh)
  teacher/
    exams.html          danh sách bài thi, lọc, tạo bài thi
    exam.html           bài làm của một bài thi: thêm ảnh, điểm, nhận xét, nháp/đăng
    classes.html        lớp, học sinh, chép/đổi link phụ huynh
  parent/index.html     kết quả của con: danh sách + chi tiết cạnh nhau (?t=<token>)
  lib/db.js             lớp dữ liệu duy nhất (localStorage + IndexedDB)
  lib/ui.js             helper giao diện (khung trang, sheet, toast, lọc, nén ảnh)
  css/tokens.css        design tokens
  css/app.css           component
  MIGRATION.md          chi tiết kỹ thuật khi chuyển (schema, RLS, ánh xạ route)
serve.py                server tĩnh tắt cache cho demo
.claude/ui-rules.md     quy tắc giao diện (mobile-first, a11y)
```

## Mô hình truy cập

| Vai trò | Đăng nhập | Xem được |
|---|---|---|
| Giáo viên | Tài khoản (Supabase Auth) | Tất cả lớp, học sinh, bài thi, bản nháp |
| Phụ huynh | Không. Dùng link `/p/<token>` | Chỉ bài **đã đăng** của đúng học sinh có token đó |

Mỗi học sinh có một `token` ngẫu nhiên. Giáo viên gửi link qua Zalo hoặc tin nhắn. Link bị lộ thì giáo viên bấm "Đổi link" để tạo token mới, link cũ vô hiệu.

## Kế hoạch chuyển sang Next.js + Supabase (cho Claude thực hiện)

### Quy tắc làm việc

1. Đọc trước khi code: `CLAUDE.md`, `.claude/ui-rules.md`, `demo/MIGRATION.md`, `demo/lib/db.js`.
2. Giữ nguyên tên hàm, tham số và kiểu dữ liệu trả về của `demo/lib/db.js` khi viết `lib/db.ts`. Trang nào gọi `db.xyz()` ở demo thì bản Next gọi cùng tên.
3. Giữ nguyên class CSS và token. Copy `demo/css/*.css` vào `app/globals.css`, không thêm Tailwind, không đổi giao diện.
4. Giữ nguyên chữ trên giao diện (tiếng Việt) và hành vi (trạng thái loading, rỗng, lỗi, disabled, xác nhận khi xóa).
5. Mỗi giai đoạn: làm xong, chạy mục "Kiểm tra", rồi dừng và báo kết quả cho người dùng trước khi sang giai đoạn sau. Không tự sang giai đoạn tiếp theo.
6. Mọi thay đổi giao diện phải xem ở 360px, 768px, 1280px bằng trình duyệt và chạy checklist ở `.claude/ui-rules.md` mục 9.
7. Không tự tạo tài khoản dịch vụ, không nhập hay in ra khóa bí mật. Khi cần, nhờ người dùng.

### Người dùng cần làm trước

Claude không tạo được các thứ này, cần người dùng chuẩn bị và cung cấp:

- Tài khoản và project **Supabase**. Cung cấp: Project URL, `anon` key. Giai đoạn 4 cần thêm `service_role` key (chỉ đặt vào `.env.local` và biến môi trường Vercel, không dán vào chat, không commit).
- Tài khoản **Vercel** (cho giai đoạn 5) và kho git để deploy.
- Tài khoản email của giáo viên để đăng nhập thử.
- Quyết định: đăng nhập giáo viên bằng email + mật khẩu hay magic link (mặc định: email + mật khẩu).

### Tiến độ

| Giai đoạn | Trạng thái |
|---|---|
| 0. Khởi tạo | Xong (Next 16, không Tailwind, font `next/font`) |
| 1. Cơ sở dữ liệu | Chưa |
| 2. Đăng nhập giáo viên, `db.ts` | `db.ts` đã có bản dữ liệu demo cùng chữ ký; chưa có đăng nhập thật |
| 3. Trang giáo viên | Xong giao diện và luồng (dữ liệu demo) |
| 4. Trang phụ huynh qua token | Xong giao diện và luồng (dữ liệu demo); chưa RPC, signed URL, chống dò token |
| 5. Trang giới thiệu, triển khai | Giới thiệu xong; chưa deploy |

Khi nối Supabase chỉ cần viết lại `web/lib/db.ts` (giữ tên hàm và kiểu) và thêm đăng nhập, các trang không phải đổi logic. Lưu ý: `web/eslint.config.mjs` đang tắt rule `react-hooks/set-state-in-effect` vì dữ liệu demo nạp trong effect phía client; khi chuyển sang Server Component thì bật lại.

### Giai đoạn 0. Khởi tạo dự án

Việc làm:
- Tạo app Next.js (App Router, TypeScript, ESLint, không Tailwind) trong thư mục `web/`, giữ `demo/` nguyên để đối chiếu.
- Copy `demo/css/tokens.css` và `demo/css/app.css` vào `web/app/globals.css` (tokens trước, component sau).
- Font Be Vietnam Pro qua `next/font/google`, subset `vietnamese` và `latin`, gán vào biến `--font`.
- Cài `@supabase/supabase-js` và `@supabase/ssr`. Tạo `.env.example` (không có giá trị thật), `.env.local` do người dùng điền.
- `<html lang="vi">`, viewport có `viewport-fit=cover`.

Kiểm tra: `npm run build` thành công; trang chủ hiển thị đúng font và màu như `demo/index.html`.

### Giai đoạn 1. Cơ sở dữ liệu

Việc làm:
- Viết `supabase/migrations/0001_init.sql` theo schema trong `demo/MIGRATION.md`: `profiles`, `classes`, `students` (có `token`), `subjects`, `exam_types`, `exams`, `papers`, `paper_images`, `paper_views`.
- Bật RLS mọi bảng. Policy: giáo viên (có dòng trong `profiles`) đọc/ghi tất cả; **`anon` không có policy nào**.
- Viết RPC `security definer` cho phụ huynh, nhận `token`: `child_info(token)`, `child_papers(token)`, `mark_viewed(token, paper_id)`. Token sai trả cùng một kết quả rỗng/lỗi, không phân biệt "sai" và "không tồn tại".
- Tạo bucket Storage `papers` private, policy chỉ giáo viên upload/đọc.
- Viết `supabase/seed.sql` từ dữ liệu mẫu trong `seed()` của `db.js`: môn Toán, loại bài (15 phút ×1, 45 phút ×2, giữa kỳ ×2, cuối kỳ ×3), 2 lớp, học sinh. Ảnh mẫu bỏ qua.
- Người dùng chạy migration (SQL Editor hoặc `supabase db push`) và báo lại.

Kiểm tra: với `anon` key, `select` từng bảng trả về rỗng/bị từ chối; `child_papers` với token đúng chỉ trả bài `published`, token sai không trả gì.

### Giai đoạn 2. Đăng nhập giáo viên và `lib/db.ts`

Việc làm:
- Trang `/login` (email + mật khẩu, lỗi hiển thị cạnh trường theo `ui-rules`), middleware chặn `/teacher/*` khi chưa đăng nhập, nút "Đăng xuất" thay "Đổi tài khoản".
- `lib/supabase/{client,server}.ts` dùng `@supabase/ssr`.
- `lib/db.ts`: hàm phía giáo viên giữ nguyên chữ ký từ `db.js`: `listClasses`, `createClass`, `listStudents`, `createStudents`, `resetToken`, `listSubjects`, `listExamTypes`, `listExams`, `getExam`, `createExam`, `listPapers`, `getPaper`, `savePaper`, `deletePaper`, `publishDrafts`. Join dùng nested select. Ảnh: `putImage` → `storage.upload`, `getImageUrl` → `createSignedUrl`.
- `lib/format.ts`: `esc` bỏ; chuyển `fmtDate`, `fmtScore`, `parseScore`, `compressImage` từ `ui.js`.

Kiểm tra: viết script hoặc trang thử gọi từng hàm với tài khoản giáo viên thật; tạo lớp, học sinh, bài thi, bài làm có ảnh; tải lại vẫn còn.

### Giai đoạn 3. Chuyển các trang giáo viên

Việc làm (mỗi trang đối chiếu với file demo tương ứng):
- `app/teacher/exams/page.tsx` ← `demo/teacher/exams.html`.
- `app/teacher/exams/[id]/page.tsx` ← `demo/teacher/exam.html`.
- `app/teacher/classes/page.tsx` ← `demo/teacher/classes.html`.
- `components/Shell.tsx` (topbar + tabbar có icon, dưới 768px nằm đáy màn hình), `components/Sheet.tsx` (dùng thẻ `<dialog>`, bottom sheet trên mobile), `Toast`, `FilterSheet`, `Skeleton`, `Empty`.
- Giữ: nén ảnh phía client, lưu nháp/đăng, "Đăng N bài nháp", lọc, xác nhận xóa, mặc định đóng các lớp (collapse), badge tên lớp.
- Chuyển `render()` thành JSX; dữ liệu qua Server Component khi chỉ đọc, Client Component khi có tương tác. Ghi dữ liệu qua Server Action hoặc gọi trực tiếp Supabase client có RLS.

Kiểm tra: đi lại toàn bộ hướng dẫn giáo viên trong `demo/index.html` trên bản Next; so sánh ảnh chụp ở 360px và 1280px với demo; dữ liệu còn sau khi tải lại.

### Giai đoạn 4. Trang phụ huynh qua token

Việc làm:
- `app/p/[token]/page.tsx` ← `demo/parent/index.html`: danh sách + chi tiết cùng trang (≥768px pane bên phải, <768px sheet toàn màn hình), thống kê, biểu đồ SVG, lọc, nhãn "Mới", chọn con, "Thêm con" (dán link, lưu danh sách token vào localStorage `qlbt:kids`).
- Dữ liệu qua RPC của giai đoạn 1, gọi từ phía server để không lộ logic; token chỉ nằm trong URL.
- Ảnh: Route Handler `app/p/[token]/image/[...path]` kiểm tra token sở hữu ảnh rồi trả signed URL ngắn hạn (khoảng 1 giờ) bằng service role. Bucket giữ private.
- Chống dò token: giới hạn số lần thử theo IP (Upstash hoặc bảng đếm đơn giản). Token sai trả đúng một thông báo "Link không đúng".
- Không ghi token vào log, không gửi vào analytics; thêm `Referrer-Policy: no-referrer` và `X-Robots-Tag: noindex` cho `/p/*`.
- Ghi `paper_views` khi mở bài (chỉ lần đầu).

Kiểm tra (làm bằng trình duyệt và `curl`):
- Link học sinh A không xem được bài của học sinh B (đổi id trong URL).
- Bài nháp không bao giờ xuất hiện ở phía phụ huynh.
- Token sai và token của học sinh bị "Đổi link" đều trả "Link không đúng".
- Địa chỉ ảnh đã ký không dùng được sau khi hết hạn; không có đường dẫn ảnh công khai.
- Đi lại hướng dẫn phụ huynh trong `demo/index.html` ở 360px, 768px, 1280px.

### Giai đoạn 5. Trang giới thiệu, hoàn thiện, triển khai

Việc làm:
- `app/page.tsx` ← `demo/index.html` (giới thiệu và hướng dẫn); nút "Dùng thử" đổi thành "Đăng nhập giáo viên" trỏ `/login`. Cập nhật nội dung hướng dẫn nếu khác bản demo (bỏ câu về dữ liệu lưu trong trình duyệt).
- Metadata, favicon, trang 404 và trang lỗi bằng tiếng Việt, trạng thái lỗi có nút "Thử lại".
- Hướng dẫn người dùng deploy lên Vercel, đặt biến môi trường; `service_role` chỉ ở phía server.
- Kiểm tra trên điện thoại thật qua https (360px, 768px, 1280px) theo checklist `ui-rules.md`; Lighthouse accessibility.
- Nhắc người dùng bật backup Supabase và kiểm tra giới hạn Storage/băng thông của gói đang dùng.

Kiểm tra: `npm run build` và `npm run lint` sạch; một lớp thử chạy hết luồng giáo viên → phụ huynh trên bản deploy.

### Giai đoạn 6. Bổ sung (chỉ làm khi người dùng yêu cầu)

Upload hàng loạt gán học sinh, thông báo khi có bài mới (Zalo/email), phụ huynh phản hồi, khoanh/ghi chú trên ảnh, so sánh trung bình lớp, xuất PDF, nhiều giáo viên/trường, hết hạn link, nhiều môn (UI đã tự hiện ô chọn môn khi có từ 2 môn).

## Rủi ro cần xử lý

- **Ai có link là xem được.** Link bị chuyển tiếp thì người khác xem được bài của em. Đã giảm bằng nút "Đổi link". Cân nhắc thêm hạn dùng hoặc cảnh báo khi link mở từ nhiều thiết bị.
- **Dữ liệu trẻ em.** Ảnh bài thi để private, chỉ cấp URL tạm. Không ghi token vào log.
- **Dung lượng ảnh.** Ảnh được nén còn tối đa 1600px phía client; theo dõi dung lượng Storage khi nhiều lớp dùng.
- **Gói miễn phí.** Kiểm tra giới hạn Storage và băng thông của Supabase trước khi dùng thật.

## Quy ước

- Giao diện tiếng Việt, thuật ngữ nhất quán ("Bài thi", "Bài làm"), ngày `dd/MM/yyyy`, số theo `vi-VN`.
- Mọi thay đổi giao diện tuân theo [.claude/ui-rules.md](.claude/ui-rules.md).
