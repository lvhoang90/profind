// Dò công trình NGHI GÁN NHẦM tác giả: OpenAlex đôi khi gộp hai người trùng tên vào một hồ sơ (hồ sơ có >= 2 ORCID quan sát được).
//   A (chắc chắn) = ORCID ghi trên chính công trình là của người khác (scripts/fetch-orcid-per-work.mjs).
//   B (cần xem)  = công trình không có ORCID, nhưng cơ quan trùng với nhóm công trình của "người kia" và/hoặc tiêu đề/tạp chí giống nhóm đó hơn nhóm của chủ hồ sơ.
// Chỉ xét hồ sơ có ít nhất một công trình loại A. Ghi public/data/_misattributed.json cho quản trị viên duyệt (gợi ý, không tự loại).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const STOP = new Set("the and for with from that this are was were into using based study analysis effect effects its their between among via use new one two case review nghien cuu cac cua cho trong voi mot nhung duoc tai theo den tren nam".split(" "));
const tok = (t) => { const w = fold(t).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((x) => x.length > 3 && !STOP.has(x)); return [...new Set([...w, ...w.slice(1).map((x, i) => `${w[i]}_${x}`)])]; };
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), OW = JSON.parse(readFileSync("data/raw/_orcidwork.json", "utf8"));
const AU = existsSync("data/raw/_authorship.json") ? JSON.parse(readFileSync("data/raw/_authorship.json", "utf8")) : {};
const byA = new Map(); for (const k of Object.keys(OW)) { const a = k.split("-")[0]; byA.set(a, true); }
const out = [], prof = [];
for (const a of P.authors) {
  if (!byA.has(a.id) || !a.orcid) continue; let w; try { w = JSON.parse(readFileSync(`public/data/works/${a.id}.json`, "utf8")); } catch { continue; } w = w.works ?? w;
  const items = w.map((x) => ({ x, o: OW[x.id] ?? "", keys: AU[x.id]?.[0] ?? [], t: tok(`${x.title} ${x.journal ?? ""}`) }));
  const F = items.filter((i) => i.o && i.o !== a.orcid); if (!F.length) continue;
  const O = items.filter((i) => !F.includes(i) && i.o === a.orcid), U = items.filter((i) => !F.includes(i) && i.o !== a.orcid);
  prof.push({ a, items, F, O, U });
}
// tần suất từ trong các hồ sơ xét (idf)
const df = new Map(); let N = 0; for (const p of prof) for (const i of p.items) { N++; for (const t of i.t) df.set(t, (df.get(t) ?? 0) + 1); }
const idf = (t) => Math.log(1 + N / (df.get(t) ?? 1));
const vec = (its) => { const c = new Map(); for (const i of its) for (const t of i.t) c.set(t, (c.get(t) ?? 0) + idf(t)); return c; };
const cos = (ts, c, cn) => { let dot = 0, qn = 0; for (const t of ts) { const q = idf(t); qn += q * q; dot += q * (c.get(t) ?? 0); } return dot / ((Math.sqrt(qn) || 1) * (cn || 1)); };
const norm = (c) => Math.sqrt([...c.values()].reduce((s, v) => s + v * v, 0));
for (const { a, F, O, U, items } of prof) {
  for (const i of F) out.push({ kind: "A", author: a.id, name: a.name, wid: i.x.id, doi: i.x.doi, title: i.x.title, journal: i.x.journal, year: i.x.year, score: i.x.score ?? null, role: i.x.role, why: `ORCID ghi trên bài là ${i.o}, khác ${a.orcid}`, nWorks: items.length });
  const fv = vec(F), fn = norm(fv), ownSeeds = O.length >= 2 ? O : items.filter((i) => !F.includes(i)), ov = vec(ownSeeds), on = norm(ov), fk = new Set(F.flatMap((i) => i.keys)), ok = new Set(ownSeeds.flatMap((i) => i.keys));
  for (const i of U) {
    const sf = cos(i.t, fv, fn), so = cos(i.t, ov, on), kf = i.keys.some((k) => fk.has(k) && !ok.has(k)), ko = i.keys.some((k) => ok.has(k));
    if ((kf && !ko && sf >= so) || (!i.keys.length && sf >= 0.12 && sf >= 2 * so) || (kf && sf >= 0.12 && sf >= so)) out.push({ kind: "B", author: a.id, name: a.name, wid: i.x.id, doi: i.x.doi, title: i.x.title, journal: i.x.journal, year: i.x.year, score: i.x.score ?? null, role: i.x.role, why: `không có ORCID trên bài; ${kf ? "cơ quan trùng nhóm bài của ORCID khác; " : ""}giống nhóm bài ORCID khác ${sf.toFixed(2)} so với nhóm của chủ hồ sơ ${so.toFixed(2)}`, nWorks: items.length });
  }
}
out.sort((x, y) => x.kind.localeCompare(y.kind) || (y.score ?? 0) - (x.score ?? 0));
writeFileSync("public/data/_misattributed.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), items: out }));
console.log(`Hồ sơ có ORCID khác ghi trên bài: ${prof.length}; A: ${out.filter((o) => o.kind === "A").length}, B: ${out.filter((o) => o.kind === "B").length} (có điểm: ${out.filter((o) => o.score).length}).`);
