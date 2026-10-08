// Danh sách đơn vị CHƯA có dữ liệu mở (để hiển thị trung thực trên website thay vì để trống): đơn vị trong data/institutions.json không có tác giả nào trong chỉ mục.
//   node scripts/build-nodata.mjs   -> public/data/no-data.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";
// Bản ghi trùng (data/unit-alias.json: cùng một trường có hai bản ghi) không tính riêng.
const AL = existsSync("data/unit-alias.json") ? JSON.parse(readFileSync("data/unit-alias.json", "utf8")).alias : {};
const D = JSON.parse(readFileSync("public/data/profind.json", "utf8")), I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => !AL[i.id] && i.type !== "other"); // bỏ bản ghi trùng và cơ sở tôn giáo
const have = new Set(D.authors.flatMap((a) => a.institutions)), pending = new Set((existsSync("data/ingest-pending.json") ? JSON.parse(readFileSync("data/ingest-pending.json", "utf8")) : []).map((x) => x.id));
const cand = new Map((existsSync("data/affiliation-candidates.json") ? JSON.parse(readFileSync("data/affiliation-candidates.json", "utf8")) : []).map((c) => [c.id, c]));
const rows = I.filter((i) => !have.has(i.id)).map((i) => ({ id: i.id, name: i.name, en: i.en ?? null, type: i.type, city: i.city ?? null, why: i.ror ? (pending.has(i.id) ? "pending" : "empty") : cand.has(i.id) ? "candidate" : "no-record" }));
// why: no-record = OpenAlex chưa có bản ghi đơn vị; empty = có bản ghi nhưng chưa có tác giả; pending = đang chờ nạp; candidate = có bài theo chuỗi cơ quan, chờ duyệt
writeFileSync("public/data/no-data.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), total: I.length, withData: I.length - rows.length, rows }));
console.log(`Đơn vị chưa có dữ liệu mở: ${rows.length}/${I.length}.`);
