import type { NextConfig } from "next";

// Demo: mọi trang là Client Component đọc dữ liệu từ trình duyệt, nên không bật cacheComponents.
const nextConfig: NextConfig = {
  // Mở dev server từ điện thoại qua IP LAN: Next chặn file JS dev từ origin lạ nên trang không chạy, data mẫu không nạp.
  // Đổi IP theo máy của bạn (lệnh `ipconfig`), sửa xong phải khởi động lại `npm run dev`.
  allowedDevOrigins: ["192.168.1.204"],
};

export default nextConfig;
