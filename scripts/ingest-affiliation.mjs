// Nạp tác giả cho các đơn vị đã được duyệt từ data/affiliation-candidates.json (tìm theo chuỗi cơ quan), ghi cache data/raw/<id>.json như ingest-openalex.mjs.
//   node scripts/ingest-affiliation.mjs --mailto <email> --ids id1,id2 [--min-works 2] [--from 2016]
// Chỉ lấy tác giả có CHÍNH chuỗi cơ quan chứa tên đơn vị trong ≥ --min-works bài (hoặc có ORCID). Sau đó chạy lại build-index như thường lệ.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, FROM = arg("from", "2016"), MINW = +arg("min-works", 2), ids = (arg("ids", "") || "").split(",").filter(Boolean);
if (!mailto || !KEY || !ids.length) throw new Error("Cần --mailto, --ids và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const C = JSON.parse(readFileSync("data/affiliation-candidates.json", "utf8"));
// Tên khoa/trường ngắn ("Trường Sư phạm", "Trường Kinh tế"...) trùng với nhiều đại học: chuỗi cơ quan phải có thêm tên đại học chủ quản.
const REQ = [[/^can-tho-university-/, /can tho/], [/^hue-university-/, /\bhue\b/], [/^danang-university-/, /da nang|danang/]];
const reqFor = (id) => REQ.find(([r]) => r.test(id))?.[1] ?? null;
for (const id of ids) {
  const c = C.find((x) => x.id === id); if (!c) { console.warn(`${id}: không có trong danh sách ứng viên`); continue; }
  const cache = `data/raw/${id}.json`; if (existsSync(cache)) { console.log(`${id}: đã có cache, bỏ qua`); continue; }
  const pick = []; // tác giả đạt ngưỡng: quét lại bài theo chuỗi cơ quan để đếm
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), np = norm(c.phrase), cnt = new Map();
  let cur = "*", scanned = 0;
  while (cur && scanned < 2000) {
    const j = await get(`https://api.openalex.org/works?filter=raw_affiliation_strings.search:${encodeURIComponent('"' + c.phrase + '"')},from_publication_date:${FROM}-01-01&per-page=200&cursor=${cur}&select=id,authorships`);
    if (!j) break; scanned += j.results.length; cur = j.meta?.next_cursor && j.results.length ? j.meta.next_cursor : null;
    for (const w of j.results) for (const a of w.authorships ?? []) if ((a.raw_affiliation_strings ?? []).some((r) => { const n = norm(r); return n.includes(np) && (!reqFor(id) || reqFor(id).test(n)); })) { const k = short(a.author?.id); if (!k) continue; const e = cnt.get(k) ?? { id: k, name: a.author.display_name, orcid: (a.author.orcid ?? "").replace("https://orcid.org/", "") || null, n: 0 }; e.n++; cnt.set(k, e); }
  }
  for (const e of cnt.values()) if (e.n >= MINW || e.orcid) pick.push(e);
  const authors = [], works = [];
  for (const e of pick) {
    authors.push({ id: e.id, name: e.name, orcid: e.orcid, institutions: [id], disciplines: [], demo: false });
    let cursor = "*";
    while (cursor) {
      const w = await get(`https://api.openalex.org/works?filter=author.id:${e.id},from_publication_date:${FROM}-01-01&per-page=100&cursor=${cursor}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
      if (!w) break;
      for (const x of w.results) {
        const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
        const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === e.id), nCorr = as.filter((z) => z.is_corresponding).length;
        const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
        works.push({ id: `${e.id}-${short(x.id)}`, authorId: e.id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
      }
      cursor = w.meta?.next_cursor && w.results.length ? w.meta.next_cursor : null;
    }
  }
  writeFileSync(cache, JSON.stringify({ authors, works })); console.log(`${c.name}: ${authors.length} tác giả, ${works.length} công trình`);
}
