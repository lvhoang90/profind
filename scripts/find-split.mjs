// Tìm các cặp hồ sơ có thể là CÙNG MỘT người bị OpenAlex tách đôi (khác mã, không cùng ORCID): tên tương thích + chung đơn vị + công trình không trùng nhau.
// Chỉ ĐỀ XUẤT -> data/split-candidates.json để người kiểm duyệt; gộp thật qua data/corrections.json (merge).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const D = JSON.parse(readFileSync("public/data/profind.json", "utf8")), C = JSON.parse(readFileSync("data/corrections.json", "utf8"));
const done = new Set(C.merge.flatMap((m) => [m.into, ...m.from])), skip = new Set((existsSync("data/split-rejected.json") ? JSON.parse(readFileSync("data/split-rejected.json", "utf8")) : []).map((p) => p.join("|")));
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
const key = (n) => { const t = norm(n).split(" ").filter(Boolean); return [...t].sort().join(" "); };
const A = D.authors.filter((a) => !a.suspect && !a.demo), by = new Map();
for (const a of A) { const k = key(a.name); if (k.split(" ").length < 2) continue; (by.get(k) ?? by.set(k, []).get(k)).push(a); }
const out = [];
for (const g of by.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
  const x = g[i], y = g[j]; if (x.id === y.id || done.has(x.id) || done.has(y.id) || skip.has([x.id, y.id].sort().join("|"))) continue;
  if (x.orcid && y.orcid && x.orcid !== y.orcid) continue;
  const inst = x.institutions.filter((s) => y.institutions.includes(s));
  const dis = x.disciplines.filter((s) => y.disciplines.includes(s));
  if (!inst.length && !dis.length) continue;
  const score = (inst.length ? 2 : 0) + (dis.length ? 1 : 0) + (x.orcid || y.orcid ? 0 : 0);
  out.push({ a: x.id, b: y.id, name: x.name === y.name ? x.name : `${x.name} / ${y.name}`, sharedInstitutions: inst, sharedDisciplines: dis.length, aWorks: x.worksCount, bWorks: y.worksCount, aYears: [x.firstYear, x.lastYear], bYears: [y.firstYear, y.lastYear], aOrcid: x.orcid, bOrcid: y.orcid, score });
}
out.sort((p, q) => q.score - p.score || (q.aWorks + q.bWorks) - (p.aWorks + p.bWorks));
writeFileSync("data/split-candidates.json", JSON.stringify(out, null, 1)); console.log(`${out.length} cặp nghi tách đôi (chung đơn vị: ${out.filter((o) => o.sharedInstitutions.length).length}).`);
