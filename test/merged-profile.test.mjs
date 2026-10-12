// Thử hồ sơ gộp theo ORCID (scripts/build-index.mjs): h-index không bị kéo xuống bởi hồ sơ đích nhỏ, Google Scholar khai theo mã hồ sơ gốc vẫn hiện ở hồ sơ đích.
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync("public/data/profind.json", "utf8")).authors, eq = (a, b, m) => { if (a !== b) { console.error(`FAIL ${m}: ${a} !== ${b}`); process.exit(1); } };
const d = A.find((a) => a.id === "A5108957051"); // Tran Van Dat: ORCID trùng với A5059355361 (34 công trình, h = 11)
eq(d.hIndex >= 11, true, "h-index lấy từ hồ sơ gốc gộp"); eq(d.scholar, "WKGZDXIAAAAJ", "Scholar chuyển sang hồ sơ đích"); eq(d.scholarCit, 1864, "số trích dẫn Scholar");
eq(A.filter((a) => a.hIndex === 0 && a.citations > 100).length, 0, "không có hồ sơ h = 0 mà trên 100 trích dẫn");
console.log("merged-profile: ok");
