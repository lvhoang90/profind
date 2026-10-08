// Với hồ sơ OpenAlex đang gộp >= 2 ORCID (dấu hiệu gộp nhầm người trùng tên), lấy ORCID ghi trên TỪNG công trình (authorships[].raw_orcid).
//   node scripts/fetch-orcid-per-work.mjs --mailto <email> [--ids-file ds.json]
// Không có --ids-file: tự chọn hồ sơ có >= 2 ORCID quan sát được (từ data/raw/_authorship.json) và chỉ nạp lại hồ sơ đổi số công trình (data/raw/_orcidwork-done.json).
// Ghi data/raw/_orcidwork.json = { "<authorId>-<workId>": "<ORCID ghi trên bài hoặc rỗng>" }.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, idsFile = arg("ids-file");
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), wc = new Map(P.authors.map((a) => [a.id, a.worksCount]));
const DF = "data/raw/_orcidwork-done.json", done = existsSync(DF) ? JSON.parse(readFileSync(DF, "utf8")) : {};
let ids;
if (idsFile) ids = JSON.parse(readFileSync(idsFile, "utf8"));
else { const AU = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8")), seen = new Map(); for (const [k, v] of Object.entries(AU)) { const a = k.split("-")[0]; if (!seen.has(a)) seen.set(a, new Set()); for (const o of v[2]) seen.get(a).add(o); } ids = [...seen].filter(([a, s]) => s.size > 1 && wc.has(a) && done[a] !== wc.get(a)).map(([a]) => a); }
console.log(`Cần nạp ORCID từng bài cho ${ids.length} hồ sơ.`);
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (u) => String(u ?? "").replace("https://openalex.org/", "").replace("https://orcid.org/", "");
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const out = existsSync("data/raw/_orcidwork.json") ? JSON.parse(readFileSync("data/raw/_orcidwork.json", "utf8")) : {};
for (let i = 0; i < ids.length; i += 20) {
  const grp = new Set(ids.slice(i, i + 20)); let cur = "*";
  while (cur) {
    const j = await get(`https://api.openalex.org/works?filter=author.id:${[...grp].join("|")}&per-page=200&cursor=${cur}&select=id,authorships`); if (!j) break;
    for (const w of j.results) for (const a of w.authorships ?? []) { const aid = short(a.author?.id); if (grp.has(aid)) out[`${aid}-${short(w.id)}`] = short(a.raw_orcid ?? ""); }
    cur = j.meta?.next_cursor && j.results.length ? j.meta.next_cursor : null;
  }
  for (const id of grp) done[id] = wc.get(id);
  console.log(`${Math.min(i + 20, ids.length)}/${ids.length}`);
}
writeFileSync(DF, JSON.stringify(done));
writeFileSync("data/raw/_orcidwork.json", JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} cặp, ${Object.values(out).filter(Boolean).length} có ORCID trên bài.`);
