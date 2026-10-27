// Gắn nhãn "có trong Scopus" cho tạp chí theo ISSN, chỉ để HIỂN THỊ; không tính điểm.
//   node scripts/import-scopus.mjs [--file data/scopus/scopus-sources-2026-09.csv] [--note "ghi chú nguồn/ngày"]
// Đầu vào: CSV rút gọn từ tệp "Scopus Sources" (Elsevier, tải miễn phí ở scopus.com/sources): giữ cột Source Title, ISSN, EISSN, Active or Inactive, Source Type. Quản trị viên tải và đặt vào data/scopus/ (đã .gitignore, KHÔNG commit).
// Đầu ra: public/data/scopus.json = { meta, by: { ISSN: "A" | "I" } }, chỉ ISSN có trong công trình của ProFind.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { arg } from "./lib/cli.mjs";
import { scopusStatus } from "./lib/scopus.mjs";

const latest = existsSync("data/scopus") ? readdirSync("data/scopus").filter((f) => /\.csv$/i.test(f)).sort().pop() : null;
const file = arg("file", latest ? `data/scopus/${latest}` : "");
if (!file || !existsSync(file)) { console.log("Chưa có CSV danh sách nguồn Scopus trong data/scopus/."); process.exit(0); }
const keep = new Set();
for (const f of readdirSync("public/data/works").filter((x) => x.endsWith(".json"))) for (const ws of Object.values(JSON.parse(readFileSync(`public/data/works/${f}`, "utf8")))) for (const w of ws) if (w.issn) keep.add(w.issn);
const by = scopusStatus(readFileSync(file, "utf8"), keep), vals = Object.values(by);
writeFileSync("public/data/scopus.json", JSON.stringify({ meta: { source: "Elsevier Scopus Sources (danh sách do quản trị viên tải)", built: new Date().toISOString().slice(0, 10), file: file.split("/").pop(), note: "Chỉ hiển thị việc tạp chí có trong danh sách nguồn Scopus; không tính điểm." + (arg("note") ? " " + arg("note") : "") }, by }));
console.log(`scopus.json: ${vals.length} ISSN trong công trình của ProFind có trong danh sách (đang lập chỉ mục ${vals.filter((v) => v === "A").length}, đã ngừng ${vals.filter((v) => v === "I").length}).`);
