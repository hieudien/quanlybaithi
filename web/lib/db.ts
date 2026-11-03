/*
 * Lớp dữ liệu DUY NHẤT. Mọi trang chỉ gọi hàm ở đây, không đụng localStorage.
 * Hiện tại: dữ liệu demo trong trình duyệt (localStorage + IndexedDB), chỉ chạy phía client.
 * Khi nối Supabase: viết lại thân hàm, giữ nguyên tên hàm và kiểu trả về.
 * - load/save(table)      -> supabase.from(table)
 * - putImage/getImageUrl  -> storage.upload / createSignedUrl (bucket private)
 * - only("teacher")       -> policy RLS trong Postgres
 * - nhóm "Phụ huynh" (theo token) -> RPC security definer, xem demo/MIGRATION.md
 */

export type Status = "draft" | "published";
export interface Profile { id: string; role: "teacher"; name: string }
export interface Subject { id: string; name: string }
export interface ExamType { id: string; name: string; weight: number }
export interface Klass { id: string; name: string; year: string }
export interface Student { id: string; class_id: string; name: string; token: string }
export interface Exam { id: string; title: string; class_id: string; subject_id: string; type_id: string; date: string; term: string; max_score: number; created_at?: string }
export interface PaperRow { id: string; exam_id: string; student_id: string; score: number | null; comment: string; status: Status; created_at: string; published_at?: string | null }
interface ImageRow { id: string; paper_id: string; path: string; position: number }
interface ViewRow { paper_id: string; viewed_at: string }
export interface ExamFull extends Exam { class: Klass; subject: Subject; type: ExamType }
export interface ExamSummary extends ExamFull { total: number; paper_count: number; published: number }
export interface Paper extends PaperRow { student: Student; exam: ExamFull; images: string[]; viewed: boolean }
export interface Child { id: string; name: string; class: Klass }
export interface ClassSummary extends Klass { student_count: number }
export interface StudentRow extends Student { opened: boolean }
export interface PaperFilter { examId?: string; studentId?: string; classId?: string; subjectId?: string; typeId?: string; term?: string }
export interface ExamFilter { classId?: string; subjectId?: string; typeId?: string; term?: string }
export interface SavePaperInput { id?: string; exam_id: string; student_id: string; score: number | null; comment: string; status: Status; images: string[] }

const K = "qlbt:";
const SEED_VERSION = "4"; // đổi số này khi đổi cấu trúc dữ liệu mẫu -> tự seed lại
const load = <T>(t: string): T[] => JSON.parse(localStorage.getItem(K + t) || "[]");
const save = (t: string, v: unknown) => localStorage.setItem(K + t, JSON.stringify(v));
// crypto.randomUUID chỉ có ở secure context (https/localhost), mở qua IP LAN thì không có -> tự dựng UUID v4.
const uid = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const now = () => new Date().toISOString();

export const TERMS = ["HK1 2026-2027", "HK2 2026-2027"];

/* ---------- Ảnh: IndexedDB (localStorage chỉ ~5MB) ---------- */
let _db: Promise<IDBDatabase> | undefined;
const idb = () => (_db ??= new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("qlbt", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("images");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));
const tx = async <T = unknown>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await idb();
  return new Promise<T>((res, rej) => {
    const t = db.transaction("images", mode);
    const q = fn(t.objectStore("images"));
    t.oncomplete = () => res(q?.result as T);
    t.onerror = () => rej(t.error);
  });
};
const urlCache = new Map<string, string>();
async function putImageRaw(blob: Blob) {
  const path = `papers/${uid()}`;
  await tx("readwrite", (s) => s.put(blob, path));
  return path;
}
const delImage = (path: string) => tx("readwrite", (s) => s.delete(path));

/* ---------- Khởi tạo dữ liệu mẫu (lần đầu hoặc khi đổi SEED_VERSION) ---------- */
let _ready: Promise<void> | undefined;
const ready = () => (_ready ??= (async () => {
  if (localStorage.getItem(K + "seeded") !== SEED_VERSION) await resetDemoRaw();
})());

