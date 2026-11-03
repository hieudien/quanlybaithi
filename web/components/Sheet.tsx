"use client";
import { useRef, useEffect, useState } from "react";

/** Bottom sheet (mobile) / dialog giữa màn hình (md+). Mount = mở, onClose = đã đóng (nút, Esc, bấm nền). */
export function Sheet({ title, onClose, className = "", extraHead, children }: {
  title: string; onClose: () => void; className?: string; extraHead?: React.ReactNode; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`sheet ${className}`} aria-label={title} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="sheet-head">
        <h2>{title}</h2>
        {extraHead}
        <button type="button" className="btn ghost" aria-label="Đóng" onClick={() => ref.current?.close()}>Đóng</button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}

/** Đóng sheet từ bên trong (vd. nút Hủy). */
export const closeSheet = (el: HTMLElement) => el.closest("dialog")?.close();

export interface FilterField { key: string; label: string; items: { id: string; name: string }[] }

export function FilterSheet({ fields, values, onApply, onClose }: {
  fields: FilterField[]; values: Record<string, string | undefined>; onApply: (v: Record<string, string | undefined>) => void; onClose: () => void;
}) {
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const v: Record<string, string | undefined> = {};
    for (const x of fields) v[x.key] = (f.elements.namedItem(x.key) as HTMLSelectElement).value || undefined;
    onApply(v);
    closeSheet(f);
  };
  return (
    <Sheet title="Lọc" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`f-${f.key}`}>{f.label}</label>
            <select id={`f-${f.key}`} name={f.key} defaultValue={values[f.key] ?? ""}>
              <option value="">Tất cả</option>
              {f.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        ))}
        <div className="actions">
          <button type="button" className="btn" onClick={(e) => { onApply({}); closeSheet(e.currentTarget); }}>Xóa lọc</button>
          <button className="btn primary">Áp dụng</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Xem ảnh toàn màn hình, nút bật/tắt phóng to. */
export function ZoomSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [big, setBig] = useState(false);
  return (
    <Sheet title={title} onClose={onClose} className={`zoom ${big ? "big" : ""}`}
      extraHead={<button type="button" className="btn" aria-pressed={big} onClick={() => setBig(!big)}>{big ? "Thu nhỏ" : "Phóng to"}</button>}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={title} />
    </Sheet>
  );
}
