// data/raw-authors.json + journals.json + sjr-rules.json + institutions.json + corrections.json
//   -> public/data/profind.json (tác giả, đơn vị, thống kê; nhẹ) + public/data/works/<id>.json (công trình của từng tác giả; tải khi mở hồ sơ)
// Điểm công trình = max(điểm tạp chí trong nước theo năm, điểm Scopus theo quy tắc ngành), chỉ khi là tác giả chính theo HĐGSNN (role = "lead").
// Web of Science (SCIE/SSCI) và kỷ yếu hội nghị không suy ra được từ dữ liệu công khai nên không tính (điểm là mức tham khảo thấp hơn thực tế).
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { computePro } from "./pro-score.mjs";
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
// Hồ sơ bị gộp vào hồ sơ khác: cộng số trích dẫn toàn thời gian của hồ sơ gốc vào hồ sơ đích.
const SCH = existsSync("data/scholar.json") ? rd("data/scholar.json") : {};
const S2 = existsSync("data/raw/_s2.json") ? rd("data/raw/_s2.json") : {};
const NA = existsSync("data/raw/_nauth.json") ? rd("data/raw/_nauth.json") : {}; // số tác giả mỗi công trình (101 = hơn 100); dùng gắn cờ nhóm nghiên cứu lớn
const CR = existsSync("data/raw/_crossref.json") ? rd("data/raw/_crossref.json") : {}; // Crossref (đối chiếu), -1 = không có DOI
const OC = existsSync("data/raw/_opencitations.json") ? rd("data/raw/_opencitations.json") : {}; // OpenCitations: chỉ một mẫu DOI, dùng kiểm toán, không vào điểm
const xs = { n: 0, crHigher: 0, s2Higher: 0, oaHighest: 0 }, oc = { n: 0, oa: 0, cr: 0, s2: 0, oc: 0, ocLeOA: 0 };
const metaAll = existsSync("data/author-meta.json") ? rd("data/author-meta.json") : {}, extraCited = new Map();
for (const [f, into] of alias) extraCited.set(into, (extraCited.get(into) ?? 0) + (metaAll[f]?.cited ?? 0));
const live = new Map(authors.map((a) => [a.id, a]));
for (const a of authors) { if (C.rename[a.id]) a.name = C.rename[a.id]; a.claimed = C.claimed[a.id]?.date ?? null; }
const excl = new Set(C.excludeWorks), seen = new Set();
const rawWorks = R.works.map((w) => ({ ...w, authorId: alias.get(w.authorId) ?? w.authorId })).filter((w) => {
  if (!live.has(w.authorId) || excl.has(w.id)) return false;
  const k = `${w.authorId}|${w.id.split("-").pop()}`; if (seen.has(k)) return false; seen.add(k); return true;
});

// ---- 2. Ngành của từng tạp chí (để suy ngành tác giả và chọn quy tắc chấm) ----
const foldS = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, " ").trim();
// Trọng số ngành kiểu idf: ngành xuất hiện ở quá nhiều tạp chí (ví dụ Luyện kim: 61% ISSN) bị giảm phiếu, tránh "phình" ngành.
const df = new Map(), allIssn = new Set();
for (const [i, v] of Object.entries(S.sjrByIssn)) { allIssn.add(i); for (const d of new Set(v.map((x) => x[0]))) df.set(d, (df.get(d) ?? 0) + 1); }
for (const j of J.journals) for (const i of j.issn) { allIssn.add(i); }
const idf = (d) => Math.log(1 + allIssn.size / (df.get(d) ?? 1));

const prep = rawWorks.map((w) => {
  const all = [...new Set([w.issn, ...(w.issns ?? [])].filter(Boolean))];
  const js = [...new Set(all.flatMap((i) => J.byIssn[i] ?? []))].map((i) => byId.get(i));
  const sj = all.flatMap((i) => S.sjrByIssn[i] ?? []);
  return { w, js, sj, disc: [...new Set([...js.map((j) => j.discipline), ...sj.map((x) => x[0])])] };
});
// Bỏ công trình trùng (cùng tác giả, cùng tiêu đề đã chuẩn hóa, cùng năm): giữ bản khớp tạp chí / có điểm cao hơn.
const dedup = new Map();
for (const p of prep) { const k = `${p.w.authorId}|${p.w.year}|${foldS(p.w.title)}`; if (!foldS(p.w.title)) { dedup.set(`${k}|${p.w.id}`, p); continue; } const o = dedup.get(k); if (!o || (p.disc.length > o.disc.length)) dedup.set(k, p); }
const prepared = [...dedup.values()];
const nDupWorks = prep.length - prepared.length;

