// data/raw-authors.json + journals.json + sjr-rules.json + institutions.json + corrections.json
//   -> public/data/profind.json (tác giả, đơn vị, thống kê; nhẹ) + public/data/works/<id>.json (công trình của từng tác giả; tải khi mở hồ sơ)
// Điểm công trình = max(điểm tạp chí trong nước theo năm, điểm Scopus theo quy tắc ngành), chỉ khi là tác giả chính theo HĐGSNN (role = "lead").
// Web of Science (SCIE/SSCI) và kỷ yếu hội nghị không suy ra được từ dữ liệu công khai nên không tính (điểm là mức tham khảo thấp hơn thực tế).
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
const rd = (f) => JSON.parse(readFileSync(f, "utf8"));
const J = rd("data/journals.json"), S = rd("data/sjr-rules.json"), I = rd("data/institutions.json"), R = rd("data/raw-authors.json"), C = rd("data/corrections.json");
const META = existsSync("data/author-meta.json") ? rd("data/author-meta.json") : {};
// Nhãn Top 2% thế giới (Ioannidis et al., CC BY-NC 3.0; xem data/top2/LICENSE-NC.md): khớp bằng scripts/match-top2.mjs
const TOP2 = existsSync("data/top2/matches.json") ? rd("data/top2/matches.json") : {};
const byId = new Map(J.journals.map((j) => [j.id, j]));
const tierScore = (tiers, y) => {
  let best = null;
  for (const t of tiers) if ((t.fromYear === null || t.fromYear <= y) && (t.toYear === undefined || y <= t.toYear) && (best === null || (t.fromYear ?? -1e9) > (best.fromYear ?? -1e9))) best = t;
  return best ? best.maxScore : null;
};
// Cùng logic internationalScore của EduFind: hạng Q riêng nếu ngành có; Q1 có H-index > 50 dùng scopus_q1_hi; còn lại scopus_esci.
const intlScore = (d, q, h) => { const r = S.rules[d] ?? {}; if (r.quartile_if_listed !== undefined || r.listed !== undefined) return r.scopus_esci ?? 0; const hi = q === "Q1" && (h ?? 0) > 50 ? r.scopus_q1_hi : undefined; return hi ?? (q ? r["scopus_" + q.toLowerCase()] : undefined) ?? r.scopus_esci ?? 0; };

// ---- 1. Gộp hồ sơ trùng (cùng ORCID) và áp dụng đính chính ----
const log = [];
const removeIds = new Set(C.remove.map((x) => x.author).filter(Boolean)), removeOrcid = new Set(C.remove.map((x) => x.orcid).filter(Boolean));
// Cùng một tác giả có thể xuất hiện ở nhiều đơn vị (cùng mã OpenAlex): gộp, giữ đủ danh sách đơn vị.
const byAuthorId = new Map();
for (const a of R.authors) { const k = byAuthorId.get(a.id); if (!k) byAuthorId.set(a.id, { ...a, institutions: [...a.institutions] }); else k.institutions = [...new Set([...k.institutions, ...a.institutions])]; }
let authors = [...byAuthorId.values()].filter((a) => { const drop = removeIds.has(a.id) || (a.orcid && removeOrcid.has(a.orcid)); if (drop) log.push(`gỡ ${a.id}`); return !drop; });
const alias = new Map(); // id bị gộp -> id đích
for (const m of C.merge) for (const f of m.from) alias.set(f, m.into);
const byOrcid = new Map();
for (const a of authors) if (a.orcid) { const k = byOrcid.get(a.orcid); if (!k) byOrcid.set(a.orcid, a); else { alias.set(a.id, k.id); k.institutions = [...new Set([...k.institutions, ...a.institutions])]; log.push(`gộp ${a.id} -> ${k.id} (ORCID)`); } }
authors = authors.filter((a) => !alias.has(a.id));
const live = new Map(authors.map((a) => [a.id, a]));
for (const a of authors) { if (C.rename[a.id]) a.name = C.rename[a.id]; a.claimed = C.claimed[a.id]?.date ?? null; }
const excl = new Set(C.excludeWorks), seen = new Set();
const rawWorks = R.works.map((w) => ({ ...w, authorId: alias.get(w.authorId) ?? w.authorId })).filter((w) => {
  if (!live.has(w.authorId) || excl.has(w.id)) return false;
  const k = `${w.authorId}|${w.id.split("-").pop()}`; if (seen.has(k)) return false; seen.add(k); return true;
});

// ---- 2. Chấm điểm từng công trình ----
const works = rawWorks.map((w) => {
  const all = [...new Set([w.issn, ...(w.issns ?? [])].filter(Boolean))];
  const js = [...new Set(all.flatMap((i) => J.byIssn[i] ?? []))].map((i) => byId.get(i));
  const sj = all.flatMap((i) => S.sjrByIssn[i] ?? []);
  let score = null, jd = null, kind = null, q = null;
  if (w.role === "lead") {
    for (const j of js) { const s2 = tierScore(j.scoreTiers, w.year); if (s2 !== null && (score === null || s2 > score)) { score = s2; jd = j.discipline; kind = "domestic"; } }
    for (const [d, qq, h] of sj) { const s2 = intlScore(d, qq, h); if (score === null || s2 > score) { score = s2; jd = d; kind = "scopus"; q = qq; } }
  }
  const disc = [...new Set([...js.map((j) => j.discipline), ...sj.map((x) => x[0])])];
  const { issns: _i, ...rest } = w;
  return { ...rest, score, scoreDiscipline: jd, scoreKind: kind, quartile: q, matched: js.length > 0 || sj.length > 0, counted: w.role === "lead" && score !== null, disc };
});

