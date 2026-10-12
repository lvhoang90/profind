// Gợi ý bài báo và tạp chí liên quan cho trang hồ sơ: theo từng ngành, lấy từ công trình đã có (public/data/works) của các hồ sơ ProFind.
//   node scripts/build-related.mjs   (chạy sau build-index; ghi public/data/related.json)
// - a: 40 bài nhiều trích dẫn mỗi năm nhất (từ 2021, có DOI, tạp chí có hạng), mỗi công trình tính một lần dù nhiều đồng tác giả.
// - j: 20 tạp chí hạng Q1/Q2 có nhiều bài của hồ sơ ProFind nhất trong 2022 đến nay (nơi tác giả Việt Nam đã công bố được).
import { readFileSync, writeFileSync } from "node:fs";
import { allWorks } from "./_works-io.mjs";
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), meta = P.meta;
const au = new Map(P.authors.map((a) => [a.id, a])), YEAR = new Date().getFullYear();
const seen = new Set(), arts = new Map(), jr = new Map();
for (const [id, ws] of allWorks()) {
  const a = au.get(id); if (!a || a.suspect) continue;
  for (const w of ws) {
    const wid = String(w.id).split("-").pop(); if (seen.has(wid)) continue; seen.add(wid);
    const ds = w.scoreDiscipline ? [w.scoreDiscipline] : a.disciplines ?? []; if (!ds.length) continue;
    for (const f of ds) {
      if (w.year >= 2021 && w.doi && w.quartile && w.title) { const o = arts.get(f) ?? arts.set(f, []).get(f); o.push({ t: w.title, y: w.year, j: w.journal, d: w.doi, c: w.citations ?? 0, q: w.quartile, s: (w.citations ?? 0) / (YEAR - w.year + 1) }); }
      if (w.year >= 2022 && w.issn && (w.quartile === "Q1" || w.quartile === "Q2")) { const m = jr.get(f) ?? jr.set(f, new Map()).get(f), k = w.issn, e = m.get(k) ?? m.set(k, { j: w.journal, i: w.issn, q: w.quartile, n: 0 }).get(k); e.n++; }
    }
  }
}
const out = { meta: { built: meta.built, from: 2021 }, f: {} };
for (const f of new Set([...arts.keys(), ...jr.keys()])) out.f[f] = {
  a: (arts.get(f) ?? []).sort((x, y) => y.s - x.s).slice(0, 40).map(({ s, ...r }) => r),
  j: [...(jr.get(f)?.values() ?? [])].sort((x, y) => y.n - x.n || x.j.localeCompare(y.j)).slice(0, 20),
};
writeFileSync("public/data/related.json", JSON.stringify(out));
console.log(`related.json: ${Object.keys(out.f).length} ngành, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