// Ngành chính của tác giả = phiếu có trọng số idf từ MỌI công trình khớp tạp chí.
// Tạp chí đa ngành (ví dụ "Khoa học Đại học Đồng Tháp" nằm ở cả Giáo dục, Chăn nuôi, Hóa...) KHÔNG được chia phiếu đều cho mọi ngành: ngành hiếm có idf cao sẽ thắng sai.
// Với công trình thuộc tạp chí nhiều ngành, chọn ngành trong số ngành của tạp chí bằng (a) độ giống tiêu đề với các công trình ở tạp chí đơn ngành, (b) ngành mà tác giả đã có ở các công trình đơn ngành.
const dTok = (t) => { const w = foldS(t).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((x) => x.length > 2); return [...w, ...w.slice(1).map((x, i) => `${w[i]}_${x}`)]; };
const dTf = new Map(), dDf = new Map(); // ngành -> (từ -> số công trình)
const MULTI = 4, multi = (p) => p.js.length >= MULTI; // tạp chí trong nước nằm ở >= 4 ngành HĐGSNN = tạp chí đa ngành
for (const p of prepared) if (p.disc.length === 1) { const m = dTf.get(p.disc[0]) ?? new Map(); for (const t of new Set(dTok(p.w.title))) { m.set(t, (m.get(t) ?? 0) + 1); dDf.set(t, (dDf.get(t) ?? 0) + 1); } dTf.set(p.disc[0], m); }
const nD = dTf.size || 1, dNorm = new Map(), tIdf = (t) => Math.log(1 + nD / (dDf.get(t) ?? 1));
for (const [d, m] of dTf) { let n = 0; for (const [t, c] of m) n += (c * tIdf(t)) ** 2; dNorm.set(d, Math.sqrt(n) || 1); }
const titleSim = (toks, d) => { const m = dTf.get(d); if (!m || !toks.length) return 0; let dot = 0, qn = 0; for (const t of new Set(toks)) { const q = tIdf(t); qn += q * q; dot += q * (m.get(t) ?? 0) * tIdf(t); } return dot / ((Math.sqrt(qn) || 1) * dNorm.get(d)); };
const votes = new Map(), prior = new Map();
for (const p of prepared) { if (!p.disc.length || multi(p)) continue; const m = votes.get(p.w.authorId) ?? new Map(); for (const d of p.disc) m.set(d, (m.get(d) ?? 0) + idf(d) / p.disc.length); votes.set(p.w.authorId, m); }
for (const [id, m] of votes) { const tot = [...m.values()].reduce((x, y) => x + y, 0); prior.set(id, new Map([...m].map(([d, c]) => [d, c / tot]))); }
let nAmb = 0, nAmbSkipped = 0;
for (const p of prepared) {
  if (!multi(p)) continue; nAmb++;
  const m = votes.get(p.w.authorId) ?? new Map(), pr = prior.get(p.w.authorId), toks = dTok(p.w.title);
  const sc = p.disc.map((d) => [d, titleSim(toks, d) + (pr?.get(d) ?? 0)]), top = Math.max(...sc.map((x) => x[1]));
  if (top <= 0) { if (p.disc.length > 3) { nAmbSkipped++; continue; } for (const d of p.disc) m.set(d, (m.get(d) ?? 0) + idf(d) / p.disc.length); }
  else { const win = sc.filter((x) => x[1] >= top * 0.8).map((x) => x[0]); for (const d of win) m.set(d, (m.get(d) ?? 0) + idf(d) / win.length); }
  votes.set(p.w.authorId, m);
}
console.log(`Ngành: ${nAmb} công trình thuộc tạp chí nhiều ngành đã phân ngành theo tiêu đề/tiền đề tác giả (${nAmbSkipped} không đủ căn cứ nên không tính phiếu).`);
const authorDisc = new Map();
for (const [id, m] of votes) { const tot = [...m.values()].reduce((x, y) => x + y, 0), top = Math.max(...m.values()); authorDisc.set(id, [...m.entries()].sort((x, y) => y[1] - x[1]).filter(([, c]) => c / tot >= 0.25 || c === top).slice(0, 3).map(([d]) => d)); }