export async function putImage(blob: Blob) { await ready(); return putImageRaw(blob); }
export async function getImageUrl(path: string) {
  await ready();
  if (!urlCache.has(path)) {
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(path));
    urlCache.set(path, blob ? URL.createObjectURL(blob) : "");
  }
  return urlCache.get(path) as string;
}

/* ---------- Phiên đăng nhập giả lập ---------- */
export async function listProfiles() { await ready(); return load<Profile>("profiles"); }
export const login = (id: string) => localStorage.setItem(K + "me", id);
export const logout = () => localStorage.removeItem(K + "me");
export async function currentUser() {
  await ready();
  const id = localStorage.getItem(K + "me");
  return load<Profile>("profiles").find((p) => p.id === id) || null;
}
async function only(role: "teacher") {
  const me = await currentUser();
  if (me?.role !== role) throw new Error("Bạn không có quyền thực hiện thao tác này.");
  return me;
}

/* ---------- Tra cứu ---------- */
export async function listSubjects() { await ready(); return load<Subject>("subjects"); }
export async function listExamTypes() { await ready(); return load<ExamType>("exam_types"); }
export async function listClasses(): Promise<ClassSummary[]> {
  await ready();
  const students = load<Student>("students");
  return load<Klass>("classes").map((c) => ({ ...c, student_count: students.filter((s) => s.class_id === c.id).length }));
}
export async function createClass({ name, year }: { name: string; year: string }) {
  await only("teacher");
  const c: Klass = { id: uid(), name, year };
  save("classes", [...load<Klass>("classes"), c]);
  return c.id;
}

/* ---------- Học sinh ---------- */
// Token bí mật 20 ký tự (~100 bit) trong link phụ huynh. Supabase: encode(gen_random_bytes(15),'hex').
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
export async function listStudents({ classId }: { classId?: string } = {}): Promise<StudentRow[]> {
  await only("teacher");
  const views = load<ViewRow>("paper_views"), papers = load<PaperRow>("papers");
  return load<Student>("students")
    .filter((s) => !classId || s.class_id === classId)
    .map((s) => {
      const mine = new Set(papers.filter((p) => p.student_id === s.id).map((p) => p.id));
      return { ...s, opened: views.some((v) => mine.has(v.paper_id)) };
    });
}
export async function createStudents(classId: string, names: string[]) {
  await only("teacher");
  const rows: Student[] = names.map((n) => n.trim()).filter(Boolean).map((name) => ({ id: uid(), class_id: classId, name, token: newToken() }));
  save("students", [...load<Student>("students"), ...rows]);
  return rows.length;
}
// Đổi token: link cũ lập tức vô hiệu (dùng khi link bị lộ).
export async function resetToken(studentId: string) {
  await only("teacher");
  save("students", load<Student>("students").map((s) => (s.id === studentId ? { ...s, token: newToken() } : s)));
}

/* ---------- Phụ huynh: truy cập bằng link bí mật, KHÔNG tài khoản ----------
 * Supabase: mỗi hàm dưới đây = 1 RPC `security definer` nhận `token`, gọi bằng anon key.
 * Không mở select trực tiếp cho anon; token sai -> trả rỗng/lỗi. */
const byToken = (token: string) => load<Student>("students").find((s) => s.token === token) || null;
export async function getChild(token: string): Promise<Child | null> {
  await ready();
  const s = byToken(token);
  if (!s) return null;
  const klass = load<Klass>("classes").find((c) => c.id === s.class_id);
  return klass ? { id: s.id, name: s.name, class: klass } : null;
}
export async function listChildPapers(token: string, filter: PaperFilter = {}) {
  await ready();
  const s = byToken(token);
  if (!s) throw new Error("Link không hợp lệ.");
  return (await queryPapers({ ...filter, studentId: s.id })).filter((p) => p.status === "published");
}
export async function getChildPaper(token: string, id: string) {
  await ready();
  if (!byToken(token)) return null;
  return (await listChildPapers(token)).find((p) => p.id === id) || null;
}
export async function markViewed(token: string, paperId: string) {
  const p = await getChildPaper(token, paperId);
  const v = load<ViewRow>("paper_views");
  if (p && !v.some((x) => x.paper_id === paperId)) save("paper_views", [...v, { paper_id: paperId, viewed_at: now() }]);
}

