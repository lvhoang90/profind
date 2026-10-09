// Tìm hồ sơ OpenAlex cho các tên trong danh sách Top 2% (Việt Nam) chưa có trong ProFind (data/top2/review.json) rồi ghim vào data/pinned-orcids.json (oaId).
//   node scripts/find-top2.mjs --mailto you@example.com
// Quy tắc nhận (thận trọng), đủ cả ba: (1) tên khớp: cùng bộ chữ cái sau khi bỏ dấu (không phân biệt thứ tự, tên viết liền như "Nguyenhai Nam" vẫn khớp), hoặc
// khớp theo từ có cho phép chữ viết tắt ("Pandian M. Vasant" ~ "Pandian Vasant"); (2) có đơn vị tại Việt Nam trong OpenAlex; (3) số bài trong OpenAlex từ 40% đến 400% số bài
// ghi trong danh sách. Nhận khi đúng MỘT ứng viên đạt, hoặc khi chỉ một ứng viên có đơn vị trùng từ khóa với đơn vị ghi trong danh sách. Ca còn lại ghi vào data/top2/find-report.json.
// Chỉ xét tên chưa khớp hồ sơ ProFind nào (data/top2/matches.json) và chưa có quyết định tay (overrides.json).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const mailto = arg("mailto"); if (!mailto) throw new Error("Cần --mailto.");
const KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const toks = (s) => new Set(fold(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean));
const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const letters = (s) => fold(s).replace(/[^a-z]/g, "").split("").sort().join("");
// khớp theo từ có chữ viết tắt: mỗi từ của một bên là từ của bên kia hoặc là chữ cái đầu của một từ còn lại; bên dài hơn không được hơn bên ngắn quá một từ giữa
const tokMatch = (a, b) => { const [s1, l] = a.size <= b.size ? [a, b] : [b, a]; if (l.size - s1.size > 1) return false; return [...s1].every((x) => l.has(x) || (x.length === 1 && [...l].some((y) => y[0] === x))) && [...l].filter((y) => !s1.has(y) && ![...s1].some((x) => x.length === 1 && y[0] === x)).length <= 1; };
const full = (s) => [...toks(s)].filter((x) => x.length > 1).length;
const exact = (q, c) => letters(q) === letters(c); // cùng bộ chữ cái; khớp theo từ có viết tắt (chưa đủ chắc) cần thêm bằng chứng đơn vị
const nameOk = (q, c) => exact(q, c) || (full(c) >= 2 && tokMatch(toks(q), toks(c)));
const STOPI = new Set(["university", "of", "and", "the", "institute", "national", "viet", "nam", "vietnam", "vietnamese", "academy", "science", "sciences", "technology", "ho", "chi", "minh", "city", "hanoi", "ha", "noi", "dai", "hoc", "truong"]);
const itoks = (s) => new Set(fold(s).split(/[^a-z]+/).filter((x) => x.length > 2 && !STOPI.has(x)));
const T = [...JSON.parse(readFileSync("data/top2/top2-vn-career-2025.json", "utf8")).authors, ...JSON.parse(readFileSync("data/top2/top2-vn-singleyr-2025.json", "utf8")).authors];
const matched = new Set(Object.values(JSON.parse(readFileSync("data/top2/matches.json", "utf8"))).map((t) => t.name));
const rev = T.filter((t) => !matched.has(t.name)).map((t) => ({ name: t.name, inst: t.inst })).filter((r, i, a) => a.findIndex((x) => x.name === r.name) === i);
const OV = existsSync("data/top2/overrides.json") ? JSON.parse(readFileSync("data/top2/overrides.json", "utf8")) : {};
const get = async (u) => { for (let t = 0; t < 5; t++) { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else throw new Error(String(r.status)); } throw new Error("retry"); };
const report = [], found = {};
for (const r of rev) {
  if (r.name in OV) continue;
  const t = T.find((x) => x.name === r.name); if (!t) continue;
  const tk = toks(r.name);
  const q = [...tk].join(" ");
  try {
    const j = await get(`https://api.openalex.org/authors?search=${encodeURIComponent(q)}&per-page=25&select=id,display_name,orcid,works_count,last_known_institutions`);
    const np = t.np ?? 0, wanted = itoks(t.inst ?? "");
    const instHit = (a) => (a.last_known_institutions ?? []).some((i) => [...itoks(i.display_name ?? "")].some((x) => wanted.has(x)));
    if (new Set(T.filter((x) => x.name === r.name).map((x) => x.inst)).size > 1) { report.push({ name: r.name, inst: r.inst, np, why: "tên trùng nhau trong danh sách Top 2% (nhiều người)" }); continue; }
    let c = j.results.filter((a) => nameOk(r.name, a.display_name) && (exact(r.name, a.display_name) || instHit(a)) && (a.last_known_institutions ?? []).some((i) => i.country_code === "VN") && a.works_count >= 0.4 * np && a.works_count <= 4 * np);
    if (c.length > 1) { const withInst = c.filter(instHit); if (withInst.length === 1) c = withInst; }
    if (c.length === 1) found[r.name] = { oaId: c[0].id.replace("https://openalex.org/", ""), display: c[0].display_name, works: c[0].works_count, np: t.np, inst: t.inst };
    else report.push({ name: r.name, inst: r.inst, np: t.np, why: c.length ? "nhiều ứng viên" : "không có ứng viên đạt", cands: j.results.slice(0, 5).map((a) => ({ id: a.id, name: a.display_name, works: a.works_count, inst: (a.last_known_institutions ?? []).map((i) => i.display_name).join("; ") })) });
  } catch (e) { report.push({ name: r.name, why: `lỗi ${e.message}` }); }
}
const prevFound = existsSync("data/top2/found.json") ? JSON.parse(readFileSync("data/top2/found.json", "utf8")) : {};
for (const [k, v] of Object.entries(prevFound)) if (!(k in found)) found[k] = v;
const pf = JSON.parse(readFileSync("data/pinned-orcids.json", "utf8"));
for (const f of Object.values(found)) if (!pf.authors.some((p) => p.oaId === f.oaId)) pf.authors.push({ oaId: f.oaId, name: f.display, requestedBy: "danh sách Top 2% (Việt Nam), tự động dò" });
writeFileSync("data/pinned-orcids.json", JSON.stringify(pf, null, 2));
writeFileSync("data/top2/found.json", JSON.stringify(found, null, 1)); writeFileSync("data/top2/find-report.json", JSON.stringify(report, null, 1));
console.log(`Top 2% dò được ${Object.keys(found).length}/${rev.length}; cần xem tay ${report.length}`);
