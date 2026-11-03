# Quy tắc UI: mobile-first, không "AI slop"

Áp dụng cho mọi việc viết hoặc sửa giao diện (HTML/CSS/JSX/Tailwind...). Đọc hết trước khi code UI.

## 0. Quy trình bắt buộc

1. **Trước khi code**: viết 3–5 dòng "design brief" (ngắn): ai dùng (giáo viên / thí sinh / quản trị), dùng trên thiết bị nào, 1 tác vụ chính của màn hình, tông giao diện (vd: nghiêm túc, rõ ràng, ít chữ).
2. **Chốt design tokens trước** (mục 2), rồi mới viết component. Không hardcode giá trị lẻ trong component.
3. **Viết CSS cho màn 360px trước**, sau đó mới thêm breakpoint lớn hơn (`min-width`). Không viết desktop rồi "thu nhỏ".
4. **Reuse trước**: tìm component/token có sẵn trong repo. Không tạo Button/Card/Input thứ hai.
5. **Trước khi báo xong**: chạy checklist mục 9. Chụp/xem ở 360px, 768px, 1280px.

## 1. Các lỗi AI hay mắc (phải tránh)

| Lỗi | Biểu hiện | Cách đúng |
|---|---|---|
| Palette mặc định | Gradient tím-xanh, nền trắng + accent tím/indigo | 1 màu chủ đạo theo ngữ cảnh + neutral. Gradient chỉ khi có lý do |
| Font mặc định | Inter/Roboto/Arial cho mọi thứ | Chọn font có chủ đích (mục 3). Phải hỗ trợ tiếng Việt đầy đủ dấu |
| Layout rập khuôn | Hero giữa + 3 card có icon + CTA | Bố cục theo tác vụ thật, không theo template landing page |
| Card lồng card | Card trong card trong card, bóng + viền + bo to cùng lúc | Tối đa 1 cấp card. Ưu tiên khoảng trắng và đường kẻ mảnh |
| Bo góc/bóng đồng loạt | `rounded-2xl shadow-lg` ở mọi nơi | 2 mức bo góc, 2 mức shadow, dùng có hệ thống |
| Icon trang trí | Emoji/icon ở mọi tiêu đề, icon trong vòng tròn màu | Icon chỉ khi giúp nhận diện hành động. 1 bộ icon duy nhất |
| Gradient text, glow, glassmorphism | Tiêu đề gradient, blur kính vô cớ | Không dùng cho tiêu đề/số liệu |
| Chữ marketing | "Seamless", "Powerful", "Unlock"... | Chữ cụ thể, ngắn, đúng nghiệp vụ (vd: "Tạo đề thi", "Nộp bài") |
| Dữ liệu giả | "John Doe", "Lorem ipsum", số 1,234 | Dữ liệu mẫu thật theo nghiệp vụ (tên Việt, môn học, điểm hợp lý) |
| Thiếu trạng thái | Chỉ vẽ happy path | Luôn làm: loading, rỗng, lỗi, disabled, focus, hover, selected |
| Responsive giả | Desktop đẹp, mobile tràn ngang, bảng bị cắt | Mobile-first thật (mục 5) |
| Spacing tùy tiện | `mt-3`, `mt-5`, `mt-7` lẫn lộn | Chỉ dùng thang spacing đã chốt |
| A11y bị bỏ | Div làm button, contrast thấp, mất focus ring | Mục 7 |
| Animation thừa | Fade/bounce/pulse mọi nơi | Chỉ animate để báo trạng thái. Tôn trọng `prefers-reduced-motion` |

## 2. Design tokens (chốt 1 lần, khai báo ở 1 chỗ: CSS variables hoặc config Tailwind)

- **Màu**: 1 `primary`, neutral 9–10 bậc, và 4 màu trạng thái (`success`, `warning`, `danger`, `info`). Không thêm màu thứ 2 nổi bật nếu chưa có lý do. Đặt tên theo vai trò (`--color-surface`, `--color-text-muted`), không theo màu (`--blue-500` dùng trực tiếp trong component).
- **Dark mode**: nếu hỗ trợ, khai báo lại token, không đảo màu thủ công từng component.
- **Spacing**: thang 4px: 4, 8, 12, 16, 24, 32, 48, 64. Không dùng giá trị ngoài thang.
- **Bo góc**: 2 mức (vd 6px cho input/button, 12px cho card/dialog).
- **Shadow**: tối đa 2 mức. Ưu tiên viền 1px màu neutral thay shadow.
- **Z-index**: thang cố định (base 0, sticky 10, dropdown 20, modal 30, toast 40).

