// Đối chiếu số trích dẫn với Crossref (API công khai miễn phí, dùng "polite pool" khi có email liên hệ), theo DOI.
//   node scripts/enrich-crossref.mjs [--mailto <email>]
// Đọc DOI trong data/raw/*.json, tra theo lô 40 DOI qua /works?filter=doi:...,doi:..., lưu data/raw/_crossref.json ({ "<doi>": số trích dẫn, -1 nếu Crossref không có DOI này }).
// Chạy lại được: DOI đã tra được bỏ qua. build-index.mjs lấy max(OpenAlex, Semantic Scholar, Crossref) cho từng công trình và in thống kê chênh lệch.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const MAILTO = arg("mailto", process.env.CROSSREF_MAILTO ?? "luongviethoang.hcm@gmail.com");
const OUT = "data/raw/_crossref.json", out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const dois = new Set();
for (const f of readdirSync("data/raw").filter((f) => f.endsWith(".json") && !f.startsWith("_"))) for (const w of JSON.parse(readFileSync(`data/raw/${f}`, "utf8")).works ?? []) if (w.doi && out[w.doi] === undefined) dois.add(w.doi);
const todo = [...dois]; console.log(`Cần tra ${todo.length} DOI (đã có ${Object.keys(out).length}).`);
const BATCH = 40, CONC = 3;
const get = async (url) => {
  for (let t = 0; t < 8; t++) {
    let r; try { r = await fetch(url, { headers: { "user-agent": `ProFind/1.0 (https://profind.isavn.edu.vn; mailto:${MAILTO})` } }); } catch { await new Promise((s) => setTimeout(s, 2000 * (t + 1))); continue; }
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 3000 * 2 ** Math.min(t, 4))); continue; }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error("hết lượt thử");
};
let done = 0, idx = 0;
const one = async (batch) => {
  // DOI có dấu phẩy làm hỏng bộ lọc; bỏ qua (ghi -1) rồi để OpenAlex/Semantic Scholar lo.
  const ok = batch.filter((d) => !d.includes(",")); for (const d of batch) if (d.includes(",")) out[d] = -1;
  if (!ok.length) return;
  const j = await get(`https://api.crossref.org/works?filter=${ok.map((d) => "doi:" + encodeURIComponent(d)).join(",")}&select=DOI,is-referenced-by-count&rows=${ok.length}&mailto=${encodeURIComponent(MAILTO)}`);
  const m = new Map((j.message?.items ?? []).map((it) => [String(it.DOI).toLowerCase(), it["is-referenced-by-count"]]));
  for (const d of ok) { const c = m.get(d.toLowerCase()); out[d] = typeof c === "number" ? c : -1; }
};
try {
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (idx < todo.length) {
      const i = idx; idx += BATCH; await one(todo.slice(i, i + BATCH)); done += Math.min(BATCH, todo.length - i);
      if (Math.floor(done / 4000) !== Math.floor((done - BATCH) / 4000)) { writeFileSync(OUT, JSON.stringify(out)); console.log(`${done}/${todo.length}`); }
      await new Promise((s) => setTimeout(s, 150));
    }
  }));
} catch (e) { console.warn("Dừng:", e.message, "(lần sau chạy tiếp)"); }
writeFileSync(OUT, JSON.stringify(out)); console.log(`Xong: ${Object.keys(out).length} DOI.`);
