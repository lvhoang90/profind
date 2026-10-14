// Gắn chỉ mục Web of Science (SCIE, SSCI, AHCI, ESCI) cho tạp chí theo ISSN, chỉ để HIỂN THỊ nhãn; chưa tính điểm (quy tắc điểm ESCI/IF theo từng ngành của HĐGSNN xử lý riêng).
//   node scripts/import-wos.mjs [--dir data/wos]
// Đầu vào: các tệp CSV danh sách tạp chí của Clarivate (Master Journal List, mục tải danh sách theo bộ sưu tập), mỗi tệp một chỉ mục, tên tệp chứa scie / ssci / ahci / esci. Quản trị viên tự tải (theo điều khoản của Clarivate), đặt vào data/wos/ (đã .gitignore, KHÔNG commit).
// Đầu ra: public/data/wos.json = { meta, by: { ISSN: ["ESCI", ...] } }, chỉ ISSN có trong công trình của ProFind (gọn, tải khi cần).
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { arg } from "./lib/cli.mjs";
import { indexOfFile, mergeLists } from "./lib/wos.mjs";

const dir = arg("dir", "data/wos");
if (!existsSync(dir)) { console.log(`Chưa có thư mục ${dir}: tải danh sách SCIE/SSCI/AHCI/ESCI (CSV) từ Clarivate Master Journal List rồi đặt vào đó.`); process.exit(0); }
const files = readdirSync(dir).filter((f) => /\.csv$/i.test(f)), lists = [];
for (const f of files) { const index = indexOfFile(f); if (!index) { console.warn(`Bỏ qua ${f}: tên tệp không chứa scie/ssci/ahci/esci.`); continue; } lists.push({ index, text: readFileSync(`${dir}/${f}`, "utf8"), file: f }); }
if (!lists.length) { console.log("Không có tệp CSV hợp lệ."); process.exit(0); }

const keep = new Set();
for (const f of readdirSync("public/data/works").filter((x) => x.endsWith(".json"))) for (const ws of Object.values(JSON.parse(readFileSync(`public/data/works/${f}`, "utf8")))) for (const w of ws) if (w.issn) keep.add(w.issn);
const by = mergeLists(lists, keep), n = Object.keys(by).length, cnt = {};
for (const v of Object.values(by)) for (const i of v) cnt[i] = (cnt[i] ?? 0) + 1;
writeFileSync("public/data/wos.json", JSON.stringify({ meta: { source: "Clarivate Web of Science Master Journal List (danh sách do quản trị viên tải)", built: new Date().toISOString().slice(0, 10), files: lists.map((l) => l.file), note: "Chỉ hiển thị chỉ mục của tạp chí; chưa tính điểm." }, by }));
console.log(`wos.json: ${n} ISSN trong công trình của ProFind có chỉ mục (${Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(", ")}) từ ${lists.length} tệp.`);
