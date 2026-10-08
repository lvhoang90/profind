// Quy tắc "liên kết chính ở nước ngoài" (bảng xếp hạng chỉ dành cho Việt Nam). Dùng chung cho build-index.mjs, abroad-review.mjs, abroad-panel.mjs, abroad-decision.mjs.
// Hai yếu tố, đo trên các công trình mà OpenAlex ghi cơ quan của chính tác giả đó (data/raw/_authorship.json):
//  1) Yếu tố GẦN ĐÂY (quan trọng nhất): trong cửa sổ `window` năm gần nhất (hiện là 2024, 2025, 2026), ở MỖI năm có công bố, tỉ lệ công trình mang liên kết Việt Nam phải đạt tối thiểu `recentMinShare`
//     (đo bằng tỉ lệ thấp nhất theo năm: một năm mất liên kết thì không còn "liên tục"). Cần tối thiểu `recentMinWorks` công trình có ghi cơ quan trong cửa sổ để có bằng chứng.
//  2) Yếu tố DÀI HẠN (chỉ dùng khi KHÔNG đủ bằng chứng gần đây): tỉ lệ công trình có liên kết Việt Nam trên toàn bộ công trình có ghi cơ quan (tối thiểu `minWorks`) phải đạt `maxVnShare`.
// Ngưỡng `recentMinShare` và `maxVnShare` do hội đồng mô phỏng quyết định (scripts/abroad-decision.mjs ghi vào data/abroad-rule.json).
import { readFileSync, existsSync } from "node:fs";
export const loadRule = () => JSON.parse(readFileSync("data/abroad-rule.json", "utf8"));
export const windowYears = (rule, year) => Array.from({ length: rule.window }, (_, i) => year - rule.window + 1 + i);
/** Thống kê theo tác giả từ authorship + năm công trình: { n, vn, y: { năm: { n, vn } } } (chỉ ghi năm trong cửa sổ). */
export function buildStats(works, rule, year) {
  const yr = new Map(works.map((w) => [w.id, w.year])), win = new Set(windowYears(rule, year)), st = new Map();
  if (!existsSync("data/raw/_authorship.json")) return st;
  const AU = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8"));
  for (const k in AU) {
    const c = AU[k][1] ?? []; if (!c.length) continue;
    const id = k.slice(0, k.indexOf("-")), e = st.get(id) ?? st.set(id, { n: 0, vn: 0, y: {}, cn: {}, cr: {}, nr: 0 }).get(id), v = c.includes("VN"); e.n++; if (v) e.vn++; for (const x of new Set(c)) e.cn[x] = (e.cn[x] ?? 0) + 1;
    const y = yr.get(k); if (win.has(y)) { const o = e.y[y] ?? (e.y[y] = { n: 0, vn: 0 }); o.n++; if (v) o.vn++; for (const x of new Set(c)) e.cr[x] = (e.cr[x] ?? 0) + 1; e.nr = (e.nr ?? 0) + 1; }
  }
  return st;
}
/** Đặc trưng của một tác giả: overall (% toàn bộ), recent (% thấp nhất theo năm trong cửa sổ), recentWorks. null nếu chưa đủ bằng chứng. */
export function features(e, rule, year) {
  if (!e) return { overall: null, recent: null, recentWorks: 0 };
  const ys = windowYears(rule, year).filter((y) => e.y[y]), rw = ys.reduce((s, y) => s + e.y[y].n, 0);
  return { overall: e.n >= rule.minWorks ? Math.round((1000 * e.vn) / e.n) / 10 : null, recent: rw >= rule.recentMinWorks ? Math.round(1000 * Math.min(...ys.map((y) => e.y[y].vn / e.y[y].n))) / 10 : null, recentWorks: rw };
}
/** Phán quyết: "recent" | "overall" (yếu tố nào quyết định) và abroad (true = liên kết chính ở nước ngoài). */
export function verdict(f, rule) {
  if (f.recent != null) return { basis: "recent", abroad: f.recent < rule.recentMinShare * 100 };
  if (f.overall != null) return { basis: "overall", abroad: f.overall < rule.maxVnShare * 100 };
  return { basis: null, abroad: false };
}
/** Quy tắc 3, NƯỚC CÔNG BỐ CHÍNH, tính theo `window` năm gần nhất (hiện 2024-2026): quốc gia có nhiều công trình nhất (mỗi công trình tính một lần cho mỗi quốc gia có cơ quan của tác giả đó)
 *  mà không phải Việt Nam thì hồ sơ bị loại khỏi bảng. Cần tối thiểu `recentMinWorks` công trình có ghi cơ quan trong cửa sổ; nếu chưa đủ thì dùng toàn bộ công trình (tối thiểu `minWorks`),
 *  giống cấu trúc của hai yếu tố trên. Việt Nam ngang bằng quốc gia đứng đầu thì vẫn coi là Việt Nam (nghi ngờ nghiêng về giữ lại).
 *  Trả { abroad, country, works, vnWorks, n, basis } hoặc null nếu chưa đủ bằng chứng. */
export function mainCountry(e, rule) {
  if (!e) return null;
  const recent = e.nr >= rule.recentMinWorks, cn = recent ? e.cr : e.cn, n = recent ? e.nr : e.n;
  if (!recent && e.n < rule.minWorks) return null;
  const top = Object.entries(cn ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]; if (!top) return null;
  const vn = cn.VN ?? 0, basis = recent ? "recent" : "overall";
  return vn >= top[1] ? { abroad: false, country: "VN", works: vn, vnWorks: vn, n, basis } : { abroad: true, country: top[0], works: top[1], vnWorks: vn, n, basis };
}
