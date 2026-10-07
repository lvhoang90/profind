// Bổ sung quốc gia các đơn vị gần nhất của từng tác giả (OpenAlex last_known_institutions) vào data/author-meta.json.
//   OPENALEX_API_KEY=... node scripts/enrich-authors.mjs --mailto <email>
// Cũng lưu số trích dẫn TOÀN THỜI GIAN và chỉ số h của hồ sơ OpenAlex (citedTotal, h), vì tổng trích dẫn các công trình từ 2016 trong ProFind thấp hơn nhiều.
// Dùng để gắn cờ "có đơn vị ngoài Việt Nam" (nhà khoa học nước ngoài có đơn vị phụ tại Việt Nam), không loại ai khỏi dữ liệu.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY; if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const R = JSON.parse(readFileSync("data/raw-authors.json", "utf8"));
const out = existsSync("data/author-meta.json") ? JSON.parse(readFileSync("data/author-meta.json", "utf8")) : {};
const ids = [...new Set(R.authors.map((a) => a.id))].filter((i) => !out[i] || out[i].cited === undefined);
for (let k = 0; k < ids.length; k += 50) {
  const batch = ids.slice(k, k + 50);
  const u = `https://api.openalex.org/authors?filter=openalex_id:${batch.join("|")}&per-page=50&select=id,last_known_institutions,works_count,cited_by_count,summary_stats&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  const r = await fetch(u); if (!r.ok) { console.error("HTTP", r.status); break; }
  for (const a of (await r.json()).results) out[a.id.replace("https://openalex.org/", "")] = { countries: [...new Set((a.last_known_institutions ?? []).map((i) => i.country_code).filter(Boolean))], worksTotal: a.works_count, cited: a.cited_by_count ?? 0, h: a.summary_stats?.h_index ?? 0 };
}
writeFileSync("data/author-meta.json", JSON.stringify(out));
console.log(`author-meta.json: ${Object.keys(out).length}/${new Set(R.authors.map((a) => a.id)).size} tác giả`);
