// Chỉ mục tìm kiếm tên công trình: public/data/wsearch/ (bản ghi chia khối theo trích dẫn giảm dần + chỉ mục ngược chia mảnh theo băm từ).
// Chạy sau build-index.mjs (refresh.mjs đã gọi). Trình duyệt chỉ tải vài mảnh nhỏ cho mỗi lượt tìm.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[‐-―−_.,;:()/\\-]+/g, " ").replace(/[  -​  　]/g, " ").replace(/\s+/g, " ").trim();
export const shardOf = (t, n = 128) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h % n; };
const CH = 500, NS = 128;
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const ok = new Map(P.authors.filter((a) => a.foreign === false && !a.suspect).map((a) => [a.id, a.name]));
const best = new Map();
for (const f of readdirSync("public/data/works")) {
  const id = f.replace(".json", ""); if (!ok.has(id)) continue;
  for (const w of JSON.parse(readFileSync(`public/data/works/${f}`, "utf8"))) {
    if (!w.title || String(w.title).length < 8) continue;
    const k = w.doi ? `d:${String(w.doi).toLowerCase()}` : `t:${norm(w.title)}`;
    const cur = best.get(k), lead = w.role === "lead" ? 1 : 0;
    if (!cur || lead > cur.lead || (lead === cur.lead && w.citations > cur.c)) best.set(k, { t: w.title, y: w.year, j: w.journal ?? "", c: w.citations ?? 0, d: w.doi ?? "", a: id, n: ok.get(id), lead });
  }
}
const recs = [...best.values()].sort((x, y) => y.c - x.c || y.y - x.y);
rmSync("public/data/wsearch", { recursive: true, force: true }); mkdirSync("public/data/wsearch", { recursive: true });
const shards = Array.from({ length: NS }, () => new Map());
recs.forEach((r, id) => {
  const seen = new Set(norm(r.t).split(" ").filter((w) => w.length > 1));
  for (const w of seen) { const m = shards[shardOf(w, NS)]; let l = m.get(w); if (!l) m.set(w, (l = [])); l.push(id); }
});
for (let i = 0; i * CH < recs.length; i++) writeFileSync(`public/data/wsearch/r${i}.json`, JSON.stringify(recs.slice(i * CH, (i + 1) * CH).map((r) => [r.t, r.y, r.j, r.c, r.d, r.a, r.n])));
shards.forEach((m, i) => { const o = {}; for (const [w, l] of m) { let p = 0; o[w] = l.map((v) => { const d = v - p; p = v; return d; }); } writeFileSync(`public/data/wsearch/p${i}.json`, JSON.stringify(o)); });
writeFileSync("public/data/wsearch/meta.json", JSON.stringify({ n: recs.length, ch: CH, ns: NS, built: new Date().toISOString().slice(0, 10) }));
console.log(`wsearch: ${recs.length} công trình, ${Math.ceil(recs.length / CH)} khối, ${NS} mảnh.`);
