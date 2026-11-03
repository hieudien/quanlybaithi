"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as db from "@/lib/db";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const NAV = [
  { href: "/teacher/exams", label: "Bài thi", icon: <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Icon> },
  { href: "/teacher/classes", label: "Lớp học", icon: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2" /></Icon> },
];

/**
 * Khung trang. Giáo viên: chặn khi chưa chọn tài khoản (demo). Phụ huynh: không tài khoản, quyền nằm ở token trong link.
 * "Đổi tài khoản" chỉ dành cho demo (về /start); bản thật: giáo viên "Đăng xuất", phụ huynh bỏ nút.
 */
export default function Shell({ role, children }: { role: "teacher" | "parent"; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<db.Profile | null>(null);
  const [ok, setOk] = useState(role === "parent");

  useEffect(() => {
    if (role !== "teacher") return;
    db.currentUser().then((u) => {
      if (u?.role === "teacher") { setMe(u); setOk(true); } else router.replace("/start");
    });
  }, [role, router]);

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Quản lý bài thi, về trang giới thiệu">
          <Icon><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Icon>
          <span>Quản lý bài thi</span>
        </Link>
        {role === "teacher" && (
          <nav className="tabbar" aria-label="Chính">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined}>{n.icon}<span>{n.label}</span></Link>
            ))}
          </nav>
        )}
        <Link className="btn ghost" href="/start" aria-label={me ? `Đổi tài khoản, đang dùng ${me.name}` : undefined}>Đổi tài khoản</Link>
      </header>
      <main id="main" className={role === "teacher" ? "" : "wide no-tabbar"}>{ok ? children : null}</main>
    </>
  );
}
