// Kiểm toán chéo số trích dẫn với OpenCitations Index (dữ liệu trích dẫn mở CC0, API v2 miễn phí) trên một MẪU ngẫu nhiên các DOI.
//   node scripts/enrich-opencitations.mjs [--sample 4000] [--mailto <email>]
// OpenCitations chỉ có API đếm theo từng DOI (không có lô) nên không tra toàn bộ ~143 nghìn DOI; mẫu đủ lớn để đo mức đồng thuận giữa các nguồn.
// Lưu data/raw/_opencitations.json ({ "<doi>": số trích dẫn }). Số liệu này CHỈ dùng đối chiếu/kiểm toán (build-index in thống kê), không đưa vào điểm,
// vì chỉ phủ một mẫu: đưa vào điểm sẽ đối xử không đồng đều giữa các hồ sơ.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const N = Number(arg("sample", 4000)), MAILTO = arg("mailto", process.env.CROSSREF_MAILTO ?? "luongviethoang.hcm@gmail.com");
const OUT = "data/raw/_opencitations.json", out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const all = new Set();
for (const f of readdirSync("data/raw").filter((f) => f.endsWith(".json") && !f.startsWith("_"))) for (const w of JSON.parse(readFileSync(`data/raw/${f}`, "utf8")).works ?? []) if (w.doi && !w.doi.includes(",")) all.add(w.doi);
// Mẫu ngẫu nhiên có hạt giống cố định để chạy lại cho cùng một mẫu.
let seed = 20261007; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pool = [...all].sort(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
const todo = pool.slice(0, N).filter((d) => out[d] === undefined); console.log(`Mẫu ${N} DOI, cần tra ${todo.length} (đã có ${Object.keys(out).length}).`);
const get = async (d) => {
  for (let t = 0; t < 6; t++) {
    let r; try { r = await fetch(`https://opencitations.net/index/api/v2/citation-count/doi:${encodeURIComponent(d).replace(/%2F/gi, "/")}`, { headers: { "user-agent": `ProFind/1.0 (https://profind.isavn.edu.vn; mailto:${MAILTO})` } }); } catch { await new Promise((s) => setTimeout(s, 2000 * (t + 1))); continue; }
    if (r.ok) { const j = await r.json(); return Number(j?.[0]?.count ?? 0); }
    if (r.status === 404) return -1;
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 3000 * 2 ** Math.min(t, 4))); continue; }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error("hết lượt thử");
};
let idx = 0, done = 0;
try {
  await Promise.all(Array.from({ length: 4 }, async () => { while (idx < todo.length) { const d = todo[idx++]; out[d] = await get(d); if (++done % 250 === 0) { writeFileSync(OUT, JSON.stringify(out)); console.log(`${done}/${todo.length}`); } await new Promise((s) => setTimeout(s, 250)); } }));
} catch (e) { console.warn("Dừng:", e.message, "(lần sau chạy tiếp)"); }
writeFileSync(OUT, JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} DOI.`);
