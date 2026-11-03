/* Helper UI dùng chung. Khi port: shell -> layout.tsx, sheet -> Dialog component, phần còn lại -> utils. */
import * as db from "./db.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmtDate = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
export const fmtScore = (n) => (n == null ? "—" : n.toLocaleString("vi-VN"));
export const parseScore = (v) => parseFloat(String(v).trim().replace(",", "."));
export const opts = (items, sel, placeholder) =>
  (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") +
  items.map((i) => `<option value="${esc(i.id ?? i)}"${(i.id ?? i) === sel ? " selected" : ""}>${esc(i.name ?? i)}</option>`).join("");

// Một bộ icon nét 2px, kế thừa màu chữ.
const icon = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  exams: icon('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
  classes: icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>'),
};
const NAV = {
  teacher: [["exams.html", "exams", "Bài thi"], ["classes.html", "classes", "Lớp học"]],
  parent: [],
};

/** Dựng khung trang, chặn sai vai trò. Trả về <main>. */
export async function shell(role, active) {
  // Phụ huynh không có tài khoản: quyền truy cập nằm ở token trong link (xem parent/*.html).
  const me = role === "teacher" ? await db.currentUser() : null;
  if (role === "teacher" && me?.role !== "teacher") {
    location.replace("../start.html");
    await new Promise(() => {});
  }
  const nav = NAV[role];
  document.getElementById("app").innerHTML = `
    <header class="topbar">
      <span class="brand">Quản lý bài thi</span>
      ${nav.length ? `<nav class="tabbar" aria-label="Chính">${nav.map(([href, key, label]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${ICONS[key]}<span>${label}</span></a>`).join("")}</nav>` : ""}
      <a class="btn ghost" href="../start.html"${me ? ` aria-label="Đổi tài khoản, đang dùng ${esc(me.name)}"` : ""}>Đổi tài khoản</a>
    </header>
    <main id="main" class="${nav.length ? "" : "no-tabbar"}"></main>
    <div id="toasts" aria-live="polite"></div>`;
  return document.getElementById("main");
}

/** Chép vào clipboard. navigator.clipboard cần https/localhost, qua IP LAN thì dùng execCommand. */
export async function copyText(text) {
  if (navigator.clipboard && isSecureContext) return navigator.clipboard.writeText(text);
  const t = Object.assign(document.createElement("textarea"), { value: text });
  t.style.cssText = "position:fixed;opacity:0";
  document.body.append(t);
  t.select();
  const ok = document.execCommand("copy");
  t.remove();
  if (!ok) throw new Error("copy failed");
}

export function toast(msg, type = "") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  document.getElementById("toasts").append(t);
  setTimeout(() => t.remove(), 3500);
}

export const skeleton = (n = 4) => '<div aria-busy="true" aria-label="Đang tải">' + '<div class="skel"></div>'.repeat(n) + "</div>";
export const empty = (msg, actionHtml = "") => `<div class="empty"><p>${esc(msg)}</p>${actionHtml}</div>`;
export const errorBox = (msg) => `<div class="alert" role="alert">${esc(msg)} <button class="btn ghost" data-retry>Thử lại</button></div>`;

/** Bottom sheet (mobile) / dialog giữa màn hình (md+). Trả về <dialog>. */
export function sheet(title, html, cls = "") {
  const d = document.createElement("dialog");
  d.className = "sheet " + cls;
  d.setAttribute("aria-label", title);
  d.innerHTML = `<div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="btn ghost" data-close aria-label="Đóng">Đóng</button></div><div class="sheet-body">${html}</div>`;
  document.body.append(d);
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  d.addEventListener("close", () => d.remove());
  d.showModal();
  return d;
}

/** Sheet bộ lọc. fields: [{key,label,items}], values: {key:id}. */
export function filterSheet(fields, values, apply) {
  const d = sheet("Lọc", `<form class="stack" novalidate>${fields.map((f) => `<div class="field"><label for="f-${f.key}">${esc(f.label)}</label><select id="f-${f.key}" name="${f.key}">${opts(f.items, values[f.key], "Tất cả")}</select></div>`).join("")}
    <div class="actions"><button type="button" class="btn" data-clear>Xóa lọc</button><button class="btn primary">Áp dụng</button></div></form>`);
  const form = d.querySelector("form");
  const done = (v) => { apply(v); d.close(); };
  form.addEventListener("submit", (e) => { e.preventDefault(); done(Object.fromEntries(fields.map((f) => [f.key, form.elements[f.key].value || undefined]))); });
  d.querySelector("[data-clear]").addEventListener("click", () => done({}));
}
export const countFilters = (v) => Object.values(v).filter(Boolean).length;

/** Nén ảnh phía client: tối đa 1600px, JPEG 0.8. */
export async function compressImage(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
}

/** Xem ảnh toàn màn hình, nút bật/tắt phóng to. */
export async function zoom(path, alt) {
  const url = await db.getImageUrl(path);
  const d = sheet(alt, `<img src="${url}" alt="${esc(alt)}">`, "zoom");
  const head = d.querySelector(".sheet-head");
  head.insertAdjacentHTML("beforeend", '<button type="button" class="btn" data-zoom aria-pressed="false">Phóng to</button>');
  head.querySelector("[data-zoom]").addEventListener("click", (e) => {
    const big = d.classList.toggle("big");
    e.currentTarget.setAttribute("aria-pressed", big);
    e.currentTarget.textContent = big ? "Thu nhỏ" : "Phóng to";
  });
}

export const statusBadge = (s) => (s === "published" ? '<span class="badge success">Đã đăng</span>' : '<span class="badge warning">Nháp</span>');
