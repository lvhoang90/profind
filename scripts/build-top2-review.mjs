// Danh sách xác nhận người trong Top 2% (Việt Nam) chưa gắn được hồ sơ ProFind -> data/top2/admin-review.json (API admin-t2 nhúng, chỉ quản trị viên đọc).
//   node scripts/build-top2-review.mjs   (chạy sau match-top2.mjs và build-index.mjs)
// Ứng viên: (1) hồ sơ ProFind cùng bộ chữ cái của tên (không phân biệt dấu, thứ tự, tên viết liền); (2) ứng viên OpenAlex do find-top2.mjs ghi trong find-report.json
// (chưa chắc có trong ProFind: nếu được chọn thì cần ghim thêm vào data/pinned-orcids.json). Quyết định lưu ở Redis; xuất JSON để đưa vào data/top2/overrides.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const T = [...rd("data/top2/top2-vn-career-2025.json").authors.map((t) => ({ ...t, scope: "career" })), ...rd("data/top2/top2-vn-singleyr-2025.json").authors.map((t) => ({ ...t, scope: "y2025" }))];
const M = rd("data/top2/matches.json"), OV = rd("data/top2/overrides.json"), P = rd("public/data/profind.json"), FR = existsSync("data/top2/find-report.json") ? rd("data/top2/find-report.json") : [];
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const letters = (s) => fold(s).replace(/[^a-z]/g, "").split("").sort().join("");
const inst = new Map(P.institutions.map((i) => [i.id, i.name])), byId = new Map(P.authors.map((a) => [a.id, a])), byLet = new Map();
for (const a of P.authors) { const k = letters(a.name); (byLet.get(k) ?? byLet.set(k, []).get(k)).push(a); }
const done = new Set(Object.values(M).map((t) => t.name)), seen = new Set(), items = [];
for (const t of T) {
  if (done.has(t.name) || (t.name in OV && OV[t.name] === null) || seen.has(t.name)) continue; seen.add(t.name);
  const cands = new Map();
  for (const a of byLet.get(letters(t.name)) ?? []) cands.set(a.id, { id: a.id, name: a.name, works: a.worksCount, units: a.institutions.slice(0, 3).map((u) => inst.get(u) ?? u), firstYear: a.firstYear, citations: a.citations, inProfind: true, rank: a.proRank ?? null });
  for (const c of FR.find((r) => r.name === t.name)?.cands ?? []) { const id = String(c.id).replace("https://openalex.org/", ""); if (!cands.has(id)) cands.set(id, { id, name: c.name, works: c.works, units: c.inst ? c.inst.split("; ").slice(0, 3) : [], inProfind: byId.has(id), rank: byId.get(id)?.proRank ?? null }); }
  const dup = new Set(T.filter((x) => x.name === t.name).map((x) => x.inst)).size > 1; // cùng tên nhưng khác đơn vị: có thể là nhiều người
  items.push({ name: t.name, inst: t.inst, field: t.field, subfield: t.subfield, rank: t.rank, np: t.np, firstyr: t.firstyr, lastyr: t.lastyr, topCntry: t.topCntry, scope: t.scope, dup, cands: [...cands.values()].slice(0, 8) });
}
items.sort((x, y) => y.cands.length - x.cands.length || x.name.localeCompare(y.name));
writeFileSync("data/top2/admin-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), items }, null, 1));
console.log(`Top 2% chưa gắn: ${items.length} người; ${items.filter((i) => i.cands.length).length} có ứng viên; ${items.filter((i) => i.dup).length} tên trùng trong danh sách`);
