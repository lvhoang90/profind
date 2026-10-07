// Nạp dữ liệu THẬT từ OpenAlex (CC0) cho các đơn vị trong data/institutions.json có mã ROR.
//   node scripts/ingest-openalex.mjs --mailto you@example.com [--from 2016] [--max-authors 500]
// Ghi data/raw-authors.json (cùng định dạng với make-demo.mjs). Chạy trên máy có Internet; có thể chạy lại, dùng cache ở data/raw/.
// Quy ước: tác giả = hồ sơ OpenAlex gắn với đơn vị (last_known_institutions); công trình lấy từ works?filter=author.id:... ;
// ISSN lấy từ primary_location.source.issn_l / issn. Hồ sơ OpenAlex có thể gộp/tách nhầm: ORCID là khóa xác nhận (xem docs/DESIGN.md).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto <email>.");
// OpenAlex yêu cầu API key miễn phí (https://openalex.org/settings/api): đặt biến môi trường OPENALEX_API_KEY. Không ghi khóa vào mã nguồn.
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY (khóa miễn phí tại openalex.org/settings/api).");
const from = +arg("from", 2016), maxAuthors = +arg("max-authors", 500);
const only = arg("only"); // ví dụ --only ctu,hust (id trong institutions.json); mặc định: mọi đơn vị có ROR
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror && (!only || only.split(",").includes(i.id)));
if (!I.length) throw new Error("Chưa có đơn vị nào có mã ROR trong data/institutions.json.");
mkdirSync("data/raw", { recursive: true });
const get = async (url) => {
  const u = url + (url.includes("?") ? "&" : "?") + `mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 8; t++) { let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** Math.min(t, 5))); continue; } if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** Math.min(t, 5))); else throw new Error(`${r.status} ${u.replace(/api_key=[^&]+/, "api_key=***")}`); }
  throw new Error(`Hết lượt thử: ${u.replace(/api_key=[^&]+/, "api_key=***")}`);
};
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const authors = [], works = [];
const refresh = process.argv.includes("--refresh");
for (const inst of I) {
  const a0 = authors.length, w0 = works.length;
  try {
  const cache = `data/raw/${inst.id}.json`;
  if (!refresh && existsSync(cache)) { const c = JSON.parse(readFileSync(cache, "utf8")); authors.push(...c.authors); works.push(...c.works); console.log(`${inst.name}: dùng cache (${c.authors.length} tác giả)`); continue; }
  let oa; try { oa = await get(`https://api.openalex.org/institutions/ror:${inst.ror.replace(/^https:\/\/ror.org\//, "")}`); } catch (e) { console.warn(`${inst.name}: bỏ qua (${e.message.slice(0, 60)})`); continue; }
  const oid = short(oa.id); let page = 1, got = 0;
  while (got < maxAuthors) {
    const a = await get(`https://api.openalex.org/authors?filter=last_known_institutions.id:${oid}&sort=works_count:desc&per-page=100&page=${page++}`);
    if (!a.results.length) break;
    for (const r of a.results) {
      if (got++ >= maxAuthors) break;
      const id = short(r.id);
      authors.push({ id, name: r.display_name, orcid: r.orcid ? r.orcid.replace("https://orcid.org/", "") : null, institutions: [inst.id], disciplines: [], demo: false });
      let cur = "*";
      while (cur) {
        const w = await get(`https://api.openalex.org/works?filter=author.id:${id},from_publication_date:${from}-01-01&per-page=100&cursor=${cur}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
        for (const x of w.results) {
          const s = x.primary_location?.source; const issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
          // Quy tắc HĐGSNN: tác giả chính = tác giả đứng đầu hoặc tác giả liên hệ; nếu có từ 2 tác giả liên hệ trở lên thì chỉ tính tác giả đứng đầu.
          const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === id);
          const nCorr = as.filter((z) => z.is_corresponding).length;
          const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
          works.push({ id: `${id}-${short(x.id)}`, authorId: id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
        }
        cur = w.meta.next_cursor;
      }
    }
    console.log(`${inst.name}: ${got} tác giả`);
  }
  writeFileSync(cache, JSON.stringify({ authors: authors.slice(a0), works: works.slice(w0) }));
  } catch (e) { authors.length = a0; works.length = w0; console.warn(`${inst.name}: LỖI, bỏ qua, không ghi cache (${String(e.message).slice(0, 80)})`); }
}
// ---- Tác giả ghim theo ORCID hoặc mã OpenAlex "oaId" (data/pinned-orcids.json): luôn nạp, không phụ thuộc vào 50 tác giả đầu của đơn vị ----
if (existsSync("data/pinned-orcids.json")) {
  const allInst = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions;
  const byRor = new Map(allInst.filter((i) => i.ror).map((i) => [i.ror.replace("https://ror.org/", ""), i.id]));
  for (const pin of JSON.parse(readFileSync("data/pinned-orcids.json", "utf8")).authors) {
    const cache = `data/raw/_pinned-${pin.orcid ?? pin.oaId}.json`;
    const pa0 = authors.length, pw0 = works.length;
    try {
      if (!refresh && existsSync(cache)) { const c = JSON.parse(readFileSync(cache, "utf8")); authors.push(...c.authors); works.push(...c.works); console.log(`Ghim ${pin.name}: dùng cache`); continue; }
      const r = await get(pin.orcid ? `https://api.openalex.org/authors/orcid:${pin.orcid}` : `https://api.openalex.org/authors/${pin.oaId}`);
      const id = short(r.id), a0 = authors.length, w0 = works.length;
      const mapped = (r.last_known_institutions ?? []).map((i) => byRor.get((i.ror ?? "").replace("https://ror.org/", ""))).filter(Boolean);
      authors.push({ id, name: r.display_name, orcid: pin.orcid ?? (r.orcid ? r.orcid.replace("https://orcid.org/", "") : null), institutions: [...new Set([pin.institution, ...mapped].filter(Boolean))], disciplines: [], demo: false, pinned: true });
      let cur = "*";
      while (cur) {
        const w = await get(`https://api.openalex.org/works?filter=author.id:${id},from_publication_date:${from}-01-01&per-page=100&cursor=${cur}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
        for (const x of w.results) {
          const s = x.primary_location?.source; const issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
          const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === id), nCorr = as.filter((z) => z.is_corresponding).length;
          const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
          works.push({ id: `${id}-${short(x.id)}`, authorId: id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
        }
        cur = w.meta.next_cursor;
      }
      writeFileSync(cache, JSON.stringify({ authors: authors.slice(a0), works: works.slice(w0) }));
      console.log(`Ghim ${pin.name}: ${works.length - w0} công trình`);
    } catch (e) { authors.length = pa0; works.length = pw0; console.warn(`Ghim ${pin.name}: LỖI, bỏ qua (${String(e.message).slice(0, 80)})`); }
  }
}

writeFileSync("data/raw-authors.json", JSON.stringify({ meta: { demo: false, source: "OpenAlex", fetched: new Date().toISOString().slice(0, 10) }, authors, works }));
console.log(`Xong: ${authors.length} tác giả, ${works.length} công trình`);
