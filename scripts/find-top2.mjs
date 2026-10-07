// Tìm hồ sơ OpenAlex cho các tên trong danh sách Top 2% (Việt Nam) chưa có trong ProFind (data/top2/review.json) rồi ghim vào data/pinned-orcids.json (oaId).
//   node scripts/find-top2.mjs --mailto you@example.com
// Quy tắc nhận (thận trọng): tên giống nhau theo TẬP TỪ (bỏ dấu, không phân biệt thứ tự), có đơn vị tại Việt Nam trong OpenAlex, đúng MỘT ứng viên;
// số bài trong OpenAlex không nhỏ hơn 40% số bài ghi trong danh sách. Ca còn lại ghi vào data/top2/find-report.json để xem tay.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const toks = (s) => new Set(fold(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean));
const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const T = JSON.parse(readFileSync("data/top2/top2-vn-career-2024.json", "utf8")).authors;
const rev = JSON.parse(readFileSync("data/top2/review.json", "utf8"));
const OV = existsSync("data/top2/overrides.json") ? JSON.parse(readFileSync("data/top2/overrides.json", "utf8")) : {};
const get = async (u) => { for (let t = 0; t < 5; t++) { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else throw new Error(String(r.status)); } throw new Error("retry"); };
const report = [], found = {};
for (const r of rev) {
  if (r.name in OV) continue;
  const t = T.find((x) => x.name === r.name); if (!t) continue;
  const tk = toks(r.name);
  const q = [...tk].join(" ");
  try {
    const j = await get(`https://api.openalex.org/authors?search=${encodeURIComponent(q)}&per-page=15&select=id,display_name,orcid,works_count,last_known_institutions`);
    const c = j.results.filter((a) => same(toks(a.display_name), tk) && (a.last_known_institutions ?? []).some((i) => i.country_code === "VN") && a.works_count >= 0.4 * (t.np ?? 0));
    if (c.length === 1) found[r.name] = { oaId: c[0].id.replace("https://openalex.org/", ""), display: c[0].display_name, works: c[0].works_count, np: t.np, inst: t.inst };
    else report.push({ name: r.name, inst: r.inst, np: t.np, why: c.length ? "nhiều ứng viên" : "không có ứng viên đạt", cands: j.results.slice(0, 5).map((a) => ({ id: a.id, name: a.display_name, works: a.works_count, inst: (a.last_known_institutions ?? []).map((i) => i.display_name).join("; ") })) });
  } catch (e) { report.push({ name: r.name, why: `lỗi ${e.message}` }); }
}
const pf = JSON.parse(readFileSync("data/pinned-orcids.json", "utf8"));
for (const f of Object.values(found)) if (!pf.authors.some((p) => p.oaId === f.oaId)) pf.authors.push({ oaId: f.oaId, name: f.display, requestedBy: "danh sách Top 2% (Việt Nam), tự động dò" });
writeFileSync("data/pinned-orcids.json", JSON.stringify(pf, null, 2));
writeFileSync("data/top2/found.json", JSON.stringify(found, null, 1)); writeFileSync("data/top2/find-report.json", JSON.stringify(report, null, 1));
console.log(`Top 2% dò được ${Object.keys(found).length}/${rev.length}; cần xem tay ${report.length}`);