## 3. Typography

- Tối đa **2 font**: 1 cho tiêu đề (có thể trùng body), 1 cho nội dung. Kiểm tra render đủ dấu tiếng Việt (ă â ê ô ơ ư và dấu thanh) trước khi chọn.
- Body **≥ 16px** trên mobile. Chú thích nhỏ nhất 12–13px, không dưới 12px.
- Line-height body 1.5–1.6, tiêu đề 1.2–1.3. Độ rộng dòng chữ 45–75 ký tự (`max-w-prose` hoặc `max-width: 65ch`).
- Thang cỡ chữ cố định (vd 12/14/16/18/20/24/32). Dùng `clamp()` cho tiêu đề lớn.
- Số liệu trong bảng/điểm số dùng `font-variant-numeric: tabular-nums`.
- Chỉ 3 mức nhấn: weight 400, 500/600, 700. Không in đậm tràn lan.

## 4. Màu và độ tương phản

- Chữ thường: contrast ≥ **4.5:1**. Chữ lớn (≥ 24px hoặc 18.5px đậm) và icon/viền control: ≥ **3:1**.
- Không dùng màu làm tín hiệu duy nhất (đúng/sai, đạt/không đạt): thêm icon hoặc chữ.
- Màu xám nhạt trên nền trắng cho chữ có ích (placeholder, mô tả) thường trượt contrast. Kiểm tra lại.
- Nền: ưu tiên phẳng, sạch. Không gradient/pattern trang trí trừ khi brief yêu cầu.

## 5. Mobile-first

**Cấu hình**
- `<meta name="viewport" content="width=device-width, initial-scale=1">`. Có thanh/nút cố định sát đáy thì thêm `viewport-fit=cover` và padding `env(safe-area-inset-bottom)`.
- Không bao giờ chặn zoom (`user-scalable=no`, `maximum-scale=1`).
- Chiều cao toàn màn hình dùng `100dvh` (kèm fallback `100vh`), không chỉ `100vh` vì thanh địa chỉ mobile làm lệch.

**Breakpoint** (chỉ `min-width`): base (<640) → `sm` 640 → `md` 768 → `lg` 1024 → `xl` 1280. Thêm breakpoint chỉ khi nội dung vỡ, không theo thiết bị.

**Layout**
- Mặc định 1 cột, xếp dọc. Dùng flex/grid, `gap`, `minmax()`, `auto-fit`. Không dùng chiều rộng/cao cố định bằng px cho container.
- Lề trang mobile 16px. Không có cuộn ngang ở bất kỳ độ rộng nào ≥ 320px (kiểm tra bằng `document.documentElement.scrollWidth <= innerWidth`).
- Ảnh/video: `max-width: 100%`, đặt `aspect-ratio` để tránh nhảy layout.
- Chuỗi dài (email, mã đề, tên file): `overflow-wrap: anywhere` hoặc `truncate` có `title`.

**Tương tác**
- Vùng chạm tối thiểu **44×44px** (Apple), khuyến nghị 48px (Material). Icon nhỏ thì mở rộng bằng padding. Khoảng cách giữa 2 vùng chạm ≥ 8px.
- Input `font-size ≥ 16px` để iOS không tự zoom khi focus. Đặt đúng `type`, `inputmode`, `autocomplete` (`email`, `tel`, `numeric`...).
- Hành động chính nằm vùng ngón cái (đáy màn hình). Nút chính trong form dài có thể sticky ở đáy.
- Không phụ thuộc hover. Mọi thứ hover làm được phải làm được bằng chạm. Dùng `@media (hover: hover)` cho hiệu ứng hover.
- Modal trên mobile: dạng bottom sheet hoặc full-screen, có nút đóng rõ, không bẫy cuộn nền.

**Bảng dữ liệu** (quan trọng với app quản lý thi)
- Mobile: chuyển hàng thành danh sách thẻ gọn (nhãn: giá trị) hoặc cuộn ngang có chủ đích trong container riêng với cột đầu cố định. Không để bảng làm vỡ cả trang.
- Chỉ hiện cột quan trọng ở mobile, cột phụ hiện từ `md`.
- Bộ lọc/tìm kiếm: gom vào 1 nút "Lọc" mở sheet, không bày 5 ô lọc chiếm màn hình.

