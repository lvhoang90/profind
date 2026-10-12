// Lấy họ/tên khai báo trên ORCID (given-names, family-name) cho mọi hồ sơ có ORCID, lưu data/orcid-names.json (bộ đệm; chỉ gọi những ORCID chưa có).
// Dùng bởi scripts/normalize-names.mjs để đưa tên Việt về thứ tự "Họ + tên đệm + tên". ORCID công khai, không tốn hạn mức OpenAlex.
import { readFileSync, writeFileSync, existsSync } from "fs";
const src = process.argv[2] ?? "data/raw-authors.json"; // tên gốc OpenAlex (chưa qua build-index)
const cacheF = "data/orcid-names.json";
const cache = existsSync(cacheF) ? JSON.parse(readFileSync(cacheF, "utf8")) : {};
const orcids = [...new Set(JSON.parse(readFileSync(src, "utf8")).authors.map((a) => a.orcid).filter(Boolean))].filter((o) => !(o in cache));
console.log(`Cần đọc ${orcids.length} ORCID (đã có ${Object.keys(cache).length}).`);
let i = 0, done = 0;
async function w() {
  while (i < orcids.length) {
    const o = orcids[i++];
    for (let t = 0; t < 4; t++) {
      try {
        const r = await fetch(`https://pub.orcid.org/v3.0/${o}/person`, { headers: { Accept: "application/json" } });
        if (r.status === 404 || r.status === 409) { cache[o] = null; break; }
        if (!r.ok) { await new Promise((s) => setTimeout(s, 1500 * (t + 1))); continue; }
        const j = await r.json();
        cache[o] = { given: j.name?.["given-names"]?.value ?? "", family: j.name?.["family-name"]?.value ?? "" };
        break;
      } catch { await new Promise((s) => setTimeout(s, 1000)); }
    }
    if (++done % 2000 === 0) { console.log(done); writeFileSync(cacheF, JSON.stringify(cache)); }
  }
}
await Promise.all(Array.from({ length: 8 }, w));
writeFileSync(cacheF, JSON.stringify(cache));
console.log(`Xong: ${Object.keys(cache).length} ORCID trong bộ đệm.`);
