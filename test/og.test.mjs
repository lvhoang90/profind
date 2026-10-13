// Thử ảnh chia sẻ (public/og.jpg, sinh bằng scripts/build-icons.mjs --png): số ghi trên ảnh (public/og.json) phải khớp dữ liệu hiện hành, làm tròn xuống nghìn.
import { readFileSync } from "node:fs";
const M = JSON.parse(readFileSync("public/data/profind.json", "utf8")).meta, og = JSON.parse(readFileSync("public/og.json", "utf8"));
const want = { authors: Math.floor(M.authors / 1000) * 1000, works: Math.floor(M.works / 1000) * 1000 };
for (const k of ["authors", "works"]) if (og[k] !== want[k]) { console.error(`FAIL og.${k}: ảnh chia sẻ ghi ${og[k]}, dữ liệu là ${want[k]}. Chạy: PLAYWRIGHT_PATH=<playwright> node scripts/build-icons.mjs --png`); process.exit(1); }
console.log("og: ok");
