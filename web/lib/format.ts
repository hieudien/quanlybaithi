export const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
export const fmtScore = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("vi-VN"));
export const parseScore = (v: string) => parseFloat(String(v).trim().replace(",", "."));

/** Nén ảnh phía client: tối đa 1600px, JPEG 0.8. */
export async function compressImage(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.8));
}

/** Chép vào clipboard. navigator.clipboard cần https/localhost, qua IP LAN thì dùng execCommand. */
export async function copyText(text: string) {
  if (navigator.clipboard && isSecureContext) return navigator.clipboard.writeText(text);
  const t = Object.assign(document.createElement("textarea"), { value: text });
  t.style.cssText = "position:fixed;opacity:0";
  document.body.append(t);
  t.select();
  const ok = document.execCommand("copy");
  t.remove();
  if (!ok) throw new Error("copy failed");
}

export const countFilters = (v: Record<string, string | undefined>) => Object.values(v).filter(Boolean).length;
