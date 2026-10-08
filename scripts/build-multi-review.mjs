// Danh sách hồ sơ nhiều đơn vị cần quản trị viên duyệt (tab "Đơn vị tác giả" trong trang quản trị) -> public/data/_multi-review.json
//   node scripts/build-multi-review.mjs [--cache /duong/dan/orcid-works.json]
// Nguồn: data/multi-affiliation-review.json (bước quét ORCID), public/data/profind.json + works, data/raw/_authorship.json (cơ quan và ORCID gắn với tác giả trên TỪNG công trình), data/scholar.json.
// Bằng chứng "cùng một người hay người khác" cho mỗi hồ sơ và mỗi đơn vị:
//   - mã định danh: ORCID, OpenAlex, Scopus Author ID (OpenAlex ids.scopus), Google Scholar (do tác giả/quản lý cung cấp), các ORCID khác mà OpenAlex từng thấy trên hồ sơ (observed_orcids: nhiều hơn một = dấu hiệu gộp nhiều người);
//   - theo từng công trình: ORCID gắn với tác giả trên công trình đó trùng / khác ORCID hồ sơ (khác = người khác), công trình có DOI nằm trong danh sách công trình do chủ ORCID tự quản lý.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const CACHE = arg("cache", "/tmp/multi-orcid-works.json"), MAIL = "luongviethoang.safi@gmail.com";
const R = JSON.parse(readFileSync("data/multi-affiliation-review.json", "utf8")), P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const CUR = existsSync("data/current-inst.json") ? JSON.parse(readFileSync("data/current-inst.json", "utf8")) : {}, SCH = existsSync("data/scholar.json") ? JSON.parse(readFileSync("data/scholar.json", "utf8")) : {};
const by = new Map(P.authors.map((a) => [a.id, a])), AU = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8")), IM = JSON.parse(readFileSync("data/raw/_instmap.json", "utf8"));
const byRor = new Map(JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror).map((i) => [i.ror.replace(/^https?:\/\/ror.org\//, ""), i.id]));
const unitsOf = (k) => { const m = IM[k]; if (!m) return []; const o = new Set(); for (const x of [k, ...m.lineage]) { const u = byRor.get(IM[x]?.ror ?? ""); if (u) o.add(u); } return [...o]; };
const STOP = new Set("with from that this have been were their which using study analysis between among based effect effects results case review during under after about within through into than also more most other some such these those both each however while where when what approach method methods model models novel high low new nghien cuu cua cac mot nhung trong cho voi duoc nguoi tren phan tich danh gia thuc trang giai phap xay dung phat trien nang cao ung dung hieu qua".split(" "));
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
const toks = (t) => fold(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), norm = (d) => String(d ?? "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();
const getJson = async (u, h = {}) => { for (let t = 0; t < 4; t++) { try { const r = await fetch(u, { headers: h }); if (r.ok) return r.json(); if (r.status === 404) return null; await sleep(1500 * (t + 1)); } catch { await sleep(1500 * (t + 1)); } } return null; };
const ids = R.profiles.map((r) => r.id).filter((i) => by.has(i));
// 1. OpenAlex: ids (Scopus, ORCID quan sát được)
const OA = new Map();
for (let i = 0; i < ids.length; i += 50) { const j = await getJson(`https://api.openalex.org/authors?filter=openalex:${ids.slice(i, i + 50).join("|")}&per-page=50&select=id,ids&mailto=${MAIL}`); for (const r of j?.results ?? []) OA.set(r.id.replace("https://openalex.org/", ""), r.ids ?? {}); }
// 2. ORCID: DOI trong danh sách công trình do chủ ORCID tự quản lý
const OW = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const need = [...new Set(ids.map((i) => by.get(i).orcid).filter((o) => o && !(o in OW)))]; let q = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (q < need.length) { const o = need[q++]; const j = await getJson(`https://pub.orcid.org/v3.0/${o}/works`, { Accept: "application/json" }); OW[o] = j ? (j.group ?? []).flatMap((g) => (g["external-ids"]?.["external-id"] ?? []).filter((e) => e["external-id-type"] === "doi").map((e) => norm(e["external-id-value"]))) : null; } }));
writeFileSync(CACHE, JSON.stringify(OW));
// 3. Bằng chứng theo công trình
const out = [];
for (const r of R.profiles) {
  const a = by.get(r.id); if (!a) continue;
  let ws = []; try { const w = JSON.parse(readFileSync(`public/data/works/${a.id}.json`, "utf8")); ws = w.works ?? w; } catch { /* không có */ }
  const my = a.orcid, ordois = my && OW[my] ? new Set(OW[my]) : null, past = new Set(a.instPast ?? []), sc = CUR[a.id] ?? {}, ids0 = OA.get(a.id) ?? {};
  const titlesBy = new Map(a.institutions.map((u) => [u, []])), T = { works: ws.length, authOrcidSame: 0, authOrcidOther: 0, authOrcidNone: 0, inOrcidRecord: 0, withDoi: 0 }, other = new Map(), per = new Map(a.institutions.map((u) => [u, { n: 0, y0: 9999, y1: 0, same: 0, other: 0, none: 0, inRec: 0, s: [] }]));
  for (const w of ws) {
    const e = AU[w.id], os = e?.[2] ?? [], d = norm(w.doi), inRec = !!(ordois && d && ordois.has(d));
    const st = !os.length ? "none" : my && os.includes(my) ? "same" : "other";
    T[st === "same" ? "authOrcidSame" : st === "other" ? "authOrcidOther" : "authOrcidNone"]++; if (st === "other") for (const o of os) other.set(o, (other.get(o) ?? 0) + 1);
    if (d) T.withDoi++; if (inRec) T.inOrcidRecord++;
    for (const u of new Set((e?.[0] ?? []).flatMap(unitsOf))) { const p = per.get(u); if (!p) continue; titlesBy.get(u).push(toks(w.title)); p.n++; p.y0 = Math.min(p.y0, w.year); p.y1 = Math.max(p.y1, w.year); p[st]++; if (inRec) p.inRec++; if (p.s.length < 3 || (st === "same" && p.s.every((x) => x.st !== "same") && p.s.length < 4)) p.s.push({ t: String(w.title ?? "").slice(0, 140), y: w.year, j: w.journal ? String(w.journal).slice(0, 60) : null, d: w.doi || null, st }); }
  }
  // Độ giống chủ đề (cosine TF-IDF trên từ trong nhan đề) giữa công trình của từng đơn vị và đơn vị có nhiều công trình nhất của hồ sơ; thấp = có thể là người khác cùng tên.
  const df = new Map(), allT = [...titlesBy.values()].flat(); for (const t of allT) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const vec = (ts) => { const v = new Map(); for (const t of ts) for (const w of t) v.set(w, (v.get(w) ?? 0) + Math.log(1 + allT.length / (df.get(w) ?? 1))); return v; };
  const cos = (x, y) => { let d = 0, nx = 0, ny = 0; for (const [w, f] of x) { nx += f * f; const g = y.get(w); if (g) d += f * g; } for (const f of y.values()) ny += f * f; return nx && ny ? d / Math.sqrt(nx * ny) : null; };
  const main = [...per].sort((x, y) => y[1].n - x[1].n)[0]?.[0], mv = main ? vec(titlesBy.get(main)) : null;
  out.push({ id: a.id, name: a.name, mainUnit: main ?? null, orcid: my, works: a.worksCount, cat: r.cat, orcidCurrent: r.orcidCurrent ?? [], rankable: !!a.rankable,
    ids: { scopus: ids0.scopus ? String(ids0.scopus).replace(/^.*authorId=/, "") : null, scholar: SCH[a.id]?.id ?? null, observed: (ids0.observed_orcids ?? []).map((o) => String(o).replace("https://orcid.org/", "")), orcidWorks: my && OW[my] ? OW[my].length : null },
    ev: { ...T, otherOrcids: [...other].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([o, n]) => ({ o, n })) },
    units: a.institutions.map((u) => { const p = per.get(u), sim = u === main || !mv ? null : cos(mv, vec(titlesBy.get(u))); return { id: u, now: !past.has(u), w: sc[u] ?? null, sim: sim == null ? null : Math.round(sim * 100), n: p.n, y: p.n ? [p.y0, p.y1] : null, same: p.same, other: p.other, none: p.none, inRec: p.inRec, s: p.s }; }) });
}
writeFileSync("public/data/_multi-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), profiles: out }));
console.log(`Hồ sơ cần duyệt: ${out.length}; có Scopus ${out.filter((o) => o.ids.scopus).length}; có danh sách công trình ORCID ${out.filter((o) => o.ids.orcidWorks != null).length}; nhiều ORCID quan sát ${out.filter((o) => o.ids.observed.length > 1).length}`);
