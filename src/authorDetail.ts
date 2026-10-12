// Trường chi tiết của hồ sơ (điểm thành phần, phân bố ngành, quốc gia chính…) nằm trong public/data/authors/pNNN.json ({ "<mã>": {...} }); NNN = số trong mã chia dư 256.
// Cùng công thức ở scripts/build-lite.mjs. Khối đã tải được giữ lại; lỗi thì lần sau tải lại.
import type { Author } from "./types";
export const detailShard = (id: string) => `p${String(Number(id.replace(/\D/g, "")) % 256).padStart(3, "0")}`;
const cache = new Map<string, Promise<Record<string, Partial<Author>>>>();
export function fetchDetail(id: string): Promise<Partial<Author>> {
  const n = detailShard(id);
  let p = cache.get(n);
  if (!p) {
    p = fetch(`./data/authors/${n}.json`).then((r) => { if (!r.ok) throw new Error("http"); return r.json() as Promise<Record<string, Partial<Author>>>; });
    p.catch(() => cache.delete(n));
    cache.set(n, p);
  }
  return p.then((o) => o?.[id] ?? {}); // hồ sơ không có trường chi tiết (không có điểm…) thì để trống
}
