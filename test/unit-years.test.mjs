// public/data/unit-years.json (scripts/build-unit-years.mjs): độ dài mảng, không âm, s <= t, và đếm độc lập một đơn vị nhỏ.
import { readFileSync, existsSync } from "node:fs";
import { readWorks } from "../scripts/_works-io.mjs";
const F = "public/data/unit-years.json";
if (!existsSync(F)) { console.log("bỏ qua: chưa có unit-years.json"); process.exit(0); }
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
const y = JSON.parse(readFileSync(F, "utf8")), { from, to } = y.meta, N = to - from + 1;
eq(from, 2010, "from"); eq(to >= 2025, true, "to"); eq(Object.keys(y.units).length > 50, true, "số đơn vị");
for (const [u, v] of Object.entries(y.units)) {
  eq(v.t.length, N, "độ dài t " + u); eq(v.s.length, N, "độ dài s " + u);
  v.t.forEach((x, i) => { eq(Number.isInteger(x) && x >= 0, true, "t >= 0 " + u); eq(Number.isInteger(v.s[i]) && v.s[i] >= 0 && v.s[i] <= x, true, "0 <= s <= t " + u); });
  eq(v.t.reduce((a, b) => a + b, 0) >= 20, true, "ngưỡng 20 " + u);
}
// Đếm độc lập cho đơn vị nhỏ nhất (đơn vị con thì cộng cả con cháu)
const d = JSON.parse(readFileSync("public/data/profind.json", "utf8")), par = new Map(d.institutions.map((i) => [i.id, i.parent]));
const small = Object.entries(y.units).sort((a, b) => a[1].t.reduce((p, q) => p + q, 0) - b[1].t.reduce((p, q) => p + q, 0))[0][0];
const inU = (x) => { for (let c = x, n = 0; c && n < 4; c = par.get(c), n++) if (c === small) return true; return false; };
const seen = new Map();
for (const a of d.authors) if (!a.suspect && a.institutions.some((x) => !a.instPast?.includes(x) && inU(x)))
  for (const w of readWorks(a.id)) if (w.year >= from && w.year <= to) { const k = w.id.slice(w.id.indexOf("-") + 1), sc = w.score != null || w.quartile != null, p = seen.get(k); seen.set(k, [w.year, sc || (p?.[1] ?? false)]); }
const t = Array(N).fill(0), s = Array(N).fill(0); for (const [yr, sc] of seen.values()) { t[yr - from]++; if (sc) s[yr - from]++; }
eq(t.join(), y.units[small].t.join(), "t độc lập " + small); eq(s.join(), y.units[small].s.join(), "s độc lập " + small);
console.log(`ok ${ok} kiểm tra, đơn vị nhỏ nhất ${small}`);