// ---- 3. Chấm điểm từng công trình ----
// Điểm phụ thuộc ngành của người được xét. Một tạp chí thuộc nhiều ngành: chỉ lấy các ngành thuộc ngành của tác giả (lấy cao nhất trong đó);
// nếu không trùng ngành nào thì lấy mức THẤP nhất (thận trọng), không lấy max mọi ngành (làm điểm phồng ~18%).
const works = prepared.map(({ w, js, sj, disc }) => {
  const cands = [];
  if (w.role === "lead") {
    for (const j of js) { const s2 = tierScore(j.scoreTiers, w.year); if (s2 !== null) cands.push({ s: s2, d: j.discipline, k: "domestic", q: null }); }
    for (const [d, qq, h] of sj) cands.push({ s: intlScore(d, qq, h), d, k: "scopus", q: qq });
  }
  let pick = null;
  if (cands.length) {
    const mine = authorDisc.get(w.authorId) ?? [], inMine = cands.filter((c) => mine.includes(c.d));
    pick = inMine.length ? inMine.reduce((x, y) => (y.s > x.s ? y : x)) : cands.reduce((x, y) => (y.s < x.s ? y : x));
  }
  const { issns: _i, corr, ...rest } = w;
  // Trích dẫn công trình = max(OpenAlex, Semantic Scholar) theo DOI; cOA giữ số OpenAlex để tính phần bổ sung ở cấp tác giả.
  const cOA = w.citations ?? 0, cS2 = w.doi ? (S2[w.doi] ?? 0) : 0, cCR = w.doi ? Math.max(0, CR[w.doi] ?? 0) : 0; rest.citations = Math.max(cOA, cS2, cCR);
  { const nA = NA[String(w.id).split("-").pop()] ?? 0; if (nA >= 25) rest.na = nA; }
  if (w.doi && OC[w.doi] !== undefined && OC[w.doi] >= 0) { oc.n++; oc.oa += cOA; oc.cr += cCR; oc.s2 += cS2; oc.oc += OC[w.doi]; if (OC[w.doi] <= cOA) oc.ocLeOA++; }
  if (w.doi && CR[w.doi] !== undefined) { xs.n++; if (cCR > cOA) xs.crHigher++; if (cS2 > cOA) xs.s2Higher++; if (cOA >= cS2 && cOA >= cCR) xs.oaHighest++; }
  const score = pick ? pick.s : null;
  return { ...rest, cOA, title: w.title && w.title.trim() ? w.title : "(không có tiêu đề)", score, scoreDiscipline: pick?.d ?? null, scoreKind: pick?.k ?? null, quartile: pick?.q ?? null, matched: js.length > 0 || sj.length > 0, counted: w.role === "lead" && score !== null && score > 0,
    // ru: tác giả không phải đứng đầu và OpenAlex không ghi tác giả liên hệ nào (corr = 0) => vai trò chưa xác định, không phải "chắc chắn không phải tác giả chính".
    ...(w.role === "co" && (corr ?? 0) === 0 ? { ru: 1 } : {}), disc };
});

