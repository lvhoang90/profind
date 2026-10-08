// Danh sách hồ sơ có DƯỚI 20% công trình mang liên kết tại Việt Nam (theo OpenAlex authorships, data/raw/_authorship.json) để quản trị viên xác nhận ngoại lệ.
//   node scripts/abroad-review.mjs   -> data/abroad-review.json (sắp theo hạng PRO-SCORE hiện có; chạy TRƯỚC khi dựng lại chỉ mục để còn hạng cũ)
// Ngoại lệ (vẫn xếp hạng): thêm mã vào data/vn-confirmed.json. Quy tắc áp dụng trong scripts/build-index.mjs (ABROAD_MAX, ABROAD_MIN_WORKS).
import { readFileSync, writeFileSync } from "node:fs";
const { maxVnShare: MAX, minWorks: MIN_WORKS } = JSON.parse(readFileSync("data/abroad-rule.json", "utf8"));
const A = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8")), P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const CONF = new Set(JSON.parse(readFileSync("data/vn-confirmed.json", "utf8")).ids ?? []);
const st = new Map();
for (const k in A) { const a = k.slice(0, k.indexOf("-")), c = A[k][1] ?? []; if (!c.length) continue; const e = st.get(a) ?? st.set(a, { n: 0, vn: 0, c: {} }).get(a); e.n++; if (c.includes("VN")) e.vn++; for (const x of new Set(c)) if (x !== "VN") e.c[x] = (e.c[x] ?? 0) + 1; }
const unit = new Map(P.institutions.map((i) => [i.id, i.name]));
const rows = [];
for (const a of P.authors) {
  if (a.proRank == null || a.top2 || CONF.has(a.id)) continue;
  const e = st.get(a.id); if (!e || e.n < MIN_WORKS || e.vn / e.n >= MAX) continue;
  rows.push({ id: a.id, name: a.name, orcid: a.orcid, prevRank: a.proRank, pro: a.pro, vnShare: Math.round(1000 * e.vn / e.n) / 10, worksWithAffil: e.n, vnWorks: e.vn, countries: Object.entries(e.c).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([c, n]) => `${c}:${n}`), units: a.institutions.map((i) => unit.get(i) ?? i) });
}
if (!rows.length) { console.log("Không còn hồ sơ đang xếp hạng dưới ngưỡng (quy tắc có thể đã được áp dụng): giữ nguyên tệp cũ."); process.exit(0); }
rows.sort((x, y) => x.prevRank - y.prevRank);
writeFileSync("data/abroad-review.json", JSON.stringify({ _note: "Ảnh chụp ngày " + P.meta.built + ": hồ sơ đang xếp hạng nhưng dưới 20% công trình có liên kết VN. Ngoại lệ: thêm mã vào data/vn-confirmed.json.", rule: { maxVnShare: MAX, minWorksWithAffiliation: MIN_WORKS }, total: rows.length, rows }, null, 1) + "\n");
console.log(`${rows.length} hồ sơ (trong top 1000: ${rows.filter((r) => r.prevRank <= 1000).length}, top 100: ${rows.filter((r) => r.prevRank <= 100).length})`);