/* ---------- Bài thi ---------- */
export async function listExams({ classId, subjectId, typeId, term }: ExamFilter = {}): Promise<ExamSummary[]> {
  await only("teacher");
  const classes = load<Klass>("classes"), subjects = load<Subject>("subjects"), types = load<ExamType>("exam_types");
  const papers = load<PaperRow>("papers"), students = load<Student>("students");
  return load<Exam>("exams")
    .filter((e) => (!classId || e.class_id === classId) && (!subjectId || e.subject_id === subjectId) && (!typeId || e.type_id === typeId) && (!term || e.term === term))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => {
      const ps = papers.filter((p) => p.exam_id === e.id);
      return {
        ...e,
        class: classes.find((c) => c.id === e.class_id)!,
        subject: subjects.find((s) => s.id === e.subject_id)!,
        type: types.find((t) => t.id === e.type_id)!,
        total: students.filter((s) => s.class_id === e.class_id).length,
        paper_count: ps.length,
        published: ps.filter((p) => p.status === "published").length,
      };
    });
}
export async function getExam(id: string) {
  return (await listExams()).find((e) => e.id === id) || null;
}
export async function createExam(data: Omit<Exam, "id" | "created_at">) {
  await only("teacher");
  const e: Exam = { id: uid(), ...data, created_at: now() };
  save("exams", [...load<Exam>("exams"), e]);
  return e.id;
}

/* ---------- Bài làm ---------- */
function queryPapers({ examId, studentId, classId, subjectId, typeId, term }: PaperFilter = {}): Paper[] {
  const students = load<Student>("students"), exams = load<Exam>("exams"), classes = load<Klass>("classes");
  const subjects = load<Subject>("subjects"), types = load<ExamType>("exam_types");
  const images = load<ImageRow>("paper_images"), views = load<ViewRow>("paper_views");
  return load<PaperRow>("papers")
    .map((p): Paper => {
      const e = exams.find((x) => x.id === p.exam_id)!;
      return {
        ...p,
        student: students.find((s) => s.id === p.student_id)!,
        exam: { ...e, class: classes.find((x) => x.id === e.class_id)!, subject: subjects.find((x) => x.id === e.subject_id)!, type: types.find((x) => x.id === e.type_id)! },
        images: images.filter((i) => i.paper_id === p.id).sort((a, b) => a.position - b.position).map((i) => i.path),
        viewed: views.some((v) => v.paper_id === p.id),
      };
    })
    .filter((p) =>
      (!examId || p.exam_id === examId) && (!studentId || p.student_id === studentId) &&
      (!classId || p.exam.class_id === classId) && (!subjectId || p.exam.subject_id === subjectId) &&
      (!typeId || p.exam.type_id === typeId) && (!term || p.exam.term === term))
    .sort((a, b) => b.exam.date.localeCompare(a.exam.date) || a.student.name.localeCompare(b.student.name, "vi"));
}
export async function listPapers(filter?: PaperFilter) {
  await only("teacher");
  return queryPapers(filter);
}
export async function getPaper(id: string) {
  return (await listPapers()).find((p) => p.id === id) || null;
}
export async function savePaper({ id, exam_id, student_id, score, comment, status, images }: SavePaperInput) {
  await only("teacher");
  const papers = load<PaperRow>("papers");
  let p: PaperRow | undefined;
  if (id) p = papers.find((x) => x.id === id);
  else {
    if (papers.some((x) => x.exam_id === exam_id && x.student_id === student_id)) throw new Error("Học sinh này đã có bài làm trong bài thi.");
    p = { id: uid(), exam_id, student_id, score: null, comment: "", status: "draft", created_at: now() };
    papers.push(p);
  }
  if (!p) throw new Error("Không tìm thấy bài làm.");
  Object.assign(p, { score, comment, status });
  if (status === "published" && !p.published_at) p.published_at = now();
  save("papers", papers);
  const old = load<ImageRow>("paper_images");
  const pid = p.id;
  await Promise.all(old.filter((i) => i.paper_id === pid && !images.includes(i.path)).map((i) => delImage(i.path)));
  save("paper_images", [...old.filter((i) => i.paper_id !== pid), ...images.map((path, position) => ({ id: uid(), paper_id: pid, path, position }))]);
  return pid;
}
export async function deletePaper(id: string) {
  await only("teacher");
  const imgs = load<ImageRow>("paper_images").filter((i) => i.paper_id === id);
  await Promise.all(imgs.map((i) => delImage(i.path)));
  save("paper_images", load<ImageRow>("paper_images").filter((i) => i.paper_id !== id));
  save("paper_views", load<ViewRow>("paper_views").filter((v) => v.paper_id !== id));
  save("papers", load<PaperRow>("papers").filter((p) => p.id !== id));
}
export async function publishDrafts(examId: string) {
  await only("teacher");
  const withImages = new Set(load<ImageRow>("paper_images").map((i) => i.paper_id));
  let n = 0;
  const papers = load<PaperRow>("papers").map((p) => {
    if (p.exam_id === examId && p.status === "draft" && withImages.has(p.id)) { n++; return { ...p, status: "published" as const, published_at: now() }; }
    return p;
  });
  save("papers", papers);
  return n;
}

