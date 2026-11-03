"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { countFilters, fmtDate, fmtScore } from "@/lib/format";
import { FilterSheet, Sheet, ZoomSheet, closeSheet } from "@/components/Sheet";
import { Empty, ErrorBox, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

// Không có tài khoản: quyền xem nằm ở token trong link. Thiết bị chỉ nhớ các link đã mở để chuyển giữa các con.
const KIDS = "qlbt:kids";
type Kid = db.Child & { token: string };
const tokenOf = (text: string) => { try { return new URL(text).pathname.split("/").filter(Boolean).pop() || text.trim(); } catch { return text.trim(); } };
const norm = (p: db.Paper) => ((p.score ?? 0) / p.exam.max_score) * 10; // quy về thang 10

function useDesktop() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    setOn(mq.matches);
    const h = () => setOn(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return on;
}

export default function ParentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const toast = useToast();
  const desktop = useDesktop();
  const [kids, setKids] = useState<Kid[] | null>(null);
  const [bad, setBad] = useState(false);
  const [lookups, setLookups] = useState<{ subjects: db.Subject[]; types: db.ExamType[] } | null>(null);
  const [papers, setPapers] = useState<db.Paper[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<db.PaperFilter>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [zoom, setZoom] = useState<{ url: string; title: string } | null>(null);
  const [sheet, setSheet] = useState<"filter" | "add" | null>(null);

  useEffect(() => { Promise.all([db.listSubjects(), db.listExamTypes()]).then(([subjects, types]) => setLookups({ subjects, types })); }, []);

  // Đọc danh sách link đã nhớ + link đang mở.
  useEffect(() => {
    (async () => {
      let tokens: string[] = [];
      try { tokens = JSON.parse(localStorage.getItem(KIDS) || "[]"); } catch {}
      if (!tokens.includes(token)) tokens.push(token);
      const found = (await Promise.all(tokens.map(async (t) => { const c = await db.getChild(t); return c ? { ...c, token: t } : null; }))).filter((k): k is Kid => !!k);
      localStorage.setItem(KIDS, JSON.stringify(found.map((k) => k.token)));
      setBad(!found.some((k) => k.token === token));
      setKids(found);
    })();
  }, [token]);

  const child = kids?.find((k) => k.token === token) ?? kids?.[0];
  const childToken = child?.token;
  useEffect(() => { if (bad && child) toast("Link vừa mở không đúng. Đang hiện con đã lưu trên máy này.", "error"); }, [bad, child, toast]);

  const load = useCallback(() => {
    if (!childToken) return;
    setFailed(false);
    setPapers(null);
    db.listChildPapers(childToken, filter).then(setPapers).catch(() => setFailed(true));
  }, [childToken, filter]);
  useEffect(load, [load]);

  const selected = papers?.find((p) => p.id === selectedId) ?? (desktop ? papers?.[0] : undefined);
  const shown = desktop ? selected : mobileOpen ? selected : undefined;

  // Bài đang hiển thị thì đánh dấu đã xem.
  useEffect(() => {
    if (!shown || shown.viewed || !childToken) return;
    db.markViewed(childToken, shown.id).then(() => setPapers((ps) => ps && ps.map((p) => (p.id === shown.id ? { ...p, viewed: true } : p))));
  }, [shown, childToken]);

  if (!kids || !lookups) return <Skeleton />;

  if (!child) {
    return (
      <>
        <div className="page-head"><h1>Kết quả của con</h1></div>
        <div className="alert" role="alert" style={{ marginBottom: "var(--space-4)" }}>Link không đúng hoặc giáo viên đã đổi link. Hãy liên hệ giáo viên để nhận link mới.</div>
        <Empty msg="Mở link giáo viên đã gửi để xem bài của con. Không cần tạo tài khoản."><button className="btn primary" onClick={() => setSheet("add")}>Dán link</button></Empty>
        {sheet === "add" && <AddChildSheet onClose={() => setSheet(null)} />}
      </>
    );
  }

  const n = countFilters({ ...filter });
  const scored = (papers ?? []).filter((p) => p.score != null);
  const weightOf = (p: db.Paper) => p.exam.type.weight ?? 1;
  const wsum = scored.reduce((s, p) => s + weightOf(p), 0);
  const avg = wsum ? scored.reduce((s, p) => s + norm(p) * weightOf(p), 0) / wsum : null;
  const pickChild = (t: string) => { setSelectedId(null); setMobileOpen(false); router.replace(`/p/${t}`); };

  return (
    <>
      <div className="page-head">
        <h1>Kết quả của con</h1>
        <div className="actions">
          <button className="btn" onClick={() => setSheet("filter")}>{n ? `Lọc (${n})` : "Lọc"}</button>
          <button className="btn" onClick={() => setSheet("add")}>Thêm con</button>
        </div>
      </div>
      {kids.length > 1 && (
        <div className="chips" role="group" aria-label="Chọn con" style={{ marginBottom: "var(--space-4)" }}>
          {kids.map((k) => <button key={k.token} className="chip" aria-pressed={k === child} onClick={() => pickChild(k.token)}>{k.name}</button>)}
        </div>
      )}

      {failed ? <ErrorBox msg="Không tải được kết quả." onRetry={load} /> : !papers ? <Skeleton /> : (
        <div className="split">
          <div>
            <p className="muted" style={{ marginBottom: "var(--space-3)" }}>{child.name} · Lớp {child.class.name}</p>
            <div className="panel">
              <dl className="stats">
                <div><dt>Điểm trung bình</dt><dd className="num">{avg == null ? "—" : fmtScore(+avg.toFixed(1))}</dd></div>
                <div><dt>Số bài</dt><dd className="num">{papers.length}</dd></div>
                <div><dt>Bài mới</dt><dd className="num">{papers.filter((p) => !p.viewed).length}</dd></div>
              </dl>
              <p className="hint" style={{ marginTop: "var(--space-2)" }}>Trung bình tính theo hệ số loại bài, thang 10.</p>
            </div>
            <Chart list={papers} />
            <h2 className="section-title">Các bài đã chấm</h2>
            {papers.length ? (
              <ul className="list">
                {papers.map((p) => (
                  <li key={p.id}>
                    <button className="row" aria-current={desktop && p.id === selected?.id ? true : undefined}
                      onClick={() => { setSelectedId(p.id); setMobileOpen(true); }}>
                      <span className="title">{p.exam.title}</span>
                      <span className="score num">{fmtScore(p.score)}/{fmtScore(p.exam.max_score)}</span>
                      <span className="meta">{!p.viewed && <><span className="badge info">Mới</span>{" "}</>}{p.exam.subject.name} · {p.exam.type.name} · {fmtDate(p.exam.date)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty msg={n ? "Không có bài khớp bộ lọc." : "Giáo viên chưa đăng bài nào của con."}>{n ? <button className="btn" onClick={() => setFilter({})}>Xóa lọc</button> : null}</Empty>
            )}
          </div>
          <aside className="detail panel" aria-label="Chi tiết bài" aria-live="polite">
            {selected ? <Detail paper={selected} withTitle onZoom={(url, title) => setZoom({ url, title })} />
              : <p className="muted">Chọn một bài ở danh sách để xem điểm, nhận xét và ảnh bài làm.</p>}
          </aside>
        </div>
      )}

      {!desktop && mobileOpen && selected && (
        <Sheet title={selected.exam.title} className="full" onClose={() => setMobileOpen(false)}>
          <Detail paper={selected} onZoom={(url, title) => setZoom({ url, title })} />
        </Sheet>
      )}
      {zoom && <ZoomSheet url={zoom.url} title={zoom.title} onClose={() => setZoom(null)} />}
      {sheet === "filter" && (
        <FilterSheet onClose={() => setSheet(null)} values={{ ...filter }} onApply={(v) => { setFilter(v); setSelectedId(null); }}
          fields={[
            ...(lookups.subjects.length > 1 ? [{ key: "subjectId", label: "Môn", items: lookups.subjects }] : []),
            { key: "typeId", label: "Loại bài", items: lookups.types },
            { key: "term", label: "Học kỳ", items: db.TERMS.map((t) => ({ id: t, name: t })) },
          ]} />
      )}
      {sheet === "add" && <AddChildSheet onClose={() => setSheet(null)} />}
    </>
  );
}

function Detail({ paper: p, withTitle, onZoom }: { paper: db.Paper; withTitle?: boolean; onZoom: (url: string, title: string) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all(p.images.map(db.getImageUrl)).then((u) => live && setUrls(u));
    return () => { live = false; };
  }, [p.images]);
  return (
    <>
      {withTitle && <h2>{p.exam.title}</h2>}
      <p className="muted small">{p.student.name} · Lớp {p.exam.class.name} · {p.exam.subject.name} · {p.exam.type.name} · {fmtDate(p.exam.date)}</p>
      <div className="panel" style={{ margin: "var(--space-3) 0" }}>
        <p className="muted small">Điểm</p>
        <p className="num" style={{ fontSize: "var(--fs-3xl)", fontWeight: 700 }}>{fmtScore(p.score)}<span className="muted" style={{ fontSize: "var(--fs-lg)" }}>/{fmtScore(p.exam.max_score)}</span></p>
      </div>
      <h3>Nhận xét của giáo viên</h3>
      <div className="panel" style={{ margin: "var(--space-2) 0 var(--space-4)" }}>
        <p>{p.comment ? p.comment.split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>) : <span className="muted">Giáo viên chưa nhận xét bài này.</span>}</p>
      </div>
      <h3>Bài làm ({p.images.length} ảnh)</h3>
      {p.images.length ? (
        <div className="pages" style={{ marginTop: "var(--space-2)" }}>
          {urls.map((u, i) => (
            <button key={u} className="photo" aria-label={`Xem ảnh ${i + 1} toàn màn hình`} onClick={() => onZoom(u, `Trang ${i + 1}`)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Bài làm, trang ${i + 1}`} />
            </button>
          ))}
        </div>
      ) : <p className="muted">Bài này không có ảnh.</p>}
    </>
  );
}

function Chart({ list }: { list: db.Paper[] }) {
  const pts = [...list].reverse().filter((p) => p.score != null);
  if (pts.length < 2) return null;
  const W = 340, H = 180, L = 28, R = 24, T = 12, B = 28;
  const x = (i: number) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v: number) => T + (1 - v / 10) * (H - T - B);
  const alt = "Điểm theo thời gian: " + pts.map((p) => `${fmtDate(p.exam.date).slice(0, 5)}: ${fmtScore(norm(p))}`).join(", ");
  return (
    <>
      <h2 className="section-title">Điểm theo thời gian</h2>
      <div className="panel">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
          {[0, 5, 10].map((v) => (
            <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>
          ))}
          <path className="line" d={pts.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(norm(p))}`).join(" ")} />
          {pts.map((p, i) => <circle key={p.id} className="dot" cx={x(i)} cy={y(norm(p))} r={4} />)}
          {pts.map((p, i) => (pts.length <= 6 || i % 2 === 0) && <text key={p.id} x={x(i)} y={H - 8} textAnchor="middle">{fmtDate(p.exam.date).slice(0, 5)}</text>)}
        </svg>
      </div>
    </>
  );
}

function AddChildSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const input = f.elements.namedItem("link") as HTMLInputElement;
    const t = tokenOf(input.value);
    setBusy(true);
    const c = t ? await db.getChild(t) : null;
    if (!c) {
      setBusy(false);
      setErr("Link không đúng. Dán lại nguyên link giáo viên đã gửi hoặc hỏi giáo viên link mới.");
      input.focus();
      return;
    }
    let tokens: string[] = [];
    try { tokens = JSON.parse(localStorage.getItem(KIDS) || "[]"); } catch {}
    if (!tokens.includes(t)) localStorage.setItem(KIDS, JSON.stringify([...tokens, t]));
    closeSheet(f);
    toast(`Đã thêm ${c.name}.`);
    router.push(`/p/${t}`);
  };
  return (
    <Sheet title="Thêm con" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="link">Link giáo viên gửi</label>
          <input id="link" name="link" inputMode="url" autoComplete="off" aria-describedby="link-err" aria-invalid={err ? true : undefined} />
          <span className="hint">Dán nguyên link của con thứ hai. Mỗi con có một link riêng.</span>
          <span className="err" id="link-err">{err}</span>
        </div>
        <div className="actions"><button type="button" className="btn" onClick={(e) => closeSheet(e.currentTarget)}>Hủy</button><button className="btn primary" disabled={busy}>{busy ? "Đang kiểm tra..." : "Thêm con"}</button></div>
      </form>
    </Sheet>
  );
}
