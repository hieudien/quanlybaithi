"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { countFilters, fmtDate, parseScore } from "@/lib/format";
import { FilterSheet, Sheet, closeSheet } from "@/components/Sheet";
import { Empty, ErrorBox, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function ExamsPage() {
  const toast = useToast();
  const [lookups, setLookups] = useState<{ classes: db.ClassSummary[]; subjects: db.Subject[]; types: db.ExamType[] } | null>(null);
  const [exams, setExams] = useState<db.ExamSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<db.ExamFilter>({});
  const [sheet, setSheet] = useState<"filter" | "new" | null>(null);

  useEffect(() => {
    Promise.all([db.listClasses(), db.listSubjects(), db.listExamTypes()]).then(([classes, subjects, types]) => setLookups({ classes, subjects, types }));
  }, []);

  const load = useCallback(() => {
    setFailed(false);
    setExams(null);
    db.listExams(filter).then(setExams).catch(() => setFailed(true));
  }, [filter]);
  useEffect(load, [load]);

  const n = countFilters({ ...filter });
  const multi = (lookups?.subjects.length ?? 0) > 1; // 1 môn: ẩn ô chọn môn

  const openNew = () => {
    if (!lookups?.classes.length) toast("Tạo lớp trước khi tạo bài thi.", "error");
    else setSheet("new");
  };

  return (
    <>
      <div className="page-head">
        <h1>Bài thi</h1>
        <div className="actions">
          <button className="btn" onClick={() => setSheet("filter")}>{n ? `Lọc (${n})` : "Lọc"}</button>
          <button className="btn primary" onClick={openNew}>Tạo bài thi</button>
        </div>
      </div>

      {failed ? <ErrorBox msg="Không tải được danh sách bài thi." onRetry={load} />
        : !exams ? <Skeleton />
        : !exams.length ? (
          <Empty msg={n ? "Không có bài thi khớp bộ lọc." : "Chưa có bài thi nào."}>
            {n ? <button className="btn" onClick={() => setFilter({})}>Xóa lọc</button> : <button className="btn primary" onClick={openNew}>Tạo bài thi</button>}
          </Empty>
        ) : (
          <ul className="list">
            {exams.map((e) => (
              <li key={e.id}>
                <Link className="row" href={`/teacher/exams/${e.id}`}>
                  <span className="title">{e.title}</span>
                  <span className={`badge ${e.published === e.total ? "success" : ""} num`}>{e.published}/{e.total} đã đăng</span>
                  <span className="meta"><span className="badge info">{e.class.name}</span> {e.subject.name} · {e.type.name} · {fmtDate(e.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

      {sheet === "filter" && lookups && (
        <FilterSheet onClose={() => setSheet(null)} values={{ ...filter }} onApply={(v) => setFilter(v)}
          fields={[
            { key: "classId", label: "Lớp", items: lookups.classes },
            ...(multi ? [{ key: "subjectId", label: "Môn", items: lookups.subjects }] : []),
            { key: "typeId", label: "Loại bài", items: lookups.types },
            { key: "term", label: "Học kỳ", items: db.TERMS.map((t) => ({ id: t, name: t })) },
          ]} />
      )}
      {sheet === "new" && lookups && <NewExamSheet lookups={lookups} multi={multi} onClose={() => setSheet(null)} />}
    </>
  );
}

function NewExamSheet({ lookups, multi, onClose }: {
  lookups: { classes: db.ClassSummary[]; subjects: db.Subject[]; types: db.ExamType[] }; multi: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const [titleErr, setTitleErr] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const classField = (
    <div className="field"><label htmlFor="class_id">Lớp</label>
      <select id="class_id" name="class_id">{lookups.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
  );
  const subjectField = (
    <div className="field"><label htmlFor="subject_id">Môn</label>
      <select id="subject_id" name="subject_id">{lookups.subjects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (!title) {
      setTitleErr("Nhập tên bài thi, ví dụ: Kiểm tra 15 phút Toán.");
      (e.currentTarget.elements.namedItem("title") as HTMLInputElement).focus();
      return;
    }
    setSaving(true);
    const max = parseScore(String(f.get("max_score")));
    const id = await db.createExam({
      title, class_id: String(f.get("class_id")), subject_id: multi ? String(f.get("subject_id")) : lookups.subjects[0].id,
      type_id: String(f.get("type_id")), term: String(f.get("term")), date: String(f.get("date")), max_score: max > 0 ? max : 10,
    });
    router.push(`/teacher/exams/${id}`);
  };

  return (
    <Sheet title="Tạo bài thi" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="title">Tên bài thi</label>
          <input id="title" name="title" placeholder="Kiểm tra 15 phút Toán" autoComplete="off" aria-describedby="title-err" aria-invalid={titleErr ? true : undefined} />
          <span className="err" id="title-err">{titleErr}</span>
        </div>
        {multi ? <div className="field-row">{classField}{subjectField}</div> : classField}
        <div className="field-row">
          <div className="field"><label htmlFor="type_id">Loại bài</label>
            <select id="type_id" name="type_id">{lookups.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="field"><label htmlFor="term">Học kỳ</label>
            <select id="term" name="term">{db.TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="date">Ngày thi</label><input id="date" name="date" type="date" defaultValue={today} /></div>
          <div className="field"><label htmlFor="max_score">Điểm tối đa</label><input id="max_score" name="max_score" type="text" inputMode="decimal" defaultValue="10" /></div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={(e) => closeSheet(e.currentTarget)}>Hủy</button>
          <button className="btn primary" disabled={saving}>{saving ? "Đang tạo..." : "Tạo bài thi"}</button>
        </div>
      </form>
    </Sheet>
  );
}
