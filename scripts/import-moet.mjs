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
const STOP = new Set(["dai", "hoc", "vien", "university", "institute", "of", "and", "viet", "nam", "quoc", "gia"]);
const toks = (x) => new Set(norm(x).split(" ").filter((t) => t && !STOP.has(t)));
// Tách tên trường thành viên: "TRƯỜNG ĐẠI HỌC KINH TẾ, ĐẠI HỌC HUẾ" -> base "đại học kinh tế", parent "đại học huế"
const split = (name) => { const m = name.match(/^(.*?)(?:,\s*|\s+-\s+)(đại học [^,]+|đại học quốc gia[^,]*)$/i); return m ? { base: m[1], parent: norm(m[2]) } : { base: name, parent: null }; };
const parentOf = (i) => { const m = (i.name ?? "").match(/\(([^)]*)\)\s*$/); const p = m ? norm(m[1]) : ""; return /dhqghn|dhqg hn/.test(p) ? "dai hoc thanh pho ha noi" : /dhqg hcm|dhqghcm/.test(p) ? "dhqg hcm" : p; };
let matched = 0; const unmatched = [], newInst = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "ProFind/0.1 (+https://github.com/lvhoang90/profind)" };
const rorSearch = async (q) => { try { const r = await fetch(`https://api.ror.org/v2/organizations?query=${encodeURIComponent(q)}`, { headers: UA }); if (!r.ok) return null; const a = toks(q), nq = norm(q); for (const o of (await r.json()).items ?? []) { if (o.locations?.[0]?.geonames_details?.country_code !== "VN") continue; for (const n of o.names) { if (norm(n.value) === nq) return o; const t = toks(n.value); let k = 0; for (const x of a) if (t.has(x)) k++; if (a.size >= 2 && k / (a.size + t.size - k) >= 0.8) return o; } } } catch { /* bỏ qua */ } return null; };
const title = (n) => n.replace(/\s+/g, " ").trim().toLowerCase().replace(/(^|[\s(\-,.])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()).replace(/\bTp\./g, "TP.").replace(/\bĐhqg\b/gi, "ĐHQG");
const usedIds = new Set(I.institutions.map((i) => i.id));
const uid = (x) => { let b = norm(x).replace(/ /g, "-") || "dv", i = b, n = 2; while (usedIds.has(i)) i = `${b}-${n++}`; usedIds.add(i); return i; };
for (const m of out.items) {
  const { base, parent } = split(m.name);
  let i = byKey.get(norm(m.name)) ?? (parent ? null : null);
  if (!i && parent) i = I.institutions.find((x) => parentOf(x) === parent && norm(x.name.replace(/\s*\([^)]*\)\s*$/, "")) === norm(base));
  if (!i) { // khớp mờ theo từ khóa (≥ 0.85) trên tên đã bỏ phần đại học chủ quản, chỉ khi duy nhất
    const a = toks(base); if (a.size >= 2) { const c = I.institutions.filter((x) => { const t = toks(x.name.replace(/\s*\([^)]*\)\s*$/, "")); let k = 0; for (const y of a) if (t.has(y)) k++; return k / (a.size + t.size - k) >= 0.85 && (!parent || !parentOf(x) || parentOf(x) === parent); }); if (c.length === 1) i = c[0]; }
  }
  if (i) { if (!i.moetCode) matched++; Object.assign(i, { moetCode: m.code, moetUrl: m.url, official: true }); continue; }
  // Chưa có trong danh sách: thêm làm đơn vị chính thức (loại suy từ tên; MOET không cung cấp công lập/tư thục trong tệp lưu)
  const up = m.name.toUpperCase();
  const type = /CAO ĐẲNG/.test(up) ? "college" : /^(VIỆN|VIÊN)/.test(up) ? "institute" : /TƯ THỤC|DÂN LẬP/.test(up) ? "private-univ" : "university-unclassified";
  const o = await rorSearch(base); await sleep(250);
  const nm = /^[A-ZÀ-Ỹ0-9 ,.\-–()]+$/.test(m.name) ? title(m.name) : m.name;
  const rec = { id: uid(m.code ?? m.name), name: nm, en: o ? o.names.find((n) => n.types.includes("ror_display"))?.value ?? nm : nm, abbr: m.code ?? null, type, managedBy: null, city: null, ror: o?.id ?? null, source: "moet.gov.vn", moetCode: m.code, moetUrl: m.url, official: true };
  I.institutions.push(rec); newInst.push(rec); unmatched.push({ stt: m.stt, name: m.name, code: m.code, ror: rec.ror });
}
I.types["university-unclassified"] ??= { vi: "Đại học (chưa phân loại công/tư)", en: "University (public/private not classified)" };
I.meta.moet = { matched: I.institutions.filter((i) => i.official).length, of: out.items.length, added: newInst.length, addedWithRor: newInst.filter((x) => x.ror).length };
I.meta.count = I.institutions.length; I.meta.withRor = I.institutions.filter((i) => i.ror).length;
writeFileSync("data/institutions.json", JSON.stringify(I, null, 1));
writeFileSync("data/moet.unmatched.json", JSON.stringify(unmatched, null, 1));
console.log(`MOET ${out.items.length}: gắn vào ${matched} đơn vị sẵn có, thêm mới ${newInst.length} (${I.meta.moet.addedWithRor} có ROR). Tổng ${I.meta.count} đơn vị, ${I.meta.moet.matched} có mã MOET.`);
console.log(`moet.json: +${added}, tổng ${out.items.length} (STT ${out.meta.sttRange.join("–")})`);
