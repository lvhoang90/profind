// Hạng SJR dự phòng cho tạp chí Scopus mà bảng hạng theo ngành (data/sjr-rules.json: sjrByIssn, nhập từ EduFind) không có dòng:
//   A. tạp chí đa ngành / "General …" (Nature, PNAS, Heliyon...): lấy hạng Q tốt nhất trong danh mục của tạp chí;
//   B. tạp chí đã ngừng được Scopus lập chỉ mục: hạng SJR của năm cuối còn trong SCImago;
//   C. tạp chí còn hoạt động nhưng thiếu dòng (lệch ISSN, danh mục chưa cấu hình...).
// Đầu vào: các tệp SCImago "tất cả tạp chí theo năm" (scimagojr.com/journalrank.php?year=YYYY, bỏ trống lĩnh vực/danh mục, Download data):
//   data/scimago/scimago_<năm>.csv (không đưa vào kho vì ~11 MB mỗi năm). Đầu ra: data/sjr-fallback.json (chỉ tạp chí chưa có dòng trong sjrByIssn).
//   node scripts/build-sjr-fallback.mjs [thư-mục-csv]
// build-index.mjs dùng bảng này khi công trình của tác giả chính chưa có điểm từ danh mục trong nước hoặc SJR theo ngành, và năm công bố nằm trong Coverage.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
const dir = process.argv[2] ?? "data/scimago";
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ";") { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const files = readdirSync(dir).map((f) => /^scimago_(\d{4})\.csv$/.exec(f)).filter(Boolean).map((m) => ({ f: m[0], y: +m[1] })).sort((a, b) => a.y - b.y);
if (!files.length) throw new Error(`Không thấy ${dir}/scimago_<năm>.csv`);
const S = JSON.parse(readFileSync("data/sjr-rules.json", "utf8")), have = new Set(Object.keys(S.sjrByIssn).map((i) => i.replace("-", "")));
const last = new Map(); // Sourceid -> bản ghi của năm mới nhất
for (const { f, y } of files) {
  const [h, ...rows] = parseCsv(readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, "")).filter((r) => r.length > 8);
  const c = (name) => h.findIndex((x) => x.toLowerCase().startsWith(name.toLowerCase()));
  const ix = { id: c("Sourceid"), title: c("Title"), type: c("Type"), issn: c("Issn"), best: c("SJR Best Quartile"), h: c("H index"), cov: c("Coverage"), cats: c("Categories") };
  if (Object.values(ix).some((v) => v < 0)) throw new Error(`Cột lạ ở ${f}: ${h.join(" | ")}`);
  for (const r of rows) {
    if (r[ix.type] !== "journal" && r[ix.type] !== "book series") continue; // sách theo tập chỉ để hiển thị hạng Q (k = "b"), không dùng để tính điểm
    const issn = (r[ix.issn] ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[0-9]{7}[0-9X]$/.test(s));
    if (!issn.length) continue;
    last.set(r[ix.id], { bs: r[ix.type] === "book series", t: r[ix.title], y, q: /^Q[1-4]$/.test(r[ix.best]) ? r[ix.best] : null, h: Number(r[ix.h]) || null, cov: r[ix.cov] ?? "", cats: r[ix.cats] ?? "", issn });
  }
}
const lastYear = files[files.length - 1].y, out = [];
for (const v of last.values()) {
  if (v.issn.some((i) => have.has(i))) continue; // đã có dòng theo ngành: không dùng dự phòng
  const multi = /Multidisciplinary|(^|; )General /.test(v.cats);
  out.push({ t: v.t.slice(0, 120), i: v.issn, q: v.q, h: v.h, y: v.y, c: v.cov.replace(/\s/g, ""), k: v.bs ? "b" : v.y < lastYear ? "e" : multi ? "m" : "g" }); // e: đã ngừng; m: đa ngành/General; g: còn hoạt động, thiếu dòng
}
writeFileSync("data/sjr-fallback.json", JSON.stringify({ meta: { source: "SCImago Journal & Country Rank (tất cả tạp chí theo năm)", years: [files[0].y, lastYear], built: new Date().toISOString().slice(0, 10), count: out.length }, journals: out }));
const n = (k) => out.filter((j) => j.k === k).length;
console.log(`sjr-fallback.json: ${out.length} tạp chí (đa ngành/General ${n("m")}, đã ngừng ${n("e")}, còn hoạt động thiếu dòng ${n("g")}), hạng Q ${out.filter((j) => j.q).length}`);
