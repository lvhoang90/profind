// Chủ đề nghiên cứu của từng tác giả theo OpenAlex (phân loại theo nội dung công trình, độc lập với danh mục tạp chí) -> data/author-topics.json
//   node scripts/fetch-author-topics.mjs [--mailto <email>]
// Mỗi tác giả: số công trình OpenAlex và các tiểu lĩnh vực (subfield) kèm số công trình: { id: { n, s: [[subfield, field, count], ...] } }. Dùng cho scripts/classify-disciplines.mjs.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const MAIL = arg("mailto", "luongviethoang.safi@gmail.com"), OUT = "data/author-topics.json", P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const have = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {}, ids = P.authors.map((a) => a.id).filter((i) => !(i in have));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { for (let t = 0; t < 5; t++) { try { const r = await fetch(u); if (r.ok) return r.json(); await sleep(1500 * 2 ** t); } catch { await sleep(1500 * 2 ** t); } } return null; };
let q = 0, done = 0; const batches = []; for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
await Promise.all(Array.from({ length: 4 }, async () => { while (q < batches.length) { const b = batches[q++], j = await get(`https://api.openalex.org/authors?filter=openalex:${b.join("|")}&per-page=50&select=id,works_count,topics&mailto=${MAIL}`); const got = new Set();
  for (const r of j?.results ?? []) { const id = r.id.replace("https://openalex.org/", ""), by = new Map(); for (const t of r.topics ?? []) { const k = `${t.subfield?.display_name}|${t.field?.display_name}`; by.set(k, (by.get(k) ?? 0) + (t.count ?? 0)); } have[id] = { n: r.works_count ?? 0, s: [...by].map(([k, c]) => [...k.split("|"), c]).sort((x, y) => y[2] - x[2]) }; got.add(id); }
  for (const id of b) if (!got.has(id)) have[id] = { n: 0, s: [] }; done += b.length; if (q % 20 === 0) { writeFileSync(OUT, JSON.stringify(have)); console.log(`${done}/${ids.length}`); } } }));
writeFileSync(OUT, JSON.stringify(have)); console.log(`Xong: ${Object.keys(have).length} tác giả; không có chủ đề: ${Object.values(have).filter((v) => !v.s.length).length}`);
