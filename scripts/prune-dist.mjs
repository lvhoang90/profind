// Sau khi dựng: bỏ các tệp tạm dưới dist/data/_*.json không có trang nào đọc (chỉ giữ hai tệp trang quản trị đọc), để không phát công khai và giảm dung lượng triển khai.
import { readdirSync, rmSync, existsSync } from "fs";
const KEEP = new Set(["_split-review.json", "_multi-review.json"]);
if (existsSync("dist/data")) for (const f of readdirSync("dist/data")) if (/^_.*\.json$/.test(f) && !KEEP.has(f)) { rmSync(`dist/data/${f}`); console.log("bỏ khỏi dist:", f); }
