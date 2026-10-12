// Tách profind.json (≈44 MB) để trang chủ, danh sách và bảng xếp hạng tải nhanh:
//   public/data/profind-lite.json  : toàn bộ hồ sơ nhưng không có các trường chi tiết (DETAIL);
//   public/data/authors/pNNN.json  : { "<mã tác giả>": { trường chi tiết } }, NNN = số trong mã tác giả chia dư 256; trang hồ sơ tải khối của mình rồi ghép lại.
// profind.json đầy đủ vẫn được phát cho trang quản trị và người dùng dữ liệu. Chạy trước `vite build` (xem package.json).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
export const SHARDS = 256, shardOf = (id) => `p${String(Number(String(id).replace(/\D/g, "")) % SHARDS).padStart(3, "0")}`;
export const DETAIL = ["rankable", "proParts", "proLo", "proHi", "proR10", "proR90", "proStab", "proConf", "discShares", "discBasis", "vnRecentWorks", "vnRecent", "vnShare", "matchedRate", "rankScore", "rankWorks", "rankCit", "bigShare", "bigWorks", "bigFlag", "mainCountry", "mainCountryWorks", "mainCountryVn", "nCountries", "countedWorks", "totalScore", "citations2016", "oaWorks", "abroadBasis", "dual"];
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
