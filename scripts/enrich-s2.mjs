// Bổ sung số trích dẫn từ Semantic Scholar (API công khai miễn phí, có kho kỷ yếu hội nghị và bản thảo mà OpenAlex đếm thiếu) theo DOI.
//   node scripts/enrich-s2.mjs [--key <S2_API_KEY>]
// Đọc DOI trong data/raw/*.json, tra theo lô 500 qua /paper/batch, lưu data/raw/_s2.json ({ "<doi>": số trích dẫn }). Chạy lại được: DOI đã tra được bỏ qua.
// build-index.mjs lấy max(OpenAlex, Semantic Scholar) cho từng công trình. Google Scholar KHÔNG có API công khai và cấm truy xuất tự động nên không lấy.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const KEY = arg("key", process.env.S2_API_KEY);
const out = existsSync("data/raw/_s2.json") ? JSON.parse(readFileSync("data/raw/_s2.json", "utf8")) : {};
const dois = new Set();
for (const f of readdirSync("data/raw").filter((f) => f.endsWith(".json") && !f.startsWith("_s2") && !f.startsWith("_noissn"))) for (const w of JSON.parse(readFileSync(`data/raw/${f}`, "utf8")).works ?? []) if (w.doi && out[w.doi] === undefined) dois.add(w.doi);
const todo = [...dois]; console.log(`Cần tra ${todo.length} DOI (đã có ${Object.keys(out).length}).`);
const post = async (ids) => {
  for (let t = 0; t < 8; t++) {
    let r; try { r = await fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds", { method: "POST", headers: { "content-type": "application/json", ...(KEY ? { "x-api-key": KEY } : {}) }, body: JSON.stringify({ ids }) }); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** Math.min(t, 5))); continue; }
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 3000 * 2 ** Math.min(t, 5))); continue; }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error("hết lượt thử");
};
let n = 0;
try {
  for (let i = 0; i < todo.length; i += 500) {
    const batch = todo.slice(i, i + 500), res = await post(batch.map((d) => `DOI:${d}`));
    batch.forEach((d, k) => { const p = res[k]; out[d] = p && typeof p.citationCount === "number" ? p.citationCount : 0; });
    n += batch.length;
    if ((i / 500) % 10 === 9) { writeFileSync("data/raw/_s2.json", JSON.stringify(out)); console.log(`${n}/${todo.length}`); }
    await new Promise((s) => setTimeout(s, 1100)); // khóa S2 giới hạn 1 yêu cầu/giây (cộng dồn mọi endpoint)
  }
} catch (e) { console.warn("Dừng:", e.message, "(lần sau chạy tiếp)"); }
writeFileSync("data/raw/_s2.json", JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} DOI.`);
