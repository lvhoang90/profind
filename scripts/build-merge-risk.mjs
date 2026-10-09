// Phát hiện hồ sơ nhiều khả năng gộp nhiều người, từ dữ liệu chủ đề OpenAlex (data/author-topics.json) + tên + số đơn vị.
// Chỉ để quản trị viên rà (data/merge-risk.json), KHÔNG tự ẩn hay đổi thứ hạng. Chạy sau build-index.mjs.
// Điểm rủi ro = tổng z-score của 4 tín hiệu (tính trên hồ sơ có >= 15 công trình):
//   same: số hồ sơ cùng tên (đã bỏ dấu, không phân biệt thứ tự); ninst: số đơn vị; H: entropy chuẩn hóa của phân bố lĩnh vực (Scopus field);
//   fld3: tỉ trọng lĩnh vực thứ ba. Kiểm định trên mẫu 180 hồ sơ gán nhãn thủ công (53 nghi gộp): AUC 0,78; nhóm 11% cao nhất: 16/21 hồ sơ trong mẫu đúng là nghi gộp (độ chính xác ~76%), bắt được ~30% tổng số nghi gộp. Chưa đủ chắc để tự ẩn.
import { readFileSync, writeFileSync } from "node:fs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const P = rd("public/data/profind.json"), AT = rd("data/author-topics.json"), C = rd("data/corrections.json");
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().match(/[a-z]+/g)?.sort().join(" ") ?? "";
const nm = new Map(); for (const a of P.authors) { const k = fold(a.name); nm.set(k, (nm.get(k) ?? 0) + 1); }
const feat = (a) => {
  const v = AT[a.id]?.s ?? [], tot = v.reduce((x, [, , c]) => x + c, 0); if (!tot) return null;
  const fl = new Map(); for (const [, f, c] of v) fl.set(f, (fl.get(f) ?? 0) + c / tot);
  const ps = [...fl.values()].sort((x, y) => y - x);
  return { same: nm.get(fold(a.name)), ninst: a.institutions.length, H: -ps.reduce((s, p) => s + p * Math.log(p), 0) / Math.log(26), fld3: ps[2] ?? 0 };
};
const KS = ["same", "ninst", "H", "fld3"], pop = P.authors.filter((a) => a.worksCount >= 15).map((a) => [a, feat(a)]).filter(([, f]) => f);
const st = Object.fromEntries(KS.map((k) => { const v = pop.map(([, f]) => f[k]), mu = v.reduce((x, y) => x + y, 0) / v.length; return [k, [mu, Math.sqrt(v.reduce((x, y) => x + (y - mu) ** 2, 0) / v.length) || 1]]; }));
const risk = pop.map(([a, f]) => ({ id: a.id, name: a.name, rank: a.proRank, works: a.worksCount, units: a.institutions.length, same: f.same, H: +f.H.toFixed(2), fld3: +f.fld3.toFixed(2), risk: +KS.reduce((s, k) => s + (f[k] - st[k][0]) / st[k][1], 0).toFixed(2), reviewed: !!(C.notSuspect?.includes?.(a.id) || C.setInstitutions?.[a.id]) })).sort((x, y) => y.risk - x.risk);
const cut = risk[Math.floor(risk.length * 0.11)].risk; // mức điểm của nhóm 11% cao nhất
{ const o = JSON.stringify({ built: new Date().toISOString().slice(0, 10), note: "Điểm rủi ro hồ sơ gộp nhiều người (cao = đáng nghi). Chỉ để rà, không tự ẩn. high = nhóm 11% cao nhất.", cut, profiles: risk.filter((r) => r.risk >= cut).map((r) => ({ ...r, high: true })) }, null, 1); writeFileSync("data/merge-risk.json", o); writeFileSync("public/data/merge-risk.json", o); }
console.log(`merge-risk: ${risk.length} hồ sơ >= 15 công trình, ${risk.filter((r) => r.risk >= cut).length} ở nhóm cao (>= ${cut}); trong đó có hạng ${risk.filter((r) => r.risk >= cut && r.rank).length}`);
