// Bổ sung DOI cho công trình đã có trong cache data/raw/*.json (cache cũ chưa lưu DOI).
//   node scripts/backfill-doi.mjs --mailto you@example.com
// Tra theo lô 100 mã công trình (OpenAlex, ~0,0001 USD/lượt). Chạy lại được: công trình đã có trường doi (kể cả null) bị bỏ qua.
// Hết ngân sách (429) thì dừng êm, lần sau chạy tiếp.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto <email>.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const clean = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const files = readdirSync("data/raw").filter((f) => f.endsWith(".json")).map((f) => `data/raw/${f}`);
const caches = new Map(); const need = new Set();
for (const f of files) { const c = JSON.parse(readFileSync(f, "utf8")); caches.set(f, c); for (const w of c.works ?? []) if (w.doi === undefined) need.add(w.id.split("-").pop()); }
console.log(`Cần tra DOI cho ${need.size} công trình (không trùng) trong ${files.length} tệp cache.`);
const ids = [...need], found = new Map(); let stop = false, calls = 0;
for (let i = 0; i < ids.length && !stop; i += 100) {
  const batch = ids.slice(i, i + 100);
  const u = `https://api.openalex.org/works?filter=openalex:${batch.join("|")}&select=id,doi&per-page=100&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  let ok = false;
  for (let t = 0; t < 5 && !ok; t++) {
    let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; }
    if (r.status === 429 || r.status === 403) { const j = await r.json().catch(() => ({})); if (/budget|Rate limit/i.test(JSON.stringify(j))) { console.log("Hết ngân sách OpenAlex, dừng; lần sau chạy tiếp."); stop = true; break; } await new Promise((s) => setTimeout(s, 3000)); continue; }
    if (!r.ok) { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; }
    const j = await r.json(); calls++;
    for (const x of j.results ?? []) found.set(x.id.replace("https://openalex.org/", ""), clean(x.doi));
    for (const id of batch) if (!found.has(id)) found.set(id, null); // OpenAlex không trả: ghi null để khỏi tra lại
    ok = true;
  }
  if (!ok && !stop) { console.log("Lô lỗi, bỏ qua tạm thời."); }
}
let n = 0;
for (const [f, c] of caches) { let ch = false; for (const w of c.works ?? []) if (w.doi === undefined) { const k = w.id.split("-").pop(); if (found.has(k)) { w.doi = found.get(k); ch = true; n++; } } if (ch) writeFileSync(f, JSON.stringify(c)); }
console.log(`Đã ghi DOI cho ${n} công trình (${calls} lượt gọi).`);
