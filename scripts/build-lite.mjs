// Tách profind.json (≈44 MB) để trang chủ, danh sách và bảng xếp hạng tải nhanh:
//   public/data/profind-lite.json  : toàn bộ hồ sơ nhưng không có các trường chi tiết (DETAIL);
//   public/data/authors/pNNN.json  : { "<mã tác giả>": { trường chi tiết } }, NNN = số trong mã tác giả chia dư 256; trang hồ sơ tải khối của mình rồi ghép lại.
// profind.json đầy đủ vẫn được phát cho trang quản trị và người dùng dữ liệu. Chạy trước `vite build` (xem package.json).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
export const SHARDS = 256, shardOf = (id) => `p${String(Number(String(id).replace(/\D/g, "")) % SHARDS).padStart(3, "0")}`;
export const DETAIL = ["rankable", "proParts", "proLo", "proHi", "proR10", "proR90", "proStab", "proConf", "discShares", "discBasis", "vnRecentWorks", "vnRecent", "vnShare", "matchedRate", "rankScore", "rankWorks", "rankCit", "bigShare", "bigWorks", "bigFlag", "mainCountry", "mainCountryWorks", "mainCountryVn", "nCountries", "countedWorks", "totalScore", "citations2016", "oaWorks", "abroadBasis", "dual", "prov"];
const d = JSON.parse(readFileSync("public/data/profind.json", "utf8")), by = new Map();
const authors = d.authors.map((a) => {
  const lite = { ...a }, det = {};
  for (const k of DETAIL) if (k in lite) { if (lite[k] !== null && lite[k] !== undefined) det[k] = lite[k]; delete lite[k]; }
  for (const k of Object.keys(lite)) if (lite[k] === null || lite[k] === false) delete lite[k]; // null/false = trường vắng (mã giao diện xử lý undefined như null)
  if (Object.keys(det).length) { const s = shardOf(a.id); (by.get(s) ?? by.set(s, {}).get(s))[a.id] = det; }
  return lite;
});
writeFileSync("public/data/profind-lite.json", JSON.stringify({ ...d, authors, lite: true }));
rmSync("public/data/authors", { recursive: true, force: true }); mkdirSync("public/data/authors", { recursive: true });
for (const [s, o] of by) writeFileSync(`public/data/authors/${s}.json`, JSON.stringify(o));
console.log(`profind-lite.json: ${authors.length} hồ sơ; ${by.size} khối chi tiết`);

// Bảng xếp hạng đơn vị/ngành tính sẵn (public/data/leaderboard.json): trang xếp hạng không cần tải cả bản lite.
// Quy tắc như trước: bỏ hồ sơ nghi gộp nhầm và hồ sơ chưa có điểm; chỉ tính đơn vị hiện tại; bỏ cơ sở "other"; nhóm cần ≥ MIN hồ sơ đủ điều kiện xếp hạng; điểm TB top 10 chỉ tính hồ sơ đủ điều kiện.
const MIN = 5, TOPN = 10, instBy = new Map(d.institutions.map((i) => [i.id, i]));
const group = (keysOf, all = false) => { // all = gồm cả hồ sơ liên kết quốc tế (xếp theo proRankAll)
  const rk = (a) => (all ? a.proRankAll : a.proRank);
  const g = new Map();
  for (const a of d.authors) { if (a.suspect || a.pro == null || (!all && a.intl)) continue; for (const k of keysOf(a)) (g.get(k) ?? g.set(k, []).get(k)).push(a); }
  const out = [];
  for (const [id, list] of g) {
    const el = list.filter((a) => rk(a) != null); if (el.length < MIN) continue;
    const top = [...el].sort((x, y) => y.pro - x.pro || (rk(x) ?? 1e9) - (rk(y) ?? 1e9)), t10 = top.slice(0, TOPN);
    out.push({ id, n: list.length, avg: t10.reduce((s, a) => s + a.pro, 0) / t10.length, p1000: list.filter((a) => (rk(a) ?? 1e9) <= 1000).length, cit: list.reduce((s, a) => s + (a.citations ?? 0), 0), top: top.slice(0, 3).map((a) => [a.id, a.name, a.pro]) });
  }
  return out;
};
const unitKeys = (a) => (a.institutions ?? []).filter((i) => !a.instPast?.includes(i) && instBy.get(i)?.type !== "other"), withMeta = (r) => { const u = instBy.get(r.id); return { ...r, name: u?.name ?? r.id, en: u?.en ?? "", city: u?.city ?? "", type: u?.type ?? "" }; };
const units = group(unitKeys).map(withMeta);
writeFileSync("public/data/leaderboard.json", JSON.stringify({ types: d.types, units, fields: group((a) => a.disciplines ?? []), unitsAll: group(unitKeys, true).map(withMeta), fieldsAll: group((a) => a.disciplines ?? [], true) }));
console.log(`leaderboard.json: ${units.length} đơn vị`);