// ---- 4. Thống kê tác giả, thứ hạng ----
const per = new Map();
for (const w of works) { const l = per.get(w.authorId); if (l) l.push(w); else per.set(w.authorId, [w]); }
const cleanName = (n) => { let x = String(n ?? "").normalize("NFC").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u00a0\u2000-\u200b\u202f]/g, " ").replace(/\s+/g, " ").trim(); if (x === x.toUpperCase() && /[A-ZÀ-Ỹ]{3}/.test(x)) x = x.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()); return x; };
// Nhóm nghiên cứu lớn: công trình có từ 50 tác giả trở lên (consortium). Cờ khi có >= 3 công trình như vậy và chúng chiếm >= 30% trích dẫn của các công trình đã nạp.
const bigStats = (ws) => { const big = ws.filter((w) => (w.na ?? 0) >= 50), all = ws.reduce((t, w) => t + (w.citations ?? 0), 0), bc = big.reduce((t, w) => t + (w.citations ?? 0), 0); const share = all ? Math.round((100 * bc) / all) : 0; return { bigWorks: big.length, bigShare: big.length ? share : 0, bigFlag: big.length >= 3 && share >= 30 }; };
const outAuthors = authors.map((a) => {
  const ws = per.get(a.id) ?? [], jc = new Map();
  for (const w of ws) jc.set(`${w.journal}|${w.issn}`, (jc.get(`${w.journal}|${w.issn}`) ?? 0) + 1);
  const disciplines = authorDisc.get(a.id) ?? [];
  const years = ws.map((w) => w.year);
  const matched = ws.filter((w) => w.matched).length;
  const span = years.length ? Math.max(1, Math.max(...years) - Math.min(...years) + 1) : 1;
  const meta = META[a.id];
  return { id: a.id, name: cleanName(a.name), orcid: a.orcid, institutions: a.institutions, disciplines, demo: !!a.demo, claimed: a.claimed,
    scholar: SCH[a.id]?.id ?? null, scholarCit: SCH[a.id]?.citations ?? null,
    top2: TOP2[a.id] ? { rank: TOP2[a.id].rank, field: TOP2[a.id].field } : null,
    // foreign: true = có đơn vị ngoài VN; false = chỉ đơn vị VN; null = chưa biết (chưa chạy enrich-authors.mjs, hoặc OpenAlex không ghi quốc gia nào).
    // Người có tên trong danh sách Top 2% mục "Việt Nam" (đơn vị công tác tại VN theo Elsevier) luôn được coi là đơn vị trong nước.
    foreign: TOP2[a.id] ? false : meta && meta.countries.length ? !meta.countries.includes("VN") : null,
    // dual: có đơn vị tại VN và đơn vị ở nước khác (nhà khoa học đa liên kết); nhiều quốc gia (>= 3) có thể là liên kết đa quốc gia, chưa xếp hạng trừ khi được xác nhận trong data/vn-confirmed.json.
    dual: !TOP2[a.id] && !!meta && meta.countries.includes("VN") && meta.countries.some((c) => c !== "VN"), nCountries: meta?.countries?.length ?? null,
    // suspect: hồ sơ OpenAlex nhiều khả năng gộp nhầm nhiều người (>= 500 công trình, > 150 công trình/năm, hoặc >= 5 đơn vị); ẩn khỏi bảng mặc định và không tính thứ hạng.
    suspect: ws.length >= 500 || ws.length / span > 150 || a.institutions.length >= 5,
    oaWorks: meta?.worksTotal ?? null, ...bigStats(ws), worksCount: ws.length, countedWorks: ws.filter((w) => w.counted).length, totalScore: Math.round(ws.reduce((s, w) => s + (w.score ?? 0), 0) * 100) / 100,
    // citations: số trích dẫn TOÀN THỜI GIAN của hồ sơ OpenAlex (khớp với cách các hệ thống khác tính); citations2016: riêng các công trình trong ProFind (từ 2016).
    citations: (meta?.cited ?? ws.reduce((s, w) => s + (w.cOA ?? 0), 0)) + (extraCited.get(a.id) ?? 0) + ws.reduce((s, w) => s + Math.max(0, (w.citations ?? 0) - (w.cOA ?? 0)), 0), citations2016: ws.reduce((s, w) => s + (w.citations ?? 0), 0), hIndex: meta?.h ?? null, matchedRate: ws.length ? Math.round((matched / ws.length) * 100) / 100 : 0,
    firstYear: years.length ? Math.min(...years) : null, lastYear: years.length ? Math.max(...years) : null };
});
// Thứ hạng chỉ tính trong tập đủ điều kiện (đơn vị tại Việt Nam, không nghi gộp nhầm) = đúng tập danh sách mặc định; đồng hạng cùng số (hạng thi đấu: 1,2,2,4).
// Người ngoài tập (nước ngoài, nghi gộp nhầm, chưa biết) có hạng null, giao diện hiện "-".
const CONFIRMED = new Set(existsSync("data/vn-confirmed.json") ? rd("data/vn-confirmed.json").ids ?? [] : []), EXCLUDED = new Set(existsSync("data/vn-excluded.json") ? rd("data/vn-excluded.json").ids ?? [] : []);
// Quy ước hiện hành: mọi hồ sơ gắn với ít nhất một trường/viện trong danh sách đơn vị của Việt Nam đều được hiển thị và xếp hạng, không phân biệt quốc tịch; chỉ loại hồ sơ nghi gộp nhầm (suspect) và hồ sơ trong data/vn-excluded.json.
for (const a of outAuthors) a.rankable = !a.suspect && !EXCLUDED.has(a.id);
const pool = outAuthors.filter((a) => a.rankable && a.worksCount > 0);
const rank = (key, out) => { const o = [...pool].sort((a, b) => b[key] - a[key]); o.forEach((a, i, arr) => { a[out] = i > 0 && arr[i - 1][key] === a[key] ? arr[i - 1][out] : i + 1; }); };
for (const a of outAuthors) { a.rankScore = a.rankWorks = a.rankCit = null; }
rank("totalScore", "rankScore"); rank("worksCount", "rankWorks"); rank("citations", "rankCit");
const PRO = computePro(outAuthors, per, new Date().getFullYear());
for (const a of outAuthors) { if (a.pro === undefined) { a.pro = a.proLo = a.proHi = null; a.proParts = null; a.proConf = null; a.proRank = a.proR10 = a.proR90 = a.proStab = null; a.proTier = null; } }
writeFileSync("public/data/pro-panel.json", JSON.stringify(PRO.panel));

