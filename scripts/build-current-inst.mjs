// Xác định đơn vị HIỆN TẠI của từng tác giả từ cơ quan ghi trên các công trình gần đây (data/raw/_authorship.json, nạp bằng fetch-authorship.mjs).
//   node scripts/build-current-inst.mjs --mailto <email>
// Điểm gần đây của một đơn vị = Σ 0,25^(năm mới nhất của tác giả − năm công trình) (mỗi công trình tính một lần cho mỗi đơn vị) trên các công trình ghi cơ quan đó (kể cả đơn vị cha theo lineage OpenAlex).
// Đơn vị "hiện tại" = điểm ≥ 50% điểm cao nhất; còn lại là đơn vị cũ/liên kết phụ. Ghi data/raw/_current-inst.json = { authorId: { unitId: điểm } }.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY; if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (u) => String(u ?? "").replace("https://openalex.org/", "");
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const AU = JSON.parse(readFileSync("data/raw/_authorship.json", "utf8")), P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const inst = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions, byRor = new Map(inst.filter((i) => i.ror).map((i) => [i.ror.replace(/^https?:\/\/ror.org\//, ""), i.id]));
// 1. Bản đồ mã cơ quan OpenAlex -> {ror, lineage}
const MF = "data/raw/_instmap.json", IM = existsSync(MF) ? JSON.parse(readFileSync(MF, "utf8")) : {};
const need = new Set(); for (const v of Object.values(AU)) for (const k of v[0]) if (/^I\d+$/.test(k) && !IM[k]) need.add(k);
const ids = [...need]; console.log(`Cần tra ${ids.length} cơ quan OpenAlex.`);
for (let i = 0; i < ids.length; i += 50) { const j = await get(`https://api.openalex.org/institutions?filter=id:${ids.slice(i, i + 50).join("|")}&per-page=50&select=id,ror,lineage`); for (const r of j?.results ?? []) IM[short(r.id)] = { ror: (r.ror ?? "").replace("https://ror.org/", ""), lineage: (r.lineage ?? []).map(short) }; for (const k of ids.slice(i, i + 50)) IM[k] ??= { ror: "", lineage: [] }; }
writeFileSync(MF, JSON.stringify(IM));
// lineage có thể chứa cơ quan cha chưa tra: tra thêm
const need2 = new Set(); for (const v of Object.values(IM)) for (const l of v.lineage) if (!IM[l]) need2.add(l);
const ids2 = [...need2]; for (let i = 0; i < ids2.length; i += 50) { const j = await get(`https://api.openalex.org/institutions?filter=id:${ids2.slice(i, i + 50).join("|")}&per-page=50&select=id,ror`); for (const r of j?.results ?? []) IM[short(r.id)] = { ror: (r.ror ?? "").replace("https://ror.org/", ""), lineage: [] }; for (const k of ids2.slice(i, i + 50)) IM[k] ??= { ror: "", lineage: [] }; }
writeFileSync(MF, JSON.stringify(IM));
const unitsOf = (k) => { const m = IM[k]; if (!m) return []; const out = new Set(); for (const x of [k, ...m.lineage]) { const u = byRor.get(IM[x]?.ror ?? ""); if (u) out.add(u); } return [...out]; };
// 2. Điểm gần đây theo (tác giả, đơn vị)
const out = {}; let nA = 0;
for (const a of P.authors) {
  let w; try { w = JSON.parse(readFileSync(`public/data/works/${a.id}.json`, "utf8")); } catch { continue; } w = w.works ?? w;
  const rows = w.filter((x) => AU[x.id]); if (!rows.length) continue; const maxY = Math.max(...rows.map((x) => x.year)), sc = {};
  for (const x of rows) for (const u of new Set(AU[x.id][0].flatMap(unitsOf))) sc[u] = (sc[u] ?? 0) + 0.25 ** (maxY - x.year);
  const ks = Object.keys(sc); if (ks.length) { out[a.id] = Object.fromEntries(ks.map((u) => [u, +sc[u].toFixed(2)])); nA++; }
}
writeFileSync("data/raw/_current-inst.json", JSON.stringify(out)); console.log(`Đã tính đơn vị hiện tại cho ${nA} tác giả.`);
const me = out["A5011212770"]; console.log("Duy Quy Nguyen-Phuoc:", me);
