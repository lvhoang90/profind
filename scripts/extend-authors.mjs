// Nâng giới hạn số nhà nghiên cứu cho các đơn vị lớn: nạp THÊM tác giả (xếp theo số công trình giảm dần) vào cache data/raw/<id>.json.
//   node scripts/extend-authors.mjs --mailto <email> [--top 60] [--target 150] [--from 2016]
// Chọn --top đơn vị có nhiều công trình nhất trong cache (những nơi chắc chắn bị chặn ở mức 50). Chạy lại được; dừng sớm khi ngân sách OpenAlex còn dưới 0,05 USD.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), top = +arg("top", 60), target = +arg("target", 150), from = +arg("from", 2016), KEY = process.env.OPENALEX_API_KEY;
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const get = async (url) => {
  const u = url + (url.includes("?") ? "&" : "?") + `mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 8; t++) { let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** Math.min(t, 5))); continue; } if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * 2 ** Math.min(t, 5))); continue; } throw new Error(`HTTP ${r.status}`); }
  throw new Error("hết lượt thử");
};
const budget = async () => { const r = (await (await fetch(`https://api.openalex.org/rate-limit?api_key=${KEY}`)).json()).rate_limit; return r.daily_remaining_usd + (r.prepaid_remaining_usd ?? 0); };
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror);
const sizes = I.filter((i) => existsSync(`data/raw/${i.id}.json`)).map((i) => ({ i, n: JSON.parse(readFileSync(`data/raw/${i.id}.json`, "utf8")).works.length })).sort((a, b) => b.n - a.n).slice(0, top);
const doneF = "data/raw/_extended.json", done = existsSync(doneF) ? JSON.parse(readFileSync(doneF, "utf8")) : {};
let added = 0;
for (const { i: inst } of sizes) {
  if (done[inst.id] >= target) continue;
  if ((await budget()) < 0.05) { console.log("Hết ngân sách, dừng; chạy lại sau."); break; }
  const cf = `data/raw/${inst.id}.json`, c = JSON.parse(readFileSync(cf, "utf8")), have = new Set(c.authors.map((a) => a.id));
  try {
    const oa = await get(`https://api.openalex.org/institutions/ror:${inst.ror.replace(/^https:\/\/ror.org\//, "")}`), oid = short(oa.id);
    let page = 1, seen = 0, n = 0; const A = [], W = [];
    while (have.size + n < target) {
      const a = await get(`https://api.openalex.org/authors?filter=last_known_institutions.id:${oid}&sort=works_count:desc&per-page=100&page=${page++}`);
      if (!a.results.length) break;
      for (const r of a.results) {
        seen++; const id = short(r.id); if (have.has(id)) continue; if (have.size + n >= target) break;
        n++; A.push({ id, name: r.display_name, orcid: r.orcid ? r.orcid.replace("https://orcid.org/", "") : null, institutions: [inst.id], disciplines: [], demo: false });
        let cur = "*";
        while (cur) {
          const w = await get(`https://api.openalex.org/works?filter=author.id:${id},from_publication_date:${from}-01-01&per-page=100&cursor=${cur}&select=id,doi,title,publication_year,cited_by_count,primary_location,authorships`);
          for (const x of w.results) {
            const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0]; if (!issn) continue;
            const as = x.authorships ?? [], pos = as.find((z) => short(z.author.id) === id), nCorr = as.filter((z) => z.is_corresponding).length;
            const lead = !!pos && (pos.author_position === "first" || (pos.is_corresponding && nCorr === 1));
            W.push({ id: `${id}-${short(x.id)}`, authorId: id, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s.display_name, issn, issns: s.issn ?? [issn], citations: x.cited_by_count, role: lead ? "lead" : "co", corr: nCorr, demo: false });
          }
          cur = w.meta.next_cursor;
        }
      }
    }
    writeFileSync(cf, JSON.stringify({ authors: [...c.authors, ...A], works: [...c.works, ...W] }));
    done[inst.id] = target; writeFileSync(doneF, JSON.stringify(done)); added += A.length;
    console.log(`${inst.name}: +${A.length} tác giả, +${W.length} công trình (đã duyệt ${seen} hồ sơ)`);
  } catch (e) { console.warn(`${inst.name}: lỗi, bỏ qua (${String(e.message).slice(0, 80)})`); }
}
console.log(`Xong: thêm ${added} tác giả. Ngân sách còn ~${(await budget()).toFixed(2)} USD.`);