// ---- 3. Thống kê tác giả, ngành suy từ tạp chí, thứ hạng ----
const per = new Map();
for (const w of works) { const l = per.get(w.authorId); if (l) l.push(w); else per.set(w.authorId, [w]); }
const outAuthors = authors.map((a) => {
  const ws = per.get(a.id) ?? [], dc = new Map(), jc = new Map();
  for (const w of ws) { if (w.matched) for (const d of w.disc) dc.set(d, (dc.get(d) ?? 0) + 1); jc.set(`${w.journal}|${w.issn}`, (jc.get(`${w.journal}|${w.issn}`) ?? 0) + 1); }
  // Ngành: giữ ngành chiếm ≥ 25% số công trình khớp (hoặc ngành đứng đầu), tối đa 3.
  const tot = [...dc.values()].reduce((x, y) => x + y, 0), top = Math.max(0, ...dc.values());
  const disciplines = [...dc.entries()].sort((x, y) => y[1] - x[1]).filter(([, c]) => c / tot >= 0.25 || c === top).slice(0, 3).map(([d]) => d);
  const years = ws.map((w) => w.year);
  const matched = ws.filter((w) => w.matched).length;
  const span = years.length ? Math.max(1, Math.max(...years) - Math.min(...years) + 1) : 1;
  return { id: a.id, name: a.name, orcid: a.orcid, institutions: a.institutions, disciplines, demo: !!a.demo, claimed: a.claimed, // foreign: true = có đơn vị ngoài VN; false = chỉ đơn vị VN; null = chưa biết (chưa chạy enrich-authors.mjs cho tác giả này).
    top2: TOP2[a.id] ? { rank: TOP2[a.id].rank, field: TOP2[a.id].field } : null,
    foreign: META[a.id] ? META[a.id].countries.some((c) => c !== "VN") : null,
    // suspect: hồ sơ OpenAlex nhiều khả năng gộp nhầm nhiều người (>= 500 công trình hoặc > 150 công trình/năm); ẩn khỏi bảng mặc định.
    suspect: ws.length >= 500 || ws.length / span > 150,
    worksCount: ws.length, countedWorks: ws.filter((w) => w.counted).length, totalScore: Math.round(ws.reduce((s, w) => s + (w.score ?? 0), 0) * 100) / 100,
    citations: ws.reduce((s, w) => s + (w.citations ?? 0), 0), matchedRate: ws.length ? Math.round((matched / ws.length) * 100) / 100 : 0,
    firstYear: years.length ? Math.min(...years) : null, lastYear: years.length ? Math.max(...years) : null,
    // Chuỗi tìm kiếm theo tên tạp chí/ISSN (15 tạp chí đăng nhiều nhất), để lọc ở trang danh sách mà không phải tải công trình.
    jn: [...jc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k]) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()).join(" ; ") };
});
const rank = (key, out) => { const o = [...outAuthors].sort((a, b) => b[key] - a[key]); o.forEach((a, i, arr) => { a[out] = i > 0 && arr[i - 1][key] === a[key] ? arr[i - 1][out] : i + 1; }); };
rank("worksCount", "rankWorks"); rank("totalScore", "rankScore");

// ---- 4. Ghi tệp ----
rmSync("public/data/works", { recursive: true, force: true }); mkdirSync("public/data/works", { recursive: true });
for (const [id, ws] of per) writeFileSync(`public/data/works/${id}.json`, JSON.stringify(ws.map(({ authorId, demo, disc, counted, matched, ...w }) => w)));
const usedInst = new Set(outAuthors.flatMap((a) => a.institutions));
const insts = I.institutions.filter((i) => usedInst.has(i.id)).map(({ id, name, en, abbr, type, city, official, moetCode }) => ({ id, name, en, abbr, type, city, ...(official ? { official, moetCode } : {}) }));
const disciplines = [...new Set(outAuthors.flatMap((a) => a.disciplines))].sort();
writeFileSync("public/data/profind.json", JSON.stringify({ meta: { demo: !!R.meta?.demo, built: new Date().toISOString().slice(0, 10), authors: outAuthors.length, works: works.length, source: R.meta?.source ?? null, fetched: R.meta?.fetched ?? null }, institutions: insts, types: I.types, disciplines, authors: outAuthors }));
console.log(`profind.json: ${outAuthors.length} tác giả (${log.length} thay đổi đính chính/gộp), ${works.length} công trình, ${works.filter((w) => w.counted).length} có điểm, ${works.filter((w) => w.matched).length} khớp tạp chí`);
