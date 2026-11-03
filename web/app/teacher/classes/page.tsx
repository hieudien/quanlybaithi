"use client";
import { useCallback, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { copyText } from "@/lib/format";
import { Sheet, closeSheet } from "@/components/Sheet";
import { Empty, ErrorBox, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

// Link riêng cho từng học sinh. Bản Supabase: `${origin}/p/${token}`.
const linkOf = (s: db.Student) => `${location.origin}/p/${s.token}`;

export default function ClassesPage() {
  const toast = useToast();
  const [data, setData] = useState<{ klass: db.ClassSummary; students: db.StudentRow[] }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<{ kind: "class" } | { kind: "students"; classId: string } | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const classes = await db.listClasses();
      const lists = await Promise.all(classes.map((c) => db.listStudents({ classId: c.id })));
      setData(classes.map((klass, i) => ({ klass, students: lists[i] })));
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: string, isOpen: boolean) =>
    setOpen((s) => { const n = new Set(s); if (isOpen) n.add(id); else n.delete(id); return n; });

  const copy = async (s: db.Student) => {
    try { await copyText(linkOf(s)); toast("Đã chép link. Gửi cho phụ huynh qua Zalo hoặc tin nhắn."); }
    catch { toast("Không chép được link.", "error"); }
  };
  const reset = async (s: db.Student) => {
    if (!confirm("Đổi link xem bài của học sinh này? Link cũ sẽ không dùng được nữa, bạn cần gửi lại link mới cho phụ huynh.")) return;
    await db.resetToken(s.id);
    toast("Đã đổi link. Bấm Chép link để lấy link mới.");
    load();
  };

  return (
    <>
      <div className="page-head"><h1>Lớp học</h1><button className="btn primary" onClick={() => setSheet({ kind: "class" })}>Thêm lớp</button></div>

      {failed ? <ErrorBox msg="Không tải được danh sách lớp." onRetry={load} />
        : !data ? <Skeleton n={2} />
        : !data.length ? <Empty msg="Chưa có lớp nào."><button className="btn primary" onClick={() => setSheet({ kind: "class" })}>Thêm lớp</button></Empty>
        : (
          <div className="stack">
            {data.map(({ klass, students }) => (
              <details className="panel" key={klass.id} open={open.has(klass.id)} onToggle={(e) => toggle(klass.id, e.currentTarget.open)}>
                <summary>
                  <span>{klass.name} <span className="muted small">· {klass.year} · {klass.student_count} học sinh</span></span>
                  <span className="chev" aria-hidden="true" />
                </summary>
                {students.length ? (
                  <ul className="list">
                    {students.map((s) => (
                      <li key={s.id}>
                        <div className="row">
                          <span className="title">{s.name}</span>
                          <span className="foot">
                            {s.opened ? <span className="badge success">Phụ huynh đã mở</span> : <span className="badge">Chưa mở</span>}
                            <span className="actions">
                              <button className="btn" onClick={() => copy(s)} aria-label={`Chép link xem bài của ${s.name}`}>Chép link</button>
                              <button className="btn ghost" onClick={() => reset(s)} aria-label={`Đổi link của ${s.name}`}>Đổi link</button>
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted">Lớp chưa có học sinh.</p>}
                <div className="actions" style={{ marginTop: "var(--space-3)" }}>
                  <button className="btn" onClick={() => setSheet({ kind: "students", classId: klass.id })}>Thêm học sinh</button>
                </div>
              </details>
            ))}
          </div>
        )}

      {sheet?.kind === "class" && (
        <NewClassSheet onClose={() => setSheet(null)} onDone={(id) => { setOpen((s) => new Set(s).add(id)); toast("Đã thêm lớp."); load(); }} />
      )}
      {sheet?.kind === "students" && (
        <AddStudentsSheet classId={sheet.classId} onClose={() => setSheet(null)}
          onDone={(n) => { setOpen((s) => new Set(s).add(sheet.classId)); toast(`Đã thêm ${n} học sinh.`); load(); }} />
      )}
    </>
  );
}

function NewClassSheet({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const name = (f.elements.namedItem("name") as HTMLInputElement).value.trim();
    if (!name) { setErr("Nhập tên lớp, ví dụ: 7A3."); (f.elements.namedItem("name") as HTMLInputElement).focus(); return; }
    const id = await db.createClass({ name, year: (f.elements.namedItem("year") as HTMLInputElement).value.trim() });
    closeSheet(f);
    onDone(id);
  };
  return (
    <Sheet title="Thêm lớp" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="name">Tên lớp</label>
          <input id="name" name="name" placeholder="7A3" autoComplete="off" aria-describedby="name-err" aria-invalid={err ? true : undefined} />
          <span className="err" id="name-err">{err}</span></div>
        <div className="field"><label htmlFor="year">Năm học</label><input id="year" name="year" defaultValue="2026-2027" inputMode="numeric" /></div>
        <div className="actions"><button type="button" className="btn" onClick={(e) => closeSheet(e.currentTarget)}>Hủy</button><button className="btn primary">Thêm lớp</button></div>
      </form>
    </Sheet>
  );
}

function AddStudentsSheet({ classId, onClose, onDone }: { classId: string; onClose: () => void; onDone: (n: number) => void }) {
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const ta = f.elements.namedItem("names") as HTMLTextAreaElement;
    const names = ta.value.split("\n");
    if (!names.some((n) => n.trim())) { setErr("Nhập ít nhất một họ tên."); ta.focus(); return; }
    const n = await db.createStudents(classId, names);
    closeSheet(f);
    onDone(n);
  };
  return (
    <Sheet title="Thêm học sinh" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="names">Họ tên học sinh</label>
          <textarea id="names" name="names" rows={6} placeholder={"Nguyễn Văn An\nTrần Thị Bình"} aria-describedby="names-err" aria-invalid={err ? true : undefined} />
          <span className="hint">Mỗi dòng một học sinh. Dán từ Excel được.</span>
          <span className="err" id="names-err">{err}</span></div>
        <div className="actions"><button type="button" className="btn" onClick={(e) => closeSheet(e.currentTarget)}>Hủy</button><button className="btn primary">Thêm</button></div>
      </form>
    </Sheet>
  );
}
