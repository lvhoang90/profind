// Bổ sung SỐ TÁC GIẢ của từng công trình từ OpenAlex để nhận diện công trình của nhóm nghiên cứu lớn (consortium) và gắn cờ trên hồ sơ.
//   OPENALEX_API_KEY=... node scripts/enrich-nauth.mjs --mailto <email>
// Tra theo lô 100 mã công trình (filter=openalex:W1|W2|...), lưu data/raw/_nauth.json ({ "W123": số tác giả }). OpenAlex cắt danh sách ở 100 tác giả:
// công trình bị cắt (is_authors_truncated) ghi 101 (nghĩa là "hơn 100"). Chạy lại được: mã đã tra được bỏ qua; hết ngân sách thì dừng êm.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const OUT = "data/raw/_nauth.json", out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const ids = new Set();
for (const f of readdirSync("data/raw").filter((f) => f.endsWith(".json") && !f.startsWith("_old") && !f.startsWith("_noissn") && !f.startsWith("_s2") && !f.startsWith("_crossref") && !f.startsWith("_opencitations") && !f.startsWith("_nauth"))) for (const w of JSON.parse(readFileSync(`data/raw/${f}`, "utf8")).works ?? []) { const k = String(w.id).split("-").pop(); if (/^W\d+$/.test(k) && out[k] === undefined) ids.add(k); }
const todo = [...ids]; console.log(`Cần tra ${todo.length} công trình (đã có ${Object.keys(out).length}).`);
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
let idx = 0, done = 0, calls = 0;
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (idx < todo.length) {
      const i = idx; idx += 100; const batch = todo.slice(i, i + 100);
      const j = await get(`https://api.openalex.org/works?filter=openalex:${batch.join("|")}&per-page=100&select=id,authorships,is_authors_truncated`); calls++;
      const seen = new Set();
      for (const x of j.results ?? []) { const k = String(x.id).replace("https://openalex.org/", ""); seen.add(k); out[k] = x.is_authors_truncated ? 101 : (x.authorships ?? []).length; }
      for (const k of batch) if (!seen.has(k)) out[k] = 0; // OpenAlex không còn mã này
      done += batch.length;
      if (Math.floor(done / 5000) !== Math.floor((done - batch.length) / 5000)) { writeFileSync(OUT, JSON.stringify(out)); console.log(`${done}/${todo.length}`); }
    }
  }));
} catch (e) { if (e instanceof Budget) console.log("Hết ngân sách OpenAlex, dừng; lần sau chạy tiếp."); else { writeFileSync(OUT, JSON.stringify(out)); throw e; } }
writeFileSync(OUT, JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} công trình (${calls} lượt gọi).`);
