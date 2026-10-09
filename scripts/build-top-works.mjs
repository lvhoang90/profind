// Công trình nổi bật (cho trang chủ): public/data/top-works.json là KHO các công trình có trên 1000 trích dẫn (kèm ngành của tác giả để chọn theo ngành người dùng đã khai); trang chủ bốc ngẫu nhiên mỗi lần mở. Chạy sau build-index.mjs (refresh.mjs đã gọi).
//   node scripts/build-top-works.mjs
// Chỉ lấy công trình mà tác giả là tác giả chính (đứng đầu hoặc liên hệ duy nhất), thuộc hồ sơ trong phạm vi Việt Nam và không nghi gộp nhầm,
// để các bài của nhóm hàng nghìn tác giả (đồng tác giả) không lấn át; mỗi công trình chỉ xuất hiện một lần.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const ok = new Map(P.authors.filter((a) => a.rankable).map((a) => [a.id, a.name])), disc = new Map(P.authors.map((a) => [a.id, a.disciplines ?? []]));
const all = [], seen = new Set();
for (const f of readdirSync("public/data/works")) {
  const id = f.replace(".json", ""); if (!ok.has(id)) continue;
  for (const w of JSON.parse(readFileSync(`public/data/works/${f}`, "utf8"))) {
    if (w.role !== "lead" || !(w.citations > 0) || String(w.title).trim().toLowerCase() === String(w.journal).trim().toLowerCase()) continue;
    all.push({ t: w.title, y: w.year, j: w.journal, d: w.doi ?? null, c: w.citations, a: id, n: ok.get(id), f: [...new Set([w.scoreDiscipline, ...(disc.get(id) ?? [])].filter(Boolean))], w: String(w.id).split("-").pop() });
  }
}
all.sort((x, y) => y.c - x.c);
const top = []; for (const w of all) { const k = (w.d ?? w.t.toLowerCase().replace(/\W+/g, " ")).trim(); if (seen.has(k)) continue; seen.add(k); top.push(w); if (w.c < 1000 || top.length >= 400) break; }
writeFileSync("public/data/top-works.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), works: top }));
console.log(`top-works.json: ${top.length} công trình, cao nhất ${top[0]?.c} trích dẫn.`);
