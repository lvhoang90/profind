// Danh sách hồ sơ nhiều đơn vị cần quản trị viên duyệt (tab "Đơn vị tác giả" trong trang quản trị) -> public/data/_multi-review.json
//   node scripts/build-multi-review.mjs   (nguồn: data/multi-affiliation-review.json do bước quét ORCID tạo; bổ sung đơn vị hiện tại và điểm gần đây từ profind.json, data/current-inst.json)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const R = JSON.parse(readFileSync("data/multi-affiliation-review.json", "utf8")), P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const CUR = existsSync("data/current-inst.json") ? JSON.parse(readFileSync("data/current-inst.json", "utf8")) : {}, by = new Map(P.authors.map((a) => [a.id, a]));
const out = [];
for (const r of R.profiles) {
  const a = by.get(r.id); if (!a) continue;
  const past = new Set(a.instPast ?? []), sc = CUR[a.id] ?? {};
  out.push({ id: a.id, name: a.name, orcid: a.orcid, works: a.worksCount, cat: r.cat, orcidCurrent: r.orcidCurrent ?? [], rankable: !!a.rankable, units: a.institutions.map((u) => ({ id: u, now: !past.has(u), w: sc[u] ?? null })) });
}
writeFileSync("public/data/_multi-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), profiles: out }));
console.log(`Hồ sơ cần duyệt: ${out.length}`);
