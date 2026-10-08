// Khớp danh sách Top 2% (data/top2/top2-vn-career-2025.json + top2-vn-singleyr-2025.json; bản 9, 8/2026) với tác giả ProFind -> data/top2/matches.json (+ review.json cho ca chưa chắc).
//   node scripts/match-top2.mjs
// Quy tắc: tên giống nhau theo TẬP TỪ (bỏ dấu, tách gạch nối, không phân biệt thứ tự họ-tên). Tự nhận khi duy nhất VÀ đơn vị khớp (từ khóa chung) hoặc tác giả
// ProFind có công trình cùng lĩnh vực; ca còn lại ghi vào review.json để xem tay. data/top2/overrides.json quyết định cuối ({ "<tên>": "<id ProFind>" | null }).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
// Hai danh sách: "sự nghiệp" (career) và "năm 2025" (single-year). Người có ở cả hai lấy dòng sự nghiệp (y25 = true); người chỉ có ở danh sách năm 2025 mang scope "y2025".
const CAREER = JSON.parse(readFileSync("data/top2/top2-vn-career-2025.json", "utf8")).authors, SINGLE = JSON.parse(readFileSync("data/top2/top2-vn-singleyr-2025.json", "utf8")).authors;
const inSingle = new Set(SINGLE.map((t) => t.name)), inCareer = new Set(CAREER.map((t) => t.name));
const T = [...CAREER.map((t) => ({ ...t, scope: "career", y25: inSingle.has(t.name) })), ...SINGLE.filter((t) => !inCareer.has(t.name)).map((t) => ({ ...t, scope: "y2025" }))];
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const inst = new Map(P.institutions.map((i) => [i.id, i]));
const OV = existsSync("data/top2/overrides.json") ? JSON.parse(readFileSync("data/top2/overrides.json", "utf8")) : {};
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const toks = (s) => new Set(fold(s).replace(/[^a-z\s'-]/g, " ").split(/[\s\-',]+/).filter((t) => t.length > 0));
const key = (s) => [...toks(s)].sort().join(" ");
const byName = new Map(); for (const a of P.authors) (byName.get(key(a.name)) ?? byName.set(key(a.name), []).get(key(a.name))).push(a);
const STOP = new Set(["university", "of", "and", "the", "technology", "institute", "national", "viet", "nam", "vietnam", "hanoi", "ho", "chi", "minh", "city", "science", "sciences"]);
const itoks = (s) => new Set(fold(s).split(/[^a-z]+/).filter((t) => t && !STOP.has(t)));
const all = (s) => new Set(fold(s).split(/[^a-z]+/).filter(Boolean));
const jac = (a, b) => { let k = 0; for (const x of a) if (b.has(x)) k++; return a.size + b.size - k ? k / (a.size + b.size - k) : 0; };
// Đơn vị khớp nếu: (1) có từ khóa riêng chung (sau khi bỏ từ chung), hoặc (2) toàn bộ từ giống nhau >= 0.6 (các tên chung như "Vietnam National University, Hanoi").
const instOverlap = (dsInst, a) => { const d = itoks(dsInst), D = all(dsInst); return a.institutions.some((id) => { const i = inst.get(id); if (!i) return false; const t = new Set([...itoks(i.en ?? ""), ...itoks(i.name ?? ""), ...itoks(i.abbr ?? "")]); for (const x of d) if (t.has(x)) return true; return [i.en, i.name].filter(Boolean).some((n) => jac(D, all(n)) >= 0.6); }); };
const matches = {}, review = [];
for (const t of T) {
  if (t.name in OV) { if (OV[t.name]) matches[OV[t.name]] = t; continue; }
  const c = byName.get(key(t.name)) ?? [];
  if (c.length === 0) { review.push({ name: t.name, inst: t.inst, why: "không có hồ sơ cùng tên trong ProFind" }); continue; }
  const ok = c.filter((a) => instOverlap(t.inst, a));
  if (ok.length === 1) matches[ok[0].id] = t;
  else review.push({ name: t.name, inst: t.inst, why: ok.length > 1 ? "nhiều hồ sơ khớp" : "cùng tên nhưng khác đơn vị", candidates: c.map((a) => ({ id: a.id, name: a.name, inst: a.institutions.map((i) => inst.get(i)?.en ?? i), works: a.worksCount })) });
}
writeFileSync("data/top2/matches.json", JSON.stringify(Object.fromEntries(Object.entries(matches).map(([id, t]) => [id, { rank: t.rank, rankNs: t.rankNs, field: t.field, subfield: t.subfield, name: t.name, inst: t.inst, selfPct: t.selfPct, inNs: t.inNs, scope: t.scope, ...(t.y25 ? { y25: true } : {}) }])), null, 1));
writeFileSync("data/top2/review.json", JSON.stringify(review, null, 1));
console.log(`Top 2% Việt Nam: ${T.length}; khớp tự động ${Object.keys(matches).length}; cần xem ${review.length} (${review.filter((r) => r.candidates).length} có ứng viên cùng tên)`);
