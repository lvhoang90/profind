// Với hồ sơ OpenAlex đang gộp >= 2 ORCID (dấu hiệu gộp nhầm người trùng tên), lấy ORCID ghi trên TỪNG công trình (authorships[].raw_orcid).
//   node scripts/fetch-orcid-per-work.mjs --mailto <email> --ids-file /tmp/multi.json
// Ghi data/raw/_orcidwork.json = { "<authorId>-<workId>": "<ORCID ghi trên bài hoặc rỗng>" }.
import { readFileSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, ids = JSON.parse(readFileSync(arg("ids-file"), "utf8"));
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (u) => String(u ?? "").replace("https://openalex.org/", "").replace("https://orcid.org/", "");
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const out = {};
for (let i = 0; i < ids.length; i += 20) {
  const grp = new Set(ids.slice(i, i + 20)); let cur = "*";
  while (cur) {
    const j = await get(`https://api.openalex.org/works?filter=author.id:${[...grp].join("|")}&per-page=200&cursor=${cur}&select=id,authorships`); if (!j) break;
    for (const w of j.results) for (const a of w.authorships ?? []) { const aid = short(a.author?.id); if (grp.has(aid)) out[`${aid}-${short(w.id)}`] = short(a.raw_orcid ?? ""); }
    cur = j.meta?.next_cursor && j.results.length ? j.meta.next_cursor : null;
  }
  console.log(`${Math.min(i + 20, ids.length)}/${ids.length}`);
}
writeFileSync("data/raw/_orcidwork.json", JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} cặp, ${Object.values(out).filter(Boolean).length} có ORCID trên bài.`);