// ---- 5. Ghi tệp ----
rmSync("public/data/works", { recursive: true, force: true }); mkdirSync("public/data/works", { recursive: true });
for (const [id, ws] of per) writeFileSync(`public/data/works/${id}.json`, JSON.stringify(ws.map(({ authorId, demo, disc, counted, matched, cOA, ...w }) => w)));
// Chuỗi tìm theo tên tạp chí/ISSN tách riêng (tải khi người dùng bắt đầu gõ), để tệp danh sách nhẹ hơn ~45%.
const jn = {};
for (const a of outAuthors) { const ws = per.get(a.id) ?? [], jc = new Map(); for (const w of ws) { if (!w.issn) continue; jc.set(`${w.journal}|${w.issn}`, (jc.get(`${w.journal}|${w.issn}`) ?? 0) + 1); } jn[a.id] = [...jc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k]) => foldS(k)).join(" ; "); }
writeFileSync("public/data/jn.json", JSON.stringify(jn));
const usedInst = new Set(outAuthors.flatMap((a) => a.institutions));
const insts = I.institutions.filter((i) => usedInst.has(i.id)).map(({ id, name, en, abbr, type, city, official, moetCode }) => ({ id, name, en, abbr, type, city, ...(official ? { official, moetCode } : {}) }));
const disciplines = [...new Set(outAuthors.flatMap((a) => a.disciplines))].sort();
writeFileSync("public/data/profind.json", JSON.stringify({ meta: { demo: !!R.meta?.demo, built: new Date().toISOString().slice(0, 10), authors: outAuthors.length, works: works.length, rankPool: PRO.eligible, source: R.meta?.source ?? null, fetched: R.meta?.fetched ?? null }, institutions: insts, types: I.types, disciplines, authors: outAuthors }));
if (xs.n) console.log(`Đối chiếu trích dẫn trên ${xs.n} công trình có DOI trong Crossref: Crossref cao hơn OpenAlex ở ${xs.crHigher}, Semantic Scholar cao hơn OpenAlex ở ${xs.s2Higher}, OpenAlex cao nhất hoặc bằng ở ${xs.oaHighest}.`);
if (oc.n) console.log(`Kiểm toán OpenCitations trên mẫu ${oc.n} DOI: tổng trích dẫn OpenAlex ${oc.oa}, Crossref ${oc.cr}, Semantic Scholar ${oc.s2}, OpenCitations ${oc.oc}; OpenCitations <= OpenAlex ở ${Math.round(100 * oc.ocLeOA / oc.n)}% công trình.`);
console.log(`profind.json: ${outAuthors.length} tác giả (${log.length} thay đổi đính chính/gộp), ${works.length} công trình (bỏ ${nDupWorks} trùng), ${works.filter((w) => w.counted).length} có điểm, ${works.filter((w) => w.matched).length} khớp tạp chí, nhóm xếp hạng ${pool.length}`);
