"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as db from "@/lib/db";

type DemoLink = Awaited<ReturnType<typeof db.listDemoLinks>>[number];

export default function Start() {
  const [teachers, setTeachers] = useState<db.Profile[] | null>(null);
  const [links, setLinks] = useState<DemoLink[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    db.logout();
    db.listProfiles().then(setTeachers);
    db.listDemoLinks().then(setLinks);
  }, []);

  const reset = async () => {
    if (!confirm("Xóa toàn bộ dữ liệu hiện tại và tạo lại dữ liệu mẫu?")) return;
    setResetting(true);
    await db.resetDemo();
    setTeachers(await db.listProfiles());
    setLinks(await db.listDemoLinks());
    setResetting(false);
  };

  return (
    <main className="no-tabbar" style={{ paddingTop: "var(--space-6)" }}>
      <p><Link href="/">← Giới thiệu và hướng dẫn</Link></p>
      <h1 style={{ marginTop: "var(--space-3)" }}>Dùng thử demo</h1>
      <p className="muted" style={{ margin: "var(--space-2) 0 var(--space-5)" }}>Dữ liệu lưu ngay trong trình duyệt này.</p>

      <h2 className="section-title" style={{ marginTop: 0 }}>Giáo viên</h2>
      <ul className="list" aria-busy={!teachers}>
        {teachers?.map((p) => (
          <li key={p.id}>
            <Link className="row" href="/teacher/exams" onClick={() => db.login(p.id)}>
              <span className="title">{p.name}</span><span className="badge">Giáo viên</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Phụ huynh</h2>
      <p className="muted small" style={{ marginBottom: "var(--space-3)" }}>Phụ huynh không cần tài khoản. Giáo viên gửi link riêng của từng học sinh, phụ huynh bấm là xem. Link mẫu:</p>
      <ul className="list">
        {links.map((s) => (
          <li key={s.id}>
            <Link className="row" href={`/p/${s.token}`}>
              <span className="title">Phụ huynh của {s.name}</span><span className="badge info">{s.className}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: "var(--space-5)" }}>
        <button className="btn danger" onClick={reset} disabled={resetting}>{resetting ? "Đang đặt lại..." : "Đặt lại dữ liệu mẫu"}</button>
      </p>
    </main>
  );
}
