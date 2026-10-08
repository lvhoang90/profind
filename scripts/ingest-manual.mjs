// Nạp tác giả do quản trị viên chỉ định (ví dụ chưa nằm trong nhóm đầu của đơn vị): đọc data/manual-authors.json = [{ "id": "A…", "unit": "<mã đơn vị ProFind>" }]
//   node scripts/ingest-manual.mjs --mailto <email> [--from 2016]
// Bổ sung bằng ORCID: lấy danh sách công trình có DOI trên ORCID (pub.orcid.org), công trình nào OpenAlex chưa gán cho hồ sơ này thì tra theo DOI và gắn vào nếu có chữ ký tác giả khớp ORCID/tên (DOI không có trong OpenAlex được báo để tác giả tự thêm).
// Ghi data/raw/_notable-manual.json (cùng định dạng _notable-*; ingest-openalex.mjs tự gộp). refresh.mjs chạy lại mỗi kỳ để cập nhật công trình mới.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, FROM = arg("from", "2016");
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `${u.includes("?") ? "&" : "?"}mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const list = existsSync("data/manual-authors.json") ? JSON.parse(readFileSync("data/manual-authors.json", "utf8")) : [];
const authors = [], works = [];
for (const m of list) {
  const a = await get(`https://api.openalex.org/authors/${m.id}?select=id,display_name,orcid`); if (!a) { console.warn(`${m.id}: không tra được`); continue; }
  authors.push({ id: m.id, name: a.display_name, orcid: (a.orcid ?? "").replace("https://orcid.org/", "") || null, institutions: [m.unit], disciplines: [], demo: false });
  let cursor = "*";
  while (cursor) {
    const w = await get(`https://api.openalex.org/works?filter=author.id:${m.id},from_publication_date:${FROM}-01-01&per-page=100&cursor=${cursor}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`); if (!w) break;
    for (const x of w.results) {
      const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
      const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === m.id), nCorr = as.filter((z) => z.is_corresponding).length;
      const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
      works.push({ id: `${m.id}-${short(x.id)}`, authorId: m.id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
    }
    cursor = w.meta?.next_cursor && w.results.length ? w.meta.next_cursor : null;
  }
}
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (const a of authors) {
  if (!a.orcid) continue;
  let g; try { g = (await (await fetch(`https://pub.orcid.org/v3.0/${a.orcid}/works`, { headers: { accept: "application/json" } })).json()).group ?? []; } catch { console.warn(`${a.id}: không tra được ORCID`); continue; }
  const dois = [...new Set(g.flatMap((x) => (x["external-ids"]?.["external-id"] ?? []).filter((e) => e["external-id-type"] === "doi").map((e) => cleanDoi(e["external-id-value"]))).filter(Boolean))];
  const have = new Set(works.filter((w) => w.authorId === a.id).map((w) => w.doi)), miss = dois.filter((d) => !have.has(d)); let old = 0; let add = 0; const notFound = [], noIssn = [];
  for (const d of miss) {
    const x = await get(`https://api.openalex.org/works/doi:${encodeURIComponent(d)}?select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
    if (!x?.id) { notFound.push(d); continue; }
    if ((x.publication_year ?? 0) < +FROM) { old++; continue; } // ProFind chỉ nạp công trình từ năm --from
    const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) { noIssn.push(d); continue; }
    const as = x.authorships ?? [], nm = fold(a.name).split(" ").sort().join(" "), pos = as.find((z) => (z.raw_orcid ?? "").endsWith(a.orcid) || (z.author?.orcid ?? "").endsWith(a.orcid)) ?? as.find((z) => fold(z.author?.display_name).split(" ").sort().join(" ") === nm || fold(z.raw_author_name).split(" ").sort().join(" ") === nm);
    if (!pos) { notFound.push(d + " (không khớp tác giả)"); continue; }
    const nCorr = as.filter((z) => z.is_corresponding).length, lead = pos.author_position === "first" || (pos.is_corresponding && nCorr === 1);
    works.push({ id: `${a.id}-${short(x.id)}`, authorId: a.id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false, via: "orcid" }); add++;
  }
  console.log(`${a.name}: ORCID có ${dois.length} DOI, OpenAlex đã gán ${dois.length - miss.length}, bổ sung ${add}; trước năm ${FROM} (không nạp): ${old}; chưa có/không khớp: ${notFound.length ? notFound.join("; ") : "không"}; không có ISSN (sách/kỷ yếu): ${noIssn.length ? noIssn.join("; ") : "không"}.`);
}
writeFileSync("data/raw/_notable-manual.json", JSON.stringify({ authors, works })); console.log(`Nạp thủ công: ${authors.length} tác giả, ${works.length} công trình.`);
