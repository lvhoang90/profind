// Lọc các cặp ĐÃ GỘP có điểm nghi trùng thấp và chủ đề công trình lệch để quản trị viên duyệt lại (giữ gộp hoặc tách ra).
//   node scripts/make-recheck.mjs --cand <split-candidates.json cũ có điểm> [--min 60] [--max 65]
// Cặp đã gộp lấy từ data/corrections.json (mục merge). "Chủ đề lệch": thiếu công trình để so, hoặc độ giống ngành < 0,7, hoặc (độ giống từ khóa < 0,03 và độ giống ngành < 0,85).
// Ghi public/data/_split-recheck.json cho tab "Rà soát gộp" ở trang quản trị.
import { readFileSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const cand = JSON.parse(readFileSync(arg("cand"), "utf8")), MIN = +arg("min", 60), MAX = +arg("max", 65);
const C = new Map(cand.map((p) => [[p.a, p.b].sort().join("|"), p])), corr = JSON.parse(readFileSync("data/corrections.json", "utf8"));
const out = [];
for (const m of corr.merge) for (const f of m.from) { const p = C.get([m.into, f].sort().join("|")); if (!p) continue;
  const lech = p.noWorks || p.field == null || p.field < 0.7 || (p.topic != null && p.topic < 0.03 && p.field < 0.85);
  if (p.score >= MIN && p.score <= MAX && lech) out.push({ ...p, into: m.into, why: p.noWorks || p.field == null ? "thiếu công trình để so" : p.field < 0.7 ? `độ giống ngành thấp (${p.field})` : `ít từ khóa chung (${p.topic}), ngành ${p.field}` }); }
out.sort((a, b) => a.score - b.score);
writeFileSync("public/data/_split-recheck.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), pairs: out }));
console.log(`Cặp đã gộp điểm ${MIN}-${MAX} cần duyệt lại: ${out.length}.`);
