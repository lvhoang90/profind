// data/raw-authors.json + data/journals.json + data/institutions.json -> public/data/profind.json
// Điểm công trình = mức điểm TỐI ĐA của tạp chí (theo năm đăng) trong danh mục HĐGSNN; chỉ để tham khảo.
// Khớp tạp chí theo ISSN chuẩn hóa. Công trình không khớp được: score = null (không tính, không đoán).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const J = JSON.parse(readFileSync("data/journals.json", "utf8"));
const I = JSON.parse(readFileSync("data/institutions.json", "utf8"));
const R = JSON.parse(readFileSync("data/raw-authors.json", "utf8"));
const byId = new Map(J.journals.map((j) => [j.id, j]));
const tierScore = (tiers, y) => {
  let best = null;
  for (const t of tiers) {
    if ((t.fromYear === null || t.fromYear <= y) && (t.toYear === undefined || y <= t.toYear) && (best === null || (t.fromYear ?? -1e9) > (best.fromYear ?? -1e9))) best = t;
  }
  return best ? best.maxScore : null;
};
const works = R.works.map((w) => {
  const ids = J.byIssn[w.issn] ?? [], js = ids.map((i) => byId.get(i));
  // Một ISSN có thể thuộc nhiều ngành: lấy mức cao nhất, ghi lại ngành để người dùng thấy nguồn.
  // Chỉ tính điểm khi là tác giả chính theo HĐGSNN (role = "lead", xem ingest-openalex.mjs); còn lại có "counted": false.
  let score = null, jd = null;
  for (const j of w.role === "lead" ? js : []) { const s = tierScore(j.scoreTiers, w.year); if (s !== null && (score === null || s > score)) { score = s; jd = j.discipline; } }
  const disc = [...new Set(js.map((j) => j.discipline))];
  return { ...w, score, scoreDiscipline: jd, matched: js.length > 0, counted: w.role === "lead" && js.length > 0, disc };
});
const stats = new Map();
for (const w of works) { const s = stats.get(w.authorId) ?? { n: 0, pts: 0, cit: 0, counted: 0, matched: 0, first: 9999, last: 0 }; s.n++; s.pts += w.score ?? 0; s.counted += w.counted ? 1 : 0; s.cit += w.citations ?? 0; s.matched += w.matched ? 1 : 0; s.first = Math.min(s.first, w.year); s.last = Math.max(s.last, w.year); stats.set(w.authorId, s); }
// Ngành của tác giả suy ra từ ngành của tạp chí họ đã đăng (mọi công trình khớp, không chỉ công trình tính điểm): giữ ngành chiếm ≥ 25% và tối đa 3 ngành.
const discOf = new Map();
for (const w of works) { if (!w.matched) continue; const m = discOf.get(w.authorId) ?? new Map(); for (const d of w.disc) m.set(d, (m.get(d) ?? 0) + 1); discOf.set(w.authorId, m); }
const inferDisc = (id) => { const m = discOf.get(id); if (!m) return []; const tot = Math.max(...m.values()), n = [...discOf.get(id)].length; void n; const all = [...m.entries()].sort((a, b) => b[1] - a[1]); const sum = [...m.values()].reduce((x, y) => x + y, 0); return all.filter(([, c]) => c / sum >= 0.25 || c === tot).slice(0, 3).map(([d]) => d); };
const authors = R.authors.map((a) => { const s = stats.get(a.id) ?? { n: 0, pts: 0, cit: 0, counted: 0, matched: 0, first: 0, last: 0 }; return { ...a, disciplines: inferDisc(a.id), worksCount: s.n, totalScore: Math.round(s.pts * 100) / 100, citations: s.cit, countedWorks: s.counted, matchedRate: s.n ? Math.round((s.matched / s.n) * 100) / 100 : 0, firstYear: s.first || null, lastYear: s.last || null }; });
const rank = (key) => { const o = [...authors].sort((a, b) => b[key] - a[key]); o.forEach((a, i, arr) => { a[key === "worksCount" ? "rankWorks" : "rankScore"] = i > 0 && arr[i - 1][key] === a[key] ? arr[i - 1][key === "worksCount" ? "rankWorks" : "rankScore"] : i + 1; }); };
rank("worksCount"); rank("totalScore");
const usedJ = new Set(works.filter((w) => w.matched).flatMap((w) => J.byIssn[w.issn]));
const disciplines = [...new Set(J.journals.map((j) => j.discipline))].sort();
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/profind.json", JSON.stringify({ meta: { demo: !!R.meta?.demo, built: new Date().toISOString().slice(0, 10), authors: authors.length, works: works.length, journalsMatched: usedJ.size }, institutions: I.institutions, types: I.types, disciplines, authors, works }));
console.log(`profind.json: ${authors.length} tác giả, ${works.length} công trình, ${works.filter((w) => w.matched).length} khớp tạp chí HĐGSNN`);
