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
  let score = null, jd = null;
  for (const j of js) { const s = tierScore(j.scoreTiers, w.year); if (s !== null && (score === null || s > score)) { score = s; jd = j.discipline; } }
  return { ...w, score, scoreDiscipline: jd, matched: js.length > 0 };
});
const stats = new Map();
for (const w of works) { const s = stats.get(w.authorId) ?? { n: 0, pts: 0, cit: 0, matched: 0, first: 9999, last: 0 }; s.n++; s.pts += w.score ?? 0; s.cit += w.citations ?? 0; s.matched += w.matched ? 1 : 0; s.first = Math.min(s.first, w.year); s.last = Math.max(s.last, w.year); stats.set(w.authorId, s); }
const authors = R.authors.map((a) => { const s = stats.get(a.id) ?? { n: 0, pts: 0, cit: 0, matched: 0, first: 0, last: 0 }; return { ...a, worksCount: s.n, totalScore: Math.round(s.pts * 100) / 100, citations: s.cit, matchedRate: s.n ? Math.round((s.matched / s.n) * 100) / 100 : 0, firstYear: s.first || null, lastYear: s.last || null }; });
const rank = (key) => { const o = [...authors].sort((a, b) => b[key] - a[key]); o.forEach((a, i, arr) => { a[key === "worksCount" ? "rankWorks" : "rankScore"] = i > 0 && arr[i - 1][key] === a[key] ? arr[i - 1][key === "worksCount" ? "rankWorks" : "rankScore"] : i + 1; }); };
rank("worksCount"); rank("totalScore");
const usedJ = new Set(works.filter((w) => w.matched).flatMap((w) => J.byIssn[w.issn]));
const disciplines = [...new Set(J.journals.map((j) => j.discipline))].sort();
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/profind.json", JSON.stringify({ meta: { demo: !!R.meta?.demo, built: new Date().toISOString().slice(0, 10), authors: authors.length, works: works.length, journalsMatched: usedJ.size }, institutions: I.institutions, types: I.types, disciplines, authors, works }));
console.log(`profind.json: ${authors.length} tác giả, ${works.length} công trình, ${works.filter((w) => w.matched).length} khớp tạp chí HĐGSNN`);
