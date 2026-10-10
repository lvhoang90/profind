// Chỉ mục nhẹ cho bước "Nhà khoa học này có phải bạn?" sau đăng ký: public/data/suggest.json. Chạy sau build-index.mjs.
//   node scripts/build-suggest-index.mjs
// a: [mã, tên, [đơn vị], số công trình, trích dẫn, năm cuối, ORCID, Top 2% (0/1), điểm PRO-SCORE]; i: mã đơn vị -> [tên, viết tắt]; d: tên miền email -> [mã đơn vị].
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const ascii = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
const used = new Set(), a = [];
for (const x of P.authors) {
  if (!(x.worksCount > 0) || x.demo) continue;
  a.push([x.id, x.name, x.institutions ?? [], x.worksCount, x.citations ?? 0, x.lastYear ?? 0, x.orcid ?? "", x.top2 ? 1 : 0, x.pro ?? null]);
  for (const i of x.institutions ?? []) used.add(i);
}
const i = {}; for (const u of P.institutions) if (used.has(u.id)) i[u.id] = [u.name, u.abbr ?? ""];
const d = {};
for (const u of P.institutions) { const k = ascii(u.abbr); if (u.abbr && k.length >= 3 && /^[a-z0-9]+$/.test(k) && used.has(u.id)) (d[`${k}.edu.vn`] ??= []).push(u.id); }
if (existsSync("data/email-domains.json")) { const m = JSON.parse(readFileSync("data/email-domains.json", "utf8")); for (const [k, v] of Object.entries(m)) if (!k.startsWith("_")) d[k] = [...new Set([...(d[k] ?? []), ...v.filter((x) => P.institutions.some((u) => u.id === x))])]; }
writeFileSync("public/data/suggest.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), i, d, a }));
console.log(`suggest.json: ${a.length} tác giả, ${Object.keys(i).length} đơn vị, ${Object.keys(d).length} tên miền.`);
