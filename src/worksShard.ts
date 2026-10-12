// Công trình của tác giả nằm trong 1024 tệp khối public/data/works/wNNNN.json ({ "<mã tác giả>": [công trình...] }); khối = số trong mã tác giả chia lấy dư cho 1024.
// Cùng công thức ở scripts/_works-io.mjs và api/account.js. Khối đã tải được giữ lại để mở hồ sơ khác cùng khối không phải tải lại.
import type { Work } from "./types";
export const shardName = (id: string) => `w${String(Number(id.replace(/\D/g, "")) % 1024).padStart(4, "0")}`;
/** Một bản ghi thiếu trường không được làm hỏng cả trang hồ sơ: điền giá trị mặc định cho các trường giao diện đọc trực tiếp. */
const clean = (w: Work): Work => ({ ...w, title: typeof w.title === "string" && w.title.trim() ? w.title : "(không có tiêu đề)", year: Number.isFinite(w.year) ? w.year : 0, journal: typeof w.journal === "string" ? w.journal : "", issn: typeof w.issn === "string" ? w.issn : "", citations: Number.isFinite(w.citations) ? w.citations : 0, role: w.role === "lead" ? "lead" : "co", score: typeof w.score === "number" ? w.score : null, scoreDiscipline: w.scoreDiscipline ?? null, scoreKind: w.scoreKind ?? null, quartile: w.quartile ?? null });
const cache = new Map<string, Promise<Record<string, Work[]>>>();
export function fetchWorks(id: string, signal?: AbortSignal): Promise<Work[]> {
  const n = shardName(id);
  let p = cache.get(n);
  if (!p) {
    p = fetch(`./data/works/${n}.json`).then((r) => { if (!r.ok) throw new Error("http"); return r.json() as Promise<Record<string, Work[]>>; });
    p.catch(() => cache.delete(n)); // lỗi mạng: lần sau tải lại
    cache.set(n, p);
  }
  return p.then((o) => { if (signal?.aborted) throw new DOMException("aborted", "AbortError"); const w = o?.[id]; if (!Array.isArray(w)) { cache.delete(n); throw new Error("shape"); } return w.filter((x) => x && typeof x.id === "string").map(clean); });
}
