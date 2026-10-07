// Lưu/khôi phục bộ nhớ đệm nạp (data/raw/*.json + author-meta.json) vào data/cache/raw-cache.tgz để chạy tiếp ở máy/phiên khác.
//   node scripts/cache.mjs save | restore
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
const cmd = process.argv[2];
if (cmd === "save") { mkdirSync("data/cache", { recursive: true }); execSync("tar -C data -czf data/cache/raw-cache.tgz raw author-meta.json"); console.log("Đã lưu data/cache/raw-cache.tgz"); }
else if (cmd === "restore") { if (!existsSync("data/cache/raw-cache.tgz")) throw new Error("Không có data/cache/raw-cache.tgz"); execSync("tar -C data -xzf data/cache/raw-cache.tgz"); console.log("Đã khôi phục data/raw và author-meta.json"); }
else console.log("Dùng: node scripts/cache.mjs save|restore");
