// Bổ sung công trình KHÔNG có ISSN (sách, chương sách, kỷ yếu, báo cáo hội nghị...) vào cache data/raw/*.json.
//   node scripts/backfill-noissn.mjs --mailto you@example.com [--from 2016]
// Tra theo lô tác giả (author.id:A1|A2|...|A50) để tiết kiệm lượt gọi; chỉ giữ công trình có loại thuộc TYPES và không có ISSN.
// Công trình thêm vào được ghi issn = "" (không tính được điểm HĐGSNN nhưng vẫn là công trình của tác giả). Chạy lại được:
// các lô đã xong ghi trong data/raw/_noissn-done.json; công trình trùng mã không bị thêm lần hai. Hết ngân sách thì dừng êm.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const from = +arg("from", 2016), BATCH = 50;
const TYPES = new Set(["article", "book-chapter", "book", "review", "preprint", "dissertation"]);
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
class Budget extends Error {}
const get = async (url) => {
  const u = url + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 6; t++) {
    let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 1500 * 2 ** Math.min(t, 4))); continue; }
    if (r.ok) return r.json();
    if (r.status === 429 || r.status === 403) { const j = await r.json().catch(() => ({})); if (/budget/i.test(JSON.stringify(j))) throw new Budget("Hết ngân sách OpenAlex"); await new Promise((s) => setTimeout(s, 3000)); continue; }
    if (r.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * 2 ** t)); continue; }
    throw new Error(`${r.status}`);
  }
  throw new Error("hết lượt thử");
};
const files = readdirSync("data/raw").filter((f) => f.endsWith(".json") && !f.startsWith("_noissn")).map((f) => `data/raw/${f}`);
const caches = new Map(), owner = new Map(), seen = new Set(), dirty = new Set();
for (const f of files) { const c = JSON.parse(readFileSync(f, "utf8")); caches.set(f, c); for (const a of c.authors ?? []) if (!owner.has(a.id)) owner.set(a.id, f); for (const w of c.works ?? []) seen.add(w.id); }
const doneFile = "data/raw/_noissn-done.json";
const done = new Set(existsSync(doneFile) ? JSON.parse(readFileSync(doneFile, "utf8")) : []);
const todo = [...owner.keys()].filter((id) => !done.has(id));
console.log(`${owner.size} tác giả, còn ${todo.length} chưa tra công trình không ISSN.`);
const save = () => { for (const f of dirty) writeFileSync(f, JSON.stringify(caches.get(f))); dirty.clear(); writeFileSync(doneFile, JSON.stringify([...done])); };
let added = 0, calls = 0;
try {
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH), bset = new Set(batch); let cur = "*";
    while (cur) {
      const w = await get(`https://api.openalex.org/works?filter=author.id:${batch.join("|")},from_publication_date:${from}-01-01&per-page=100&cursor=${cur}&select=id,doi,title,type,publication_year,cited_by_count,primary_location,authorships`); calls++;
      for (const x of w.results) {
        if (!TYPES.has(x.type)) continue;
        const s = x.primary_location?.source; if (s?.issn_l || s?.issn?.[0]) continue;
        const journal = s?.display_name ?? x.primary_location?.raw_source_name ?? "";
        const as = x.authorships ?? [], nCorr = as.filter((z) => z.is_corresponding).length;
        for (const pos of as) {
          const aid = short(pos.author?.id); if (!bset.has(aid)) continue;
          const wid = `${aid}-${short(x.id)}`; if (seen.has(wid)) continue; seen.add(wid);
          const lead = pos.author_position === "first" || (pos.is_corresponding && nCorr === 1);
          const f = owner.get(aid); caches.get(f).works.push({ id: wid, authorId: aid, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal, issn: "", issns: [], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false }); dirty.add(f); added++;
        }
      }
      cur = w.meta.next_cursor;
    }
    for (const id of batch) done.add(id);
    if ((i / BATCH) % 10 === 9) { save(); console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length} tác giả, +${added} công trình, ${calls} lượt gọi`); }
  }
} catch (e) { if (e instanceof Budget) console.log("Hết ngân sách OpenAlex, dừng; lần sau chạy tiếp."); else { save(); throw e; } }
save(); console.log(`Xong: +${added} công trình không ISSN (${calls} lượt gọi).`);