**Điều hướng**
- Mobile: thanh dưới (≤ 5 mục) hoặc menu hamburger/drawer. Desktop: sidebar hoặc top bar. Cùng một cấu trúc thông tin, đổi cách trình bày.

## 6. Layout và thứ bậc thị giác

- Mỗi màn hình có **1 hành động chính** (nút primary). Các hành động khác là secondary/ghost.
- Thứ bậc bằng cỡ chữ, weight, khoảng cách. Không dùng màu sặc sỡ để tạo thứ bậc.
- Nhóm nội dung liên quan bằng khoảng cách (gần = liên quan), không bằng viền/card cho mọi thứ.
- Căn lề trái cho văn bản và form. Căn giữa chỉ cho tiêu đề ngắn/empty state.
- Khoảng trắng đủ rộng: padding trong card ≥ 16px mobile, 24px desktop.

## 7. Truy cập (a11y) — không thương lượng

- Dùng đúng thẻ ngữ nghĩa: `<button>` cho hành động, `<a>` cho điều hướng, `<label for>` cho mọi input, `<table>` cho dữ liệu bảng, `<nav>`, `<main>`, `<h1>`–`<h3>` theo thứ tự.
- Focus ring luôn nhìn thấy (`:focus-visible`), không `outline: none` mà không thay thế.
- Icon-only button có `aria-label`. Ảnh có `alt` (hoặc `alt=""` nếu trang trí).
- Lỗi form: hiển thị gần field, nêu rõ cách sửa, gắn `aria-describedby`. Không chỉ tô đỏ viền.
- Hỗ trợ bàn phím đầy đủ (Tab, Enter, Esc cho dialog). Trả focus về nút mở sau khi đóng modal.
- `prefers-reduced-motion`: tắt hoặc giảm animation.

## 8. Trạng thái và nội dung

Mỗi component có dữ liệu/hành động bất đồng bộ phải có đủ:
- **Loading**: skeleton đúng hình dạng nội dung (không spinner toàn trang), tránh nhảy layout.
- **Rỗng**: 1 câu giải thích + 1 nút hành động tiếp theo.
- **Lỗi**: nói chuyện gì xảy ra + cách xử lý + nút thử lại. Không "Something went wrong".
- **Thành công**: phản hồi ngắn (toast/inline), không chặn thao tác.
- **Disabled / đang gửi**: nút khóa + nhãn đổi ("Đang nộp..."), chống bấm đúp.
- Hành động phá hủy (xóa kỳ thi, nộp bài): xác nhận có nêu rõ hậu quả, nút danger tách xa nút an toàn.

Văn bản giao diện: tiếng Việt tự nhiên, ngắn, dùng động từ cụ thể. Một thuật ngữ một nghĩa (vd luôn "Bài thi", không lẫn "Đề kiểm tra"). Định dạng ngày `dd/MM/yyyy HH:mm`, số theo locale `vi-VN`.

## 9. Checklist trước khi báo xong

- [ ] Xem ở 360px, 768px, 1280px: không cuộn ngang, không chữ bị cắt, không chồng lấn.
- [ ] Mọi màu/spacing/radius/font lấy từ token. Không giá trị lẻ.
- [ ] Không dính danh sách "lỗi AI hay mắc" (mục 1): gradient tím, Inter mặc định, 3 card icon, card lồng card, emoji trang trí, chữ marketing.
- [ ] Vùng chạm ≥ 44px. Input ≥ 16px. Có `type`/`inputmode` đúng.
- [ ] Contrast đạt (4.5:1 chữ, 3:1 control).
- [ ] Đủ trạng thái: loading, rỗng, lỗi, disabled, focus.
- [ ] Điều hướng bằng bàn phím được, có focus ring, có label.
- [ ] Không tạo component trùng với cái đã có.
- [ ] Dữ liệu mẫu và chữ giao diện đúng nghiệp vụ, không lorem/John Doe.

## 10. Khi người dùng đưa yêu cầu mơ hồ ("làm đẹp lên")

Không tự thêm gradient, bóng, animation. Hãy: (1) sửa thứ bậc chữ và khoảng cách, (2) thống nhất token, (3) bổ sung trạng thái còn thiếu, (4) sửa mobile. Chỉ đổi phong cách khi người dùng yêu cầu rõ.
