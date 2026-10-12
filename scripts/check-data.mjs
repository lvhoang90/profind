// Kiểm tra tính nhất quán của dữ liệu đã dựng (chạy sau d:index): npm run d:check
import { readFileSync, existsSync } from "node:fs";
import { hasWorks } from "./_works-io.mjs";
const d = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const inst = new Set(d.institutions.map((i) => i.id)), errs = [];
const ids = new Set();
for (const a of d.authors) {
  if (ids.has(a.id)) errs.push(`trùng id ${a.id}`); ids.add(a.id);
  for (const i of a.institutions) if (!inst.has(i)) errs.push(`${a.id}: đơn vị không tồn tại ${i}`);
  if (a.worksCount > 0 && !hasWorks(a.id)) errs.push(`${a.id}: thiếu tệp công trình`);
  if (a.countedWorks > a.worksCount) errs.push(`${a.id}: countedWorks > worksCount`);
  if (a.totalScore < 0) errs.push(`${a.id}: điểm âm`);
  if (a.prov) { const p = a.prov, f = p.fix; if (!["works", "weak", "set", "none"].includes(p.instEv)) errs.push(`${a.id}: prov.instEv sai ${p.instEv}`); if (f && (!["excl", "assign", "merged"].every((k) => Number.isInteger(f[k]) && f[k] >= 0) || typeof f.units !== "boolean" || !(f.excl || f.assign || f.merged || f.units))) errs.push(`${a.id}: prov.fix sai`); if (p.instEv === "none" && a.institutions.length) errs.push(`${a.id}: prov.instEv none nhưng có đơn vị`); if (p.instEv === "set" && !f?.units) errs.push(`${a.id}: instEv set nhưng fix.units không đúng`); }
  if (a.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(a.orcid)) errs.push(`${a.id}: ORCID sai định dạng ${a.orcid}`);
}
const orc = new Map(); for (const a of d.authors) if (a.orcid) { if (orc.has(a.orcid)) errs.push(`ORCID trùng: ${a.id} và ${orc.get(a.orcid)}`); orc.set(a.orcid, a.id); }
console.log(`${d.authors.length} tác giả, ${d.institutions.length} đơn vị:`, errs.length ? `${errs.length} lỗi` : "hợp lệ");
for (const e of errs.slice(0, 20)) console.log(" -", e);
process.exit(errs.length ? 1 : 0);
