// Phần thuần của import-scopus.mjs: đọc CSV danh sách nguồn Scopus (Elsevier "Source title list") và gộp ISSN -> trạng thái. Tách riêng để có test.
import { parseCsv } from "./wos.mjs";

/** "20349130" hoặc "2034-9130" -> "2034-9130"; null nếu không phải ISSN 8 ký tự. Scopus bỏ dấu gạch, và có thể mất số 0 đầu khi mở bằng bảng tính. */
export function normIssn(s) {
  const t = String(s ?? "").trim().toUpperCase().replace("-", "");
  if (!/^\d{1,7}[\dX]$/.test(t)) return null;
  const p = t.padStart(8, "0"); return `${p.slice(0, 4)}-${p.slice(4)}`;
}

/** CSV -> { issn: "A" (đang lập chỉ mục) | "I" (đã ngừng) }, chỉ Source Type = Journal; Active thắng nếu một ISSN xuất hiện nhiều lần; chỉ ISSN trong `keep` nếu có. */
export function scopusStatus(text, keep) {
  const rows = parseCsv(text); if (rows.length < 2) return {};
  const h = rows[0].map((x) => x.trim().toLowerCase()), col = (re) => h.findIndex((x) => re.test(x));
  const a = col(/^issn$/), b = col(/^e-?issn$/), st = col(/^active or inactive$/), ty = col(/^source type$/);
  if (st < 0) return {};
  const out = {};
  for (const r of rows.slice(1)) {
    if (ty > -1 && (r[ty] ?? "").trim() !== "Journal") continue;
    const s = (r[st] ?? "").trim().toLowerCase(), v = s === "active" ? "A" : s === "inactive" ? "I" : null; if (!v) continue;
    for (const i of [a, b]) { const n = i > -1 ? normIssn(r[i]) : null; if (!n || (keep && !keep.has(n))) continue; if (out[n] !== "A") out[n] = v; }
  }
  return out;
}
