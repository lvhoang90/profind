// Thử public/data/related.json (scripts/build-related.mjs): mỗi ngành có tối đa 40 bài và 20 tạp chí, bài có DOI và hạng, tạp chí Q1/Q2, không trùng.
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("public/data/related.json", "utf8")), eq = (a, b, m) => { if (a !== b) { console.error(`FAIL ${m}: ${a} !== ${b}`); process.exit(1); } };
const ks = Object.keys(d.f); eq(ks.length >= 20, true, "đủ ngành"); eq(!!d.meta.built, true, "có ngày dựng");
for (const k of ks) { const { a, j } = d.f[k];
  eq(a.length <= 40 && j.length <= 20, true, `${k}: giới hạn`); eq(new Set(a.map((x) => x.d)).size, a.length, `${k}: DOI không trùng`); eq(new Set(j.map((x) => x.i)).size, j.length, `${k}: ISSN không trùng`);
  for (const x of a) { eq(!!x.d && !!x.t && x.y >= 2021 && /^Q[1-4]$/.test(x.q), true, `${k}: bài hợp lệ`); }
  for (const x of j) eq(["Q1", "Q2"].includes(x.q) && x.n > 0 && /^\d{4}-\d{3}[\dXx]$/.test(x.i), true, `${k}: tạp chí hợp lệ ${x.i}`); }
console.log(`related: ${ks.length} ngành ok`);
