// Dò mã ROR cho các đơn vị chưa có bằng cách tìm theo tên trong OpenAlex (chỉ nhận đơn vị ở VN, tên khớp CHẶT như audit-ror.mjs, mã chưa thuộc đơn vị khác).
//   node scripts/map-ror-oa.mjs --mailto <email> [--apply]    (không --apply: chỉ báo cáo -> data/ror-map.json)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, apply = process.argv.includes("--apply");
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\btp\.? ?hcm\b|\btp\.? ho chi minh\b|\bho chi minh city\b/g, "thanh pho ho chi minh").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\b(truong|the|of|and|dai hoc|university)\b/g, (m) => (m === "dai hoc" || m === "university" ? "univ" : "")).replace(/\s+/g, " ").trim();
const set = (s) => new Set(norm(s.replace(/\s*\([^)]*\)\s*$/, "")).split(" ").filter(Boolean));
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return a.size + b.size - i ? i / (a.size + b.size - i) : 0; };
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")), used = new Set(I.institutions.filter((i) => i.ror).map((i) => i.ror));
const search = async (q) => { for (let t = 0; t < 5; t++) { try { const r = await fetch(`https://api.openalex.org/institutions?search=${encodeURIComponent(q)}&filter=country_code:VN&per-page=8&select=id,display_name,display_name_alternatives,ror,works_count&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return (await r.json()).results ?? []; if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return []; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return []; };
const out = [];
const AL = existsSync("data/unit-alias.json") ? JSON.parse(readFileSync("data/unit-alias.json", "utf8")).alias : {};
for (const i of I.institutions.filter((x) => !x.ror && !AL[x.id])) {
  const mine = [i.name, i.en].filter(Boolean).map(set); let best = null;
  for (const q of [...new Set([i.en, i.name.replace(/\s*\([^)]*\)\s*$/, "")].filter(Boolean))]) {
    for (const o of await search(q)) { if (!o.ror || used.has(o.ror)) continue; let b = 0; for (const n of [o.display_name, ...(o.display_name_alternatives ?? [])]) for (const a of mine) b = Math.max(b, jac(a, set(n))); if (b >= +arg("min", 0.9) && (!best || b > best.score)) best = { id: i.id, name: i.name, ror: o.ror, oaName: o.display_name, oa: o.id, works: o.works_count, score: Math.round(b * 100) / 100 }; }
    if (best) break;
  }
  if (best) { used.add(best.ror); out.push(best); if (apply) i.ror = best.ror; }
}
writeFileSync("data/ror-map.json", JSON.stringify(out, null, 1));
if (apply) { I.meta.withRor = I.institutions.filter((i) => i.ror).length; writeFileSync("data/institutions.json", JSON.stringify(I, null, 1)); }
console.log(`Tìm được ${out.length}/${I.institutions.filter((i) => !i.ror || out.some((o) => o.id === i.id)).length} đơn vị chưa có ROR${apply ? " (đã ghi vào institutions.json)" : ""}.`);
