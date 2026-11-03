"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { compressImage, fmtDate, fmtScore, parseScore } from "@/lib/format";
import { Sheet, closeSheet } from "@/components/Sheet";
import { Empty, ErrorBox, Skeleton, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";

interface Item { path?: string; blob?: Blob; url: string }

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [exam, setExam] = useState<db.ExamSummary | null | undefined>(undefined); // undefined: đang tải, null: không có
  const [students, setStudents] = useState<db.StudentRow[]>([]);
  const [papers, setPapers] = useState<db.Paper[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<{ paper: db.Paper | null; items: Item[] } | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const e = await db.getExam(id);
      setExam(e);
      if (!e) return;
      const [st, ps] = await Promise.all([db.listStudents({ classId: e.class_id }), db.listPapers({ examId: id })]);
      setStudents(st);
      setPapers(ps);
    } catch {
      setFailed(true);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (exam === null) {
    return (
      <>
        <Link className="back" href="/teacher/exams">← Bài thi</Link>
        <Empty msg="Không tìm thấy bài thi này."><Link className="btn primary" href="/teacher/exams">Về danh sách bài thi</Link></Empty>
      </>
    );
  }
  if (failed) return <ErrorBox msg="Không tải được bài thi." onRetry={load} />;
  if (!exam || !papers) return <Skeleton n={3} />;

  const drafts = papers.filter((p) => p.status === "draft" && p.images.length);
  const done = new Set(papers.map((p) => p.student_id));
  const rest = students.filter((s) => !done.has(s.id));

  const openPaper = async (paper: db.Paper | null) => {
    const items = await Promise.all((paper?.images ?? []).map(async (path) => ({ path, url: await db.getImageUrl(path) })));
    setSheet({ paper, items });
  };
  const publishAll = async () => {
    const n = await db.publishDrafts(id);
    toast(`Đã đăng ${n} bài cho phụ huynh.`);
    load();
  };

  return (
    <>
      <Link className="back" href="/teacher/exams">← Bài thi</Link>
      <div className="page-head">
        <div>
          <h1>{exam.title}</h1>
          <p className="muted">{exam.class.name} · {exam.subject.name} · {exam.type.name} · {fmtDate(exam.date)} · {exam.term}</p>
        </div>
        <div className="actions">
          {drafts.length > 0 && <button className="btn" onClick={publishAll}>Đăng {drafts.length} bài nháp</button>}
          <button className="btn primary" disabled={!rest.length} onClick={() => openPaper(null)}>Thêm bài làm</button>
        </div>
      </div>

      {papers.length ? (
        <ul className="list">
          {papers.map((p) => (
            <li key={p.id}>
              <button className="row" onClick={() => openPaper(p)}>
                <span className="title">{p.student.name}</span>
                <span className="score num">{fmtScore(p.score)}/{fmtScore(exam.max_score)}</span>
                <span className="meta"><StatusBadge status={p.status} /> {p.images.length} ảnh{p.status === "published" ? ` · ${p.viewed ? "Phụ huynh đã xem" : "Phụ huynh chưa xem"}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty msg="Chưa có bài làm nào. Chụp ảnh bài giấy rồi thêm vào đây."><button className="btn primary" onClick={() => openPaper(null)}>Thêm bài làm</button></Empty>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="section-title">Chưa có bài làm ({rest.length})</h2>
          <p className="muted">{rest.map((s) => s.name).join(", ")}</p>
        </>
      )}

      {sheet && (
        <PaperSheet exam={exam} paper={sheet.paper} initial={sheet.items}
          pickable={sheet.paper ? students.filter((s) => s.id === sheet.paper!.student_id) : rest}
          onClose={() => setSheet(null)} onChanged={(msg) => { toast(msg); load(); }} />
      )}
    </>
  );
}

function PaperSheet({ exam, paper, initial, pickable, onClose, onChanged }: {
  exam: db.ExamSummary; paper: db.Paper | null; initial: Item[]; pickable: db.Student[]; onClose: () => void; onChanged: (msg: string) => void;
}) {
  const max = exam.max_score;
  const [student, setStudent] = useState(paper?.student_id ?? "");
  const [score, setScore] = useState(paper?.score != null ? fmtScore(paper.score) : "");
  const [comment, setComment] = useState(paper?.comment ?? "");
  const [items, setItems] = useState<Item[]>(initial);
  const [errs, setErrs] = useState<{ student?: string; score?: string; files?: string }>({});
  const [busy, setBusy] = useState<db.Status | null>(null);

  const addFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setErrs((x) => ({ ...x, files: undefined }));
    for (const f of files) {
      try {
        const blob = await compressImage(f);
        setItems((l) => [...l, { blob, url: URL.createObjectURL(blob) }]);
      } catch {
        setErrs((x) => ({ ...x, files: `Không đọc được ảnh ${f.name}. Thử chụp lại hoặc chọn ảnh JPG/PNG.` }));
      }
    }
  };

  const save = async (e: React.MouseEvent<HTMLButtonElement>, status: db.Status) => {
    const btn = e.currentTarget;
    const raw = score.trim();
    const value = raw === "" ? null : parseScore(raw);
    const next: typeof errs = {};
    if (!student) next.student = "Chọn học sinh.";
    if (raw !== "" && (Number.isNaN(value) || value! < 0 || value! > max)) next.score = `Điểm phải từ 0 đến ${fmtScore(max)}.`;
    if (status === "published") {
      if (value == null && !next.score) next.score = "Nhập điểm trước khi đăng.";
      if (!items.length) next.files = "Thêm ít nhất 1 ảnh trước khi đăng.";
    }
    setErrs(next);
    if (Object.keys(next).length) {
      const first = next.student ? "student" : next.score ? "score" : "files";
      document.getElementById(first)?.focus();
      return;
    }
    setBusy(status);
    try {
      const images: string[] = [];
      for (const it of items) images.push(it.path ?? (await db.putImage(it.blob!)));
      await db.savePaper({ id: paper?.id, exam_id: exam.id, student_id: student, score: value, comment: comment.trim(), status, images });
      closeSheet(btn);
      onChanged(status === "published" ? "Đã đăng bài cho phụ huynh." : "Đã lưu nháp.");
    } catch (ex) {
      setBusy(null);
      setErrs({ student: ex instanceof Error ? ex.message : "Không lưu được. Thử lại." });
    }
  };

  const del = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!paper || !confirm(`Xóa bài làm của ${paper.student.name}? Ảnh, điểm và nhận xét sẽ mất vĩnh viễn, phụ huynh không xem được nữa.`)) return;
    const btn = e.currentTarget;
    await db.deletePaper(paper.id);
    closeSheet(btn);
    onChanged("Đã xóa bài làm.");
  };

  return (
    <Sheet title={paper ? "Sửa bài làm" : "Thêm bài làm"} onClose={onClose}>
      <form className="stack" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="field">
          <label htmlFor="student">Học sinh</label>
          <select id="student" value={student} onChange={(e) => setStudent(e.target.value)} disabled={!!paper} aria-describedby="student-err" aria-invalid={errs.student ? true : undefined}>
            {!paper && <option value="">Chọn học sinh</option>}
            {pickable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="err" id="student-err">{errs.student}</span>
        </div>
        <div className="field">
          <label htmlFor="score">Điểm (tối đa {fmtScore(max)})</label>
          <input id="score" type="text" inputMode="decimal" autoComplete="off" value={score} onChange={(e) => setScore(e.target.value)} aria-describedby="score-err" aria-invalid={errs.score ? true : undefined} />
          <span className="err" id="score-err">{errs.score}</span>
        </div>
        <div className="field">
          <label htmlFor="comment">Nhận xét cho phụ huynh</label>
          <textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="files">Ảnh bài làm</label>
          <input id="files" type="file" accept="image/*" multiple onChange={addFiles} aria-describedby="files-err" aria-invalid={errs.files ? true : undefined} />
          <span className="hint">Có thể chọn nhiều ảnh. Ảnh được nén trước khi lưu.</span>
          <span className="err" id="files-err">{errs.files}</span>
          <div className="thumbs">
            {items.map((it, i) => (
              <div className="thumb" key={it.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={`Ảnh ${i + 1}`} />
                <button type="button" className="btn" aria-label={`Xóa ảnh ${i + 1}`} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>Xóa</button>
              </div>
            ))}
          </div>
        </div>
        <div className="actions">
          {paper && <button type="button" className="btn danger" onClick={del}>Xóa bài làm</button>}
          <button type="button" className="btn" disabled={!!busy} onClick={(e) => save(e, "draft")}>{busy === "draft" ? "Đang lưu..." : "Lưu nháp"}</button>
          <button type="button" className="btn primary" disabled={!!busy} onClick={(e) => save(e, "published")}>{busy === "published" ? "Đang lưu..." : "Đăng cho phụ huynh"}</button>
        </div>
      </form>
    </Sheet>
  );
}
