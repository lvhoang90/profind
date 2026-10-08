// Danh sách hồ sơ bị gắn nhãn "liên kết chính ở nước ngoài" mà TRƯỚC ĐÓ đang xếp hạng, để quản trị viên xác nhận ngoại lệ.
//   node scripts/abroad-review.mjs [--old <profind.json cũ>]   -> data/abroad-review.json (sắp theo hạng cũ)
// prevRank: hạng trước khi áp quy tắc (lấy từ ảnh chụp cũ nếu có, nếu không thì hạng trong --old, mặc định bản profind.json ở commit HEAD).
// Ngoại lệ (vẫn xếp hạng): thêm mã vào data/vn-confirmed.json. Quy tắc: scripts/lib/abroad.mjs; ngưỡng do hội đồng mô phỏng quyết định.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), rule = JSON.parse(readFileSync("data/abroad-rule.json", "utf8"));
const old = JSON.parse(arg("old") ? readFileSync(arg("old"), "utf8") : execSync("git show HEAD:public/data/profind.json", { maxBuffer: 1 << 30 }).toString()), oldRank = new Map(old.authors.map((a) => [a.id, a.proRank]));
const snap = existsSync("data/abroad-review.json") ? JSON.parse(readFileSync("data/abroad-review.json", "utf8")) : { rows: [] }, snapRank = new Map(snap.rows.map((r) => [r.id, r.prevRank]));
const unit = new Map(P.institutions.map((i) => [i.id, i.name])), rows = [];
for (const a of P.authors) {
  if (!a.abroadMain) continue; const prev = snapRank.get(a.id) ?? oldRank.get(a.id); if (prev == null) continue;
  rows.push({ id: a.id, name: a.name, orcid: a.orcid, prevRank: prev, basis: a.abroadBasis, vnRecentMin: a.vnRecent, vnOverall: a.vnShare, recentWorks: a.vnRecentWorks, units: a.institutions.map((i) => unit.get(i) ?? i) });
}
rows.sort((x, y) => x.prevRank - y.prevRank);
writeFileSync("data/abroad-review.json", JSON.stringify({ _note: "Hồ sơ từng xếp hạng nhưng nay bị gắn nhãn 'liên kết chính ở nước ngoài'. prevRank = hạng trước khi áp quy tắc. Ngoại lệ: thêm mã vào data/vn-confirmed.json.", rule: { window: P.meta.abroad?.window, recentMinShare: Math.round(rule.recentMinShare * 100), maxVnShare: Math.round(rule.maxVnShare * 100) }, total: rows.length, rows }, null, 1) + "\n");
console.log(`${rows.length} hồ sơ (top 100 cũ: ${rows.filter((r) => r.prevRank <= 100).length}; top 1000 cũ: ${rows.filter((r) => r.prevRank <= 1000).length})`);
