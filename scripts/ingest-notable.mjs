// Nạp thêm các tác giả "nổi bật" của từng đơn vị: xếp theo SỐ TRÍCH DẪN (không phải số bài), để người có ảnh hưởng không bị bỏ sót
// khi họ không nằm trong nhóm nhiều bài nhất. Mỗi đơn vị: top K theo trích dẫn (>= MINCIT) chưa có trong data/raw/<id>.json.
//   node scripts/ingest-notable.mjs --mailto you@example.com [--k 30] [--mincit 300] [--from 2016] [--only id1,id2]
// Kết quả: data/raw/_notable-<id>.json (cùng định dạng với cache đơn vị; ingest-openalex.mjs tự gộp). Chạy lại được; hết ngân sách thì dừng êm.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const K = +arg("k", 30), MINCIT = +arg("mincit", 300), from = +arg("from", 2016), only = arg("only");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
class Budget extends Error {}
const get = async (url) => {
  const u = url + (url.includes("?") ? "&" : "?") + `mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 6; t++) {
    let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 1500 * 2 ** Math.min(t, 4))); continue; }
    if (r.ok) return r.json();
    if (r.status === 429 || r.status === 403) { const j = await r.json().catch(() => ({})); if (/budget/i.test(JSON.stringify(j))) throw new Budget("Hết ngân sách OpenAlex"); await new Promise((s) => setTimeout(s, 3000)); continue; }
    if (r.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * 2 ** t)); continue; }
    throw new Error(`${r.status} ${url.replace(/\?.*/, "")}`);
  }
  throw new Error("hết lượt thử");
};
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror && existsSync(`data/raw/${i.id}.json`) && (!only || only.split(",").includes(i.id)));
const pool = async (items, n, fn) => { const out = []; let k = 0; await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i]); } })); return out; };
let done = 0, newAuthors = 0;
try {
  for (const inst of I) {
    const cache = `data/raw/_notable-${inst.id}.json`; if (existsSync(cache)) continue;
    const have = new Set(JSON.parse(readFileSync(`data/raw/${inst.id}.json`, "utf8")).authors.map((a) => a.id));
    let oid; try { oid = short((await get(`https://api.openalex.org/institutions/ror:${inst.ror.replace(/^https:\/\/ror.org\//, "")}`)).id); } catch (e) { if (e instanceof Budget) throw e; continue; }
    const a = await get(`https://api.openalex.org/authors?filter=last_known_institutions.id:${oid}&sort=cited_by_count:desc&per-page=${Math.min(100, K + 20)}&select=id,display_name,orcid,cited_by_count,works_count`);
    const pick = a.results.filter((r) => r.cited_by_count >= MINCIT && !have.has(short(r.id))).slice(0, K);
    const authors = [], works = [];
    await pool(pick, 4, async (r) => {
      const id = short(r.id), ws = []; let cur = "*";
      while (cur) {
        const w = await get(`https://api.openalex.org/works?filter=author.id:${id},from_publication_date:${from}-01-01&per-page=100&cursor=${cur}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
        for (const x of w.results) {
          const s = x.primary_location?.source; const issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
          const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === id), nCorr = as.filter((z) => z.is_corresponding).length;
          const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
          ws.push({ id: `${id}-${short(x.id)}`, authorId: id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
        }
        cur = w.meta.next_cursor;
      }
      authors.push({ id, name: r.display_name, orcid: r.orcid ? r.orcid.replace("https://orcid.org/", "") : null, institutions: [inst.id], disciplines: [], demo: false, notable: true });
      works.push(...ws);
    });
    writeFileSync(cache, JSON.stringify({ authors, works })); newAuthors += authors.length; done++;
    console.log(`${inst.name}: +${authors.length} tác giả nổi bật (${done}/${I.length})`);
  }
} catch (e) { if (e instanceof Budget) console.log("Hết ngân sách OpenAlex, dừng; lần sau chạy tiếp."); else throw e; }
console.log(`Xong lượt này: ${done} đơn vị, +${newAuthors} tác giả.`);
