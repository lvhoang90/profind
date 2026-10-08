// Bổ sung công trình theo ORCID cho MỌI hồ sơ có ORCID: DOI trên ORCID công khai mà OpenAlex chưa gán cho hồ sơ -> tra OpenAlex theo DOI (nhóm 50 DOI/lượt)
// -> gắn vào hồ sơ nếu chữ ký tác giả trên bài khớp ORCID hoặc tên. Chỉ lấy bài báo (journal-article) từ năm --from, phải có ISSN.
//   node scripts/orcid-supplement.mjs --mailto <email> [--from 2016] [--conc 6] [--max-age-days 30]
// Ghi data/raw/_notable-orcid.json (cùng định dạng _notable-*, authors rỗng; ingest-openalex.mjs tự gộp). Tăng dần: bỏ qua hồ sơ đã xử lý trong --max-age-days ngày (data/raw/_orcid-supp-done.json).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, FROM = +arg("from", 2016), CONC = +arg("conc", 6), AGE = +arg("max-age-days", 30) * 864e5;
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const key = (x) => fold(x).split(" ").sort().join(" ");
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const oa = async (u) => { for (let t = 0; t < 5; t++) { try { const r = await fetch(u + `${u.includes("?") ? "&" : "?"}mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await sleep(2000 * 2 ** t); else return null; } catch { await sleep(2000); } } return null; };
const orcid = async (id) => { for (let t = 0; t < 4; t++) { try { const r = await fetch(`https://pub.orcid.org/v3.0/${id}/works`, { headers: { accept: "application/json" } }); if (r.ok) return (await r.json()).group ?? []; if (r.status === 404) return []; await sleep(1500 * 2 ** t); } catch { await sleep(1500); } } return null; };
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")).authors.filter((a) => a.orcid && !a.suspect);
const OF = "data/raw/_notable-orcid.json", DF = "data/raw/_orcid-supp-done.json";
const out = existsSync(OF) ? JSON.parse(readFileSync(OF, "utf8")) : { authors: [], works: [] }, done = existsSync(DF) ? JSON.parse(readFileSync(DF, "utf8")) : {};
const seen = new Set(out.works.map((w) => w.id)), todo = P.filter((a) => !(done[a.id] && Date.now() - done[a.id] < AGE));
console.log(`Hồ sơ có ORCID: ${P.length}; cần xử lý: ${todo.length}.`);
let nDone = 0, added = 0, noMatch = 0; const t0 = Date.now();
const one = async (a) => {
  const g = await orcid(a.orcid); if (!g) return;
  let have = new Set(); try { const w = JSON.parse(readFileSync(`public/data/works/${a.id}.json`, "utf8")); have = new Set((w.works ?? w).map((x) => x.doi).filter(Boolean)); } catch { /* chưa có công trình */ }
  const dois = [...new Set(g.filter((x) => { const s = x["work-summary"]?.[0]; return s?.type === "journal-article" && +(s["publication-date"]?.year?.value ?? 0) >= FROM; }).flatMap((x) => (x["external-ids"]?.["external-id"] ?? []).filter((e) => e["external-id-type"] === "doi").map((e) => cleanDoi(e["external-id-value"]))).filter(Boolean))].filter((d) => !have.has(d));
  const nm = key(a.name);
  for (let i = 0; i < dois.length; i += 50) {
    const j = await oa(`https://api.openalex.org/works?filter=doi:${dois.slice(i, i + 50).map((d) => "https://doi.org/" + d).join("|")}&per-page=50&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
    for (const x of j?.results ?? []) {
      const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0]; if (!issn || (x.publication_year ?? 0) < FROM) continue;
      const as = x.authorships ?? [], pos = as.find((z) => (z.raw_orcid ?? "").endsWith(a.orcid) || (z.author?.orcid ?? "").endsWith(a.orcid)) ?? as.find((z) => key(z.author?.display_name) === nm || key(z.raw_author_name) === nm);
      if (!pos) { noMatch++; continue; }
      const id = `${a.id}-${short(x.id)}`; if (seen.has(id)) continue; seen.add(id);
      const nCorr = as.filter((z) => z.is_corresponding).length, lead = pos.author_position === "first" || (pos.is_corresponding && nCorr === 1);
      out.works.push({ id, authorId: a.id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false, via: "orcid" }); added++;
    }
  }
  done[a.id] = Date.now();
};
let idx = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (idx < todo.length) { const a = todo[idx++]; try { await one(a); } catch (e) { console.warn(a.id, String(e.message).slice(0, 80)); } nDone++; if (nDone % 200 === 0) { writeFileSync(OF, JSON.stringify(out)); writeFileSync(DF, JSON.stringify(done)); console.log(`${nDone}/${todo.length} hồ sơ, +${added} bài (${Math.round((Date.now() - t0) / 60000)} phút)`); } } }));
writeFileSync(OF, JSON.stringify(out)); writeFileSync(DF, JSON.stringify(done)); console.log(`Xong: +${added} công trình từ ORCID (${noMatch} bài không khớp chữ ký tác giả).`);
