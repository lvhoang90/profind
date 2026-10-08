// Tìm các cặp hồ sơ có thể là CÙNG MỘT người bị OpenAlex tách đôi (khác mã, không mâu thuẫn ORCID). Chỉ ĐỀ XUẤT; việc gộp thật qua data/corrections.json (merge).
//   node scripts/find-split.mjs            -> data/split-candidates.json (A: gộp chắc, B: cần người duyệt) + public/data/_split-review.json (cho trang duyệt ở quản trị)
// Tầng A: tên trùng (cùng bộ từ), cùng đơn vị, đúng một hồ sơ có ORCID, cùng ngành, KHÔNG có công trình chung (DOI/nhan đề), năm công bố bổ sung nhau, và không còn người thứ ba trùng tên trong toàn bộ dữ liệu.
// Công trình chung nghĩa là hai người khác nhau (một người không thể là hai tác giả của cùng một bài) nên loại khỏi cả A lẫn B.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const D = JSON.parse(readFileSync("public/data/profind.json", "utf8")), C = JSON.parse(readFileSync("data/corrections.json", "utf8"));
const done = new Set(C.merge.flatMap((m) => [m.into, ...m.from])), rej = new Set(existsSync("data/split-rejected.json") ? JSON.parse(readFileSync("data/split-rejected.json", "utf8")).map((p) => [...p].sort().join("|")) : []);
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
const key = (n) => [...norm(n).split(" ").filter(Boolean)].sort().join(" ");
const normT = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const all = new Map(); for (const a of D.authors) { const k = key(a.name); if (k.split(" ").length >= 2) (all.get(k) ?? all.set(k, []).get(k)).push(a); }
const wcache = new Map(), works = (id) => { if (!wcache.has(id)) { let w = []; try { w = JSON.parse(readFileSync(`public/data/works/${id}.json`, "utf8")); } catch { /* không có */ } wcache.set(id, w); } return wcache.get(id); };
const iName = new Map(D.institutions.map((i) => [i.id, i.name]));
const side = (a) => { const w = works(a.id); return { id: a.id, name: a.name, orcid: a.orcid, inst: a.institutions.map((i) => iName.get(i) ?? i).slice(0, 3), works: a.worksCount, cites: a.citations, years: [a.firstYear, a.lastYear], pro: a.pro, top: [...w].sort((x, y) => y.citations - x.citations).slice(0, 3).map((x) => ({ t: String(x.title ?? "").slice(0, 140), y: x.year, d: x.doi })) }; };
const hold = new Set(existsSync("data/split-hold.json") ? JSON.parse(readFileSync("data/split-hold.json", "utf8")).map((h) => [...h.pair].sort().join("|")) : []); // cặp đã xem xét thủ công và giữ ở tầng B
const out = [];
for (const g of all.values()) { const eligible = g.filter((a) => !a.suspect && !a.demo && !done.has(a.id));
  for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
    const x = eligible[i], y = eligible[j]; if (rej.has([x.id, y.id].sort().join("|"))) continue;
    if (x.orcid && y.orcid && x.orcid !== y.orcid) continue;
    const inst = x.institutions.filter((s) => y.institutions.includes(s)); if (!inst.length) continue;
    const wx = works(x.id), wy = works(y.id), dx = new Set(wx.map((w) => w.doi).filter(Boolean)), tx = new Set(wx.map((w) => normT(w.title)).filter((t) => t.length > 12));
    const sharedDoi = wy.filter((w) => w.doi && dx.has(w.doi)).length, sharedTitle = wy.filter((w) => tx.has(normT(w.title))).length;
    if (sharedDoi || sharedTitle) continue; // có bài chung => hai người khác nhau
    const yx = new Set(wx.map((w) => w.year)), yy = new Set(wy.map((w) => w.year)), small = Math.min(yx.size, yy.size) || 1;
    const overlap = [...yx].filter((v) => yy.has(v)).length / small; // 0 = hoàn toàn bổ sung, 1 = trùng hết
    const sameName = key(x.name) === key(y.name) && norm(x.name) === norm(y.name);
    const exactlyOneOrcid = !!x.orcid !== !!y.orcid;
    const third = g.length > 2;
    const tier = !hold.has([x.id, y.id].sort().join("|")) && !third && sameName && exactlyOneOrcid && overlap <= 0.5 && wx.length >= 2 && wy.length >= 2 && norm(x.name).split(" ").length >= 3 && x.disciplines.some((d) => y.disciplines.includes(d)) ? "A" : "B"; // đủ bằng chứng (≥2 công trình mỗi bên) tên đủ đặc trưng (≥3 từ) và cùng ngành
    out.push({ tier, a: x.id, b: y.id, name: x.name === y.name ? x.name : `${x.name} / ${y.name}`, groupSize: g.length, overlap: Math.round(overlap * 100) / 100, sameName, exactlyOneOrcid, shared: inst.map((s) => iName.get(s) ?? s), A: side(x), B: side(y) });
  } }
out.sort((p, q) => p.tier.localeCompare(q.tier) || p.groupSize - q.groupSize || (q.A.works + q.B.works) - (p.A.works + p.B.works));
writeFileSync("data/split-candidates.json", JSON.stringify(out, null, 1));
writeFileSync("public/data/_split-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), pairs: out.filter((p) => p.tier === "B") }));
console.log(`Tầng A (gộp chắc): ${out.filter((p) => p.tier === "A").length}; tầng B (cần duyệt): ${out.filter((p) => p.tier === "B").length}.`);
