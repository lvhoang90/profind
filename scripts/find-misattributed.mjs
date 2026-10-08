// Dò công trình NGHI GÁN NHẦM tác giả (OpenAlex gộp hai người trùng tên) bằng dữ liệu nguồn của từng công trình (scripts/fetch-authorship.mjs):
//   A = ORCID quan sát được trên công trình là của người khác (không có ORCID của tác giả);
//   B = cơ quan trên công trình không trùng cơ quan nào ở các công trình còn lại của tác giả VÀ tiêu đề/tạp chí lệch hẳn chủ đề hồ sơ.
// Ghi public/data/_misattributed.json cho quản trị viên duyệt (chỉ gợi ý, không tự loại công trình).
//   node scripts/find-misattributed.mjs [--min-works 6] [--max-sim 0.05]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? +process.argv[i + 1] : d; };
const MINW = arg("min-works", 6), MAXS = arg("max-sim", 0.05);
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const STOP = new Set("the and for with from that this are was were into using based study analysis effect effects its their between among via use new one two case review nghien cuu cac cua cho trong voi mot nhung duoc tai theo den tren nam".split(" "));
const tok = (t) => { const w = fold(t).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((x) => x.length > 3 && !STOP.has(x)); return [...new Set([...w, ...w.slice(1).map((x, i) => `${w[i]}_${x}`)])]; };
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), AU = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8"));
const rows = [], df = new Map(); let N = 0;
for (const a of P.authors) {
  if (a.suspect) continue; let w; try { w = JSON.parse(readFileSync(`public/data/works/${a.id}.json`, "utf8")); } catch { continue; } w = w.works ?? w;
  const items = w.map((x) => ({ x, au: AU[x.id], t: tok(`${x.title} ${x.journal ?? ""}`) })); if (items.filter((i) => i.au).length < MINW) continue;
  rows.push({ a, items }); N++; for (const t of new Set(items.flatMap((i) => i.t))) df.set(t, (df.get(t) ?? 0) + 1);
}
const idf = (t) => Math.log(1 + N / (df.get(t) ?? 1));
const out = [];
for (const { a, items } of rows) {
  const have = items.filter((i) => i.au), kc = new Map(), tc = new Map();
  for (const i of have) for (const k of new Set(i.au[0])) kc.set(k, (kc.get(k) ?? 0) + 1);
  for (const i of items) for (const t of i.t) tc.set(t, (tc.get(t) ?? 0) + 1);
  for (const it of have) {
    const [keys, cc, obs] = it.au; let kind = null, why = "";
    if (a.orcid && obs.length && !obs.includes(a.orcid)) { kind = "A"; why = `ORCID trên công trình là ${obs.join(", ")}, khác ${a.orcid}`; }
    else if (keys.length && have.length - 1 >= 5 && keys.every((k) => (kc.get(k) ?? 0) <= 1)) {
      let dot = 0, qn = 0, cn = 0; for (const [t, n0] of tc) { const n = n0 - (it.t.includes(t) ? 1 : 0); cn += (n * idf(t)) ** 2; } for (const t of it.t) { const q = idf(t); qn += q * q; dot += q * ((tc.get(t) ?? 0) - 1) * idf(t); }
      const sim = dot / ((Math.sqrt(qn) || 1) * (Math.sqrt(cn) || 1));
      if (sim <= MAXS && it.t.length >= 4) { kind = "B"; why = `cơ quan ${keys.join("/")}${cc.length ? ` (${cc.join(",")})` : ""} không trùng các công trình khác; độ giống chủ đề ${sim.toFixed(3)}`; }
    }
    if (kind) out.push({ kind, author: a.id, name: a.name, wid: it.x.id, doi: it.x.doi, title: it.x.title, journal: it.x.journal, year: it.x.year, score: it.x.score ?? null, role: it.x.role, why, nWorks: items.length });
  }
}
out.sort((x, y) => x.kind.localeCompare(y.kind) || (y.score ?? 0) - (x.score ?? 0));
writeFileSync("public/data/_misattributed.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), items: out }));
console.log(`Tác giả xét: ${rows.length}; nghi gán nhầm: ${out.length} (A: ${out.filter((o) => o.kind === "A").length}, B: ${out.filter((o) => o.kind === "B").length}; có điểm: ${out.filter((o) => o.score).length}).`);
