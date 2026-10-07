// Nhập các trang "Danh sách các cơ sở giáo dục" của Bộ GD&ĐT (moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc) đã LƯU thành HTML.
//   node scripts/import-moet.mjs <trang1.html> [trang2.html ...]     (chạy nhiều lần được: gộp theo mã mục MOET)
// Ghi data/moet.json: { items: [{ stt, name, code, url }] }. Cột tỉnh/loại hình/loại trường của trang MOET thường để trống (nạp bằng JavaScript),
// nên chỉ lấy tên, ký hiệu (mã trường) và liên kết. import-institutions.mjs đọc tệp này để gắn moetCode/official và báo các trường chưa khớp.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const files = process.argv.slice(2); if (!files.length) throw new Error("Truyền ít nhất một tệp HTML của trang danh sách MOET.");
const un = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const out = existsSync("data/moet.json") ? JSON.parse(readFileSync("data/moet.json", "utf8")) : { meta: {}, items: [] };
const key = (x) => x.url || x.name;
const have = new Map(out.items.map((x) => [key(x), x]));
let added = 0;
for (const f of files) {
  const h = readFileSync(f, "utf8");
  for (const tr of h.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const a = tr.match(/<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"/); if (!a) continue;
    const cells = (tr.match(/<td[\s\S]*?<\/td>/g) ?? []).map((c) => un(c.replace(/<[^>]+>/g, " ")));
    const item = { stt: +cells[0] || null, name: un(a[2]), code: cells[2] || null, url: a[1].replace(/%3F/gi, "?"), province: cells[3] || null, kind: cells[4] || null, level: cells[5] || null };
    if (!have.has(key(item))) { have.set(key(item), item); added++; }
  }
}
out.items = [...have.values()].sort((a, b) => (a.stt ?? 1e9) - (b.stt ?? 1e9));
out.meta = { source: "https://moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc", imported: new Date().toISOString().slice(0, 10), count: out.items.length, sttRange: [out.items[0]?.stt, out.items.at(-1)?.stt] };
writeFileSync("data/moet.json", JSON.stringify(out, null, 1));
// Gắn mã trường chính thức vào data/institutions.json tại chỗ (không dựng lại danh sách, nên không làm đổi mã đơn vị đang được tác giả tham chiếu).
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\btp\.? ?hcm\b|\btp\.? ho chi minh\b/g, "thanh pho ho chi minh").replace(/[^a-z0-9]+/g, " ").replace(/\b(truong|the)\b/g, " ").replace(/\s+/g, " ").trim();
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")), byKey = new Map();
for (const i of I.institutions) for (const n of [i.name, i.en]) { const k = norm((n ?? "").replace(/\s*\([^)]*\)\s*$/, "")); if (k && !byKey.has(k)) byKey.set(k, i); }
let matched = 0; const unmatched = [];
for (const m of out.items) { const i = byKey.get(norm(m.name)); if (i) { if (!i.moetCode) matched++; Object.assign(i, { moetCode: m.code, moetUrl: m.url, official: true }); } else unmatched.push({ stt: m.stt, name: m.name, code: m.code }); }
I.meta.moet = { matched: I.institutions.filter((i) => i.official).length, of: out.items.length };
writeFileSync("data/institutions.json", JSON.stringify(I, null, 1));
writeFileSync("data/moet.unmatched.json", JSON.stringify(unmatched, null, 1));
console.log(`Gắn vào institutions.json: ${I.meta.moet.matched} đơn vị có mã MOET; ${unmatched.length} trường MOET chưa khớp (data/moet.unmatched.json)`);
console.log(`moet.json: +${added}, tổng ${out.items.length} (STT ${out.meta.sttRange.join("–")})`);
