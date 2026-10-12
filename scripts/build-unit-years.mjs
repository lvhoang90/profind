// Công bố theo năm của từng đơn vị -> public/data/unit-years.json. Chạy sau build-index: node scripts/build-unit-years.mjs
// Định nghĩa "đang công tác" như src/School.tsx: hồ sơ không suspect, đơn vị không thuộc instPast; đơn vị cha cộng dồn đơn vị con (tối đa 4 cấp).
// Mỗi công trình đếm một lần cho mỗi đơn vị (khử trùng theo phần mã sau "-" trong id "A…-W…"). Tính điểm = score != null hoặc quartile != null.
import { readFileSync, writeFileSync } from "node:fs";
import { readWorks } from "./_works-io.mjs";
const FROM = 2010, TO = new Date().getFullYear(), N = TO - FROM + 1, MIN = 20;
const t0 = Date.now(), d = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const parent = new Map((d.institutions ?? []).map((i) => [i.id, i.parent])), known = new Set(parent.keys());
const cnt = new Map(); // đơn vị -> Map(mã công trình -> [năm, tính điểm])
for (const a of d.authors) {
  if (a.suspect) continue;
  const units = new Set();
  for (const x of a.institutions ?? []) { if (a.instPast?.includes(x) || !known.has(x)) continue; for (let y = x, n = 0; y && n < 4; y = parent.get(y), n++) units.add(y); }
  if (!units.size) continue;
  for (const w of readWorks(a.id)) {
    const y = Number(w.year); if (!(y >= FROM && y <= TO)) continue;
    const wid = String(w.id).split("-").slice(1).join("-") || String(w.id), sc = w.score != null || w.quartile != null;
    for (const u of units) { let m = cnt.get(u); if (!m) cnt.set(u, (m = new Map())); const p = m.get(wid); if (!p) m.set(wid, [y, sc]); else if (sc) p[1] = true; }
  }
}
const out = {};
for (const [u, m] of [...cnt].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (m.size < MIN) continue;
  const t = Array(N).fill(0), s = Array(N).fill(0);
  for (const [y, sc] of m.values()) { t[y - FROM]++; if (sc) s[y - FROM]++; }
  out[u] = { t, s };
}
const json = JSON.stringify({ meta: { built: new Date().toISOString().slice(0, 10), from: FROM, to: TO }, units: out });
writeFileSync("public/data/unit-years.json", json);
console.log(`unit-years: ${Object.keys(out).length} đơn vị, ${(json.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
