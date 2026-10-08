// Kiểm tra lại định kỳ các đơn vị chưa có dữ liệu mở (OpenAlex cập nhật cơ quan công tác liên tục). Không tự ghi vào dữ liệu chính:
//  1) dò lại mã ROR theo tên (khớp chặt) -> data/ror-map.json để người xem xét; 2) dò lại ứng viên theo chuỗi cơ quan -> data/affiliation-candidates.json (duyệt ở Quản trị -> Đơn vị mới).
//   node scripts/recheck-missing.mjs --mailto <email>
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"); if (!mailto || !process.env.OPENALEX_API_KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const run = (c) => execSync(c, { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
const prev = new Set((existsSync("data/affiliation-candidates.json") ? JSON.parse(readFileSync("data/affiliation-candidates.json", "utf8")) : []).map((c) => c.id));
run(`node scripts/map-ror-oa.mjs --mailto ${mailto}`);
run(`node scripts/affiliation-candidates.mjs --mailto ${mailto}`);
const now = JSON.parse(readFileSync("data/affiliation-candidates.json", "utf8")), map = existsSync("data/ror-map.json") ? JSON.parse(readFileSync("data/ror-map.json", "utf8")) : [];
const rep = { at: new Date().toISOString().slice(0, 10), rorMatches: map.length, candidates: now.length, newCandidates: now.filter((c) => !prev.has(c.id)).map((c) => c.name) };
writeFileSync("data/recheck-report.json", JSON.stringify(rep, null, 1)); console.log("Kiểm tra lại:", JSON.stringify(rep));