/* ---------- Dữ liệu mẫu ---------- */
async function resetDemoRaw() {
  Object.keys(localStorage).filter((k) => k.startsWith(K)).forEach((k) => localStorage.removeItem(k));
  urlCache.clear();
  if (_db) (await _db).close();
  _db = undefined;
  await new Promise((res) => { const r = indexedDB.deleteDatabase("qlbt"); r.onsuccess = r.onerror = r.onblocked = res; });
  await seed();
}
export async function resetDemo() {
  await resetDemoRaw();
  _ready = Promise.resolve();
}

function paperSvg(title: string, name: string, score: string, page: number) {
  const rules = Array.from({ length: 21 }, (_, i) => `<line x1="36" x2="564" y1="${150 + i * 30}" y2="${150 + i * 30}" stroke="#b8c6de"/>`).join("");
  const scribbles = Array.from({ length: 9 }, (_, i) => `<text x="80" y="${144 + i * 60}" font-size="18" fill="#1d3a8a" font-family="serif">Câu ${page === 2 ? i + 6 : i + 1}.</text><path d="M120 ${144 + i * 60} q8 -10 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" stroke="#1d3a8a" fill="none"/>`).join("");
  const mark = page === 1 ? `<text x="440" y="70" font-size="48" fill="#c0392b" font-family="cursive" transform="rotate(-8 440 70)">${score}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><rect width="600" height="800" fill="#fdfcf6"/><line x1="64" x2="64" y1="0" y2="800" stroke="#e48b8b"/>${rules}<text x="80" y="50" font-size="22" font-family="serif" font-weight="bold">${title}</text><text x="80" y="90" font-size="18" font-family="serif">Họ và tên: ${name}</text>${mark}${scribbles}</svg>`;
}

