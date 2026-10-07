// Kiểm tra mã ROR của từng đơn vị bằng cách đối chiếu CHẶT tên đơn vị (tiếng Việt, tiếng Anh) với mọi tên trong bản ghi ROR.
//   node scripts/audit-ror.mjs            (chỉ báo cáo -> data/ror-audit.json)
//   node scripts/audit-ror.mjs --fix      (đơn vị nghi ngờ: bỏ ror, ghi rorSuspect, xóa cache tác giả data/raw/<id>.json)
// Chặt = hai tập từ giống nhau (sau khi bỏ dấu, bỏ "trường", "the", "of") hoặc giao/hợp ≥ 0.9. Mã ROR dùng chung cho nhiều đơn vị luôn bị xem xét lại.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
const UA = { "User-Agent": "ProFind/0.1 (+https://github.com/lvhoang90/profind)" };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\btp\.? ?hcm\b|\btp\.? ho chi minh\b|\bho chi minh city\b/g, "thanh pho ho chi minh").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\b(truong|the|of|dai hoc|university)\b/g, " ").replace(/\s+/g, " ").trim();
const set = (s) => new Set(norm(s.replace(/\s*\([^)]*\)\s*$/, "")).split(" ").filter(Boolean));
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return a.size + b.size - i ? i / (a.size + b.size - i) : 0; };
const I = JSON.parse(readFileSync("data/institutions.json", "utf8"));
const uses = new Map(); for (const i of I.institutions) if (i.ror) (uses.get(i.ror) ?? uses.set(i.ror, []).get(i.ror)).push(i.id);
const cache = new Map(), rec = async (ror) => { if (cache.has(ror)) return cache.get(ror); let o = null; for (let t = 0; t < 3 && !o; t++) { try { const r = await fetch(`https://api.ror.org/v2/organizations/${ror.replace("https://ror.org/", "")}`, { headers: UA }); if (r.ok) o = await r.json(); } catch { /* thử lại */ } } cache.set(ror, o); return o; };
// Đơn vị đã được người kiểm tra xác nhận ĐÚNG dù tên khác (đổi tên, tên tiếng Anh khác tên Wikipedia).
const VERIFIED = new Set(["vnu-hanoi-university-science", "vnu-university-languages-and-international-studies", "skda", "hue-university-college-education"]);
const PRIO = { "seed+ror.org": 0, "vi.wikipedia.org": 1, "ror.org": 2, "moet.gov.vn": 3 };
const report = []; const fix = process.argv.includes("--fix");
for (const i of I.institutions) {
  if (!i.ror) continue;
  const o = await rec(i.ror); await new Promise((r) => setTimeout(r, 120));
  const rn = (o?.names ?? []).map((n) => set(n.value)), mine = [i.name, i.en].filter(Boolean).map(set);
  let best = 0; for (const a of mine) for (const b of rn) best = Math.max(best, jac(a, b));
  const shared = uses.get(i.ror).length > 1;
  // Chấp nhận: giống chặt (≥ 0.9). Mã dùng chung vẫn phải đạt ngưỡng, và chỉ MỘT đơn vị trong nhóm được giữ (đơn vị khớp nhất).
  report.push({ id: i.id, name: i.name, ror: i.ror, rorName: o?.names?.find((n) => n.types.includes("ror_display"))?.value ?? null, score: Math.round(best * 100) / 100, shared });
}
const groups = new Map(); for (const r of report) (groups.get(r.ror) ?? groups.set(r.ror, []).get(r.ror)).push(r);
const src = new Map(I.institutions.map((i) => [i.id, i.source]));
for (const g of groups.values()) {
  g.sort((a, b) => (VERIFIED.has(b.id) - VERIFIED.has(a.id)) || (b.score - a.score) || ((PRIO[src.get(a.id)] ?? 9) - (PRIO[src.get(b.id)] ?? 9)));
  g.forEach((r, k) => { r.ok = k === 0 && (r.score >= 0.9 || VERIFIED.has(r.id)); });
}
const bad = report.filter((r) => !r.ok);
writeFileSync("data/ror-audit.json", JSON.stringify({ checked: report.length, ok: report.length - bad.length, suspect: bad }, null, 1));
console.log(`Đã kiểm ${report.length} mã ROR: hợp lệ ${report.length - bad.length}, nghi ngờ ${bad.length}`);
if (fix) {
  const sus = new Set(bad.map((r) => r.id)), keep = new Set(report.filter((r) => r.ok).map((r) => r.ror));
  const search = async (q) => { try { const r = await fetch(`https://api.ror.org/v2/organizations?query=${encodeURIComponent(q)}`, { headers: UA }); return r.ok ? (await r.json()).items ?? [] : []; } catch { return []; } };
  for (const i of I.institutions) {
    if (!sus.has(i.id)) continue;
    // Tìm lại mã đúng: chỉ nhận kết quả ở VN, khớp chặt (≥ 0.9) với tên đơn vị, chưa thuộc đơn vị khác.
    const mine = [i.name, i.moetCode ? null : i.en].filter(Boolean).map(set); let found = null;
    for (const q of [i.moetCode ? i.name : i.en ?? i.name, i.name.replace(/\s*\([^)]*\)\s*$/, "")]) { await new Promise((r) => setTimeout(r, 150));
      for (const o of await search(q)) { if (o.locations?.[0]?.geonames_details?.country_code !== "VN" || keep.has(o.id)) continue; let b = 0; for (const n of o.names) for (const a of mine) b = Math.max(b, jac(a, set(n.value))); if (b >= 0.9) { found = o.id; break; } } if (found) break; }
    if (found) { keep.add(found); i.rorRecovered = found; }
  }
  for (const i of I.institutions) if (sus.has(i.id)) { i.rorSuspect = i.ror; i.ror = i.rorRecovered ?? null; delete i.rorRecovered; if (existsSync(`data/raw/${i.id}.json`)) rmSync(`data/raw/${i.id}.json`); }
  I.meta.withRor = I.institutions.filter((i) => i.ror).length;
  writeFileSync("data/institutions.json", JSON.stringify(I, null, 1)); console.log(`Đã xử lý ${sus.size} đơn vị nghi ngờ; khôi phục được mã đúng cho ${I.institutions.filter((i) => i.rorSuspect && i.ror).length}.`);
}
if (false) {
  const sus = new Set();
  for (const i of I.institutions) if (sus.has(i.id)) { i.rorSuspect = i.ror; i.ror = null; if (existsSync(`data/raw/${i.id}.json`)) rmSync(`data/raw/${i.id}.json`); }
  I.meta.withRor = I.institutions.filter((i) => i.ror).length;
  writeFileSync("data/institutions.json", JSON.stringify(I, null, 1)); console.log("Đã bỏ ror của các đơn vị nghi ngờ và xóa cache tác giả tương ứng.");
}