async function seed() {
  const teacher: Profile = { id: uid(), role: "teacher", name: "Trịnh Xuân Mạnh" };
  const subjects: Subject[] = ["Toán"].map((name) => ({ id: uid(), name })); // thêm môn khác: thêm tên vào mảng (UI tự hiện ô chọn môn khi có ≥ 2 môn)
  const types: ExamType[] = ([["15 phút", 1], ["45 phút", 2], ["Giữa kỳ", 2], ["Cuối kỳ", 3]] as const).map(([name, weight]) => ({ id: uid(), name, weight }));
  const toan = subjects[0];
  const [t15, t45] = types;
  const c1: Klass = { id: uid(), name: "7A1", year: "2026-2027" };
  const c2: Klass = { id: uid(), name: "7A2", year: "2026-2027" };
  const mk = (class_id: string, names: string[]): Student[] => names.map((name) => ({ id: uid(), class_id, name, token: newToken() }));
  const s1 = mk(c1.id, ["Trần Minh Khôi", "Nguyễn Hà My", "Lê Quang Huy", "Phạm Thu Trang", "Vũ Đức Anh", "Hoàng Gia Bảo"]);
  const s2 = mk(c2.id, ["Trần Bảo Ngọc", "Đặng Khánh Linh", "Bùi Tuấn Kiệt", "Ngô Phương Thảo", "Đỗ Minh Quân"]);
  const E = (title: string, c: Klass, type: ExamType, date: string, scores: (number | null)[]) =>
    ({ exam: { id: uid(), title, class_id: c.id, subject_id: toan.id, type_id: type.id, date, term: TERMS[0], max_score: 10 } as Exam, scores });
  const defs = [
    E("Kiểm tra 15 phút Toán lần 1", c1, t15, "2026-09-20", [8, 9, 6.5, 7.5, 5, 8.5]),
    E("Kiểm tra 15 phút Toán lần 2", c1, t15, "2026-10-05", [7, 8.5, 6, 8, 5.5, 7.5]),
    E("Kiểm tra 15 phút Toán lần 3", c1, t15, "2026-10-12", [9, 8, 7, 8.5, 6.5, 7]),
    E("Kiểm tra 45 phút Toán", c1, t45, "2026-10-25", [8.5, 9.5, 7, 8, 6, null]),
    E("Kiểm tra 15 phút Toán", c2, t15, "2026-10-10", [9, 7, 6, 8.5, 7.5]),
    E("Kiểm tra 45 phút Toán", c2, t45, "2026-10-28", [8.5, 7.5, 5.5, 9, 6.5]),
  ];
  const comment = (s: number) => s >= 8.5 ? "Con làm bài tốt, trình bày sạch sẽ. Cần cẩn thận hơn ở các câu vận dụng cao."
    : s >= 7 ? "Con nắm được kiến thức cơ bản nhưng còn sai ở bước biến đổi. Cần kiểm tra lại kết quả trước khi nộp bài."
    : "Con chưa nắm chắc các dạng bài đã sửa trên lớp. Phụ huynh nhắc con ôn lại vở bài tập và làm lại các câu sai.";
  const papers: PaperRow[] = [], paper_images: ImageRow[] = [], views: ViewRow[] = [];
  for (const { exam, scores } of defs) {
    const studs = exam.class_id === c1.id ? s1 : s2;
    for (const [i, st] of studs.entries()) {
      const score = scores[i];
      if (score == null) continue;
      const draft = exam.class_id === c1.id && exam.type_id === t45.id && (i === 2 || i === 4);
      const p: PaperRow = { id: uid(), exam_id: exam.id, student_id: st.id, score, comment: comment(score), status: draft ? "draft" : "published", created_at: now(), published_at: draft ? null : now() };
      papers.push(p);
      const pages = exam.type_id === t45.id ? 2 : 1;
      for (let pg = 1; pg <= pages; pg++) {
        const blob = new Blob([paperSvg(exam.title, st.name, String(score).replace(".", ","), pg)], { type: "image/svg+xml" });
        paper_images.push({ id: uid(), paper_id: p.id, path: await putImageRaw(blob), position: pg - 1 });
      }
      if (!draft && i === 1) views.push({ paper_id: p.id, viewed_at: now() }); // phụ huynh Hà My đã xem hết
    }
  }
  // Khôi: chỉ bài 15 phút Toán đã xem, các bài khác hiện "Mới"
  const old = papers.find((p) => p.student_id === s1[0].id && p.exam_id === defs[0].exam.id);
  if (old) views.push({ paper_id: old.id, viewed_at: now() });
  save("profiles", [teacher]); save("subjects", subjects); save("exam_types", types);
  save("classes", [c1, c2]); save("students", [...s1, ...s2]);
  save("exams", defs.map((d) => d.exam)); save("papers", papers); save("paper_images", paper_images); save("paper_views", views);
  localStorage.setItem(K + "seeded", SEED_VERSION);
}

// Chỉ dành cho trang chọn tài khoản của demo: link mẫu để thử vai phụ huynh.
export async function listDemoLinks() {
  await ready();
  const klasses = load<Klass>("classes");
  return load<Student>("students")
    .filter((s) => ["Trần Minh Khôi", "Trần Bảo Ngọc", "Ngô Phương Thảo"].includes(s.name))
    .map((s) => ({ ...s, className: klasses.find((c) => c.id === s.class_id)?.name ?? "" }));
}
