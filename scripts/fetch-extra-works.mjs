// "Công trình khác (không tính điểm)": tải ĐỦ công trình của một nhóm nhỏ hồ sơ từ OpenAlex (mọi năm, mọi loại, kể cả không có ISSN)
// và ghi phần chưa nằm trong danh sách đã tính điểm (public/data/works/<mã>.json). Không đụng điểm, hạng hay chỉ mục.
//   OPENALEX_API_KEY=... node scripts/fetch-extra-works.mjs --mailto <email> [--ids A1,A2] [--no-verified]
// Nhóm hồ sơ: data/full-works-authors.json (ghi tay) + hồ sơ đã xác thực (API công khai /api/account?op=verified, bỏ qua nếu không gọi được) + --ids.
// Ghi public/data/extra/<mã>.json = [{ id: mã công trình OpenAlex (W…), t: nhan đề, y: năm, j: tạp chí/nguồn, ty: loại, d: DOI, c: trích dẫn }] và public/data/extra-index.json = { built, n: { <mã>: số công trình } }.
// Chạy sau build-index.mjs (cần public/data/works). Chạy lại được; tệp của hồ sơ không còn trong nhóm bị xóa.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY;
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const SKIP_TYPES = new Set(["erratum", "paratext", "peer-review", "retraction"]);
const MAX_WORKS = 1000;

const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), inProfile = new Map((P.authors ?? P).map((a) => [a.id, a]));
const corr = JSON.parse(readFileSync("data/corrections.json", "utf8")), removed = new Set((corr.remove ?? []).map((x) => (typeof x === "string" ? x : x.id)).filter(Boolean)), xw = new Set(corr.excludeWorks ?? []);

const ids = new Set(existsSync("data/full-works-authors.json") ? JSON.parse(readFileSync("data/full-works-authors.json", "utf8")).ids : []);
for (const x of (arg("ids", "") || "").split(",").filter(Boolean)) ids.add(x);
if (!process.argv.includes("--no-verified")) {
  try { const r = await fetch(arg("verified-url", "https://profind.isavn.edu.vn/api/account?op=verified")); if (r.ok) for (const [id] of (await r.json()).items ?? []) ids.add(id); else console.warn("Không lấy được danh sách hồ sơ đã xác thực:", r.status); }
  catch (e) { console.warn("Không lấy được danh sách hồ sơ đã xác thực:", String(e.message).slice(0, 80)); }
}
const targets = [...ids].filter((id) => /^A\d{5,12}$/.test(id) && inProfile.has(id) && !removed.has(id));
console.log(`Nhóm hồ sơ cần đủ công trình: ${targets.length} (trong ${ids.size} mã)`);

const get = async (url) => {
  const u = url + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 6; t++) { let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; } if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; } throw new Error(`HTTP ${r.status}`); }
  throw new Error("Hết lượt thử");
};

mkdirSync("public/data/extra", { recursive: true });
const counts = {};
for (const id of targets) {
  try {
    const scored = new Set(), dois = new Set(), wf = `public/data/works/${id}.json`;
    if (existsSync(wf)) for (const w of JSON.parse(readFileSync(wf, "utf8"))) { scored.add(String(w.id).split("-").pop()); if (w.doi) dois.add(String(w.doi).toLowerCase()); }
    const rows = []; let cur = "*", seen = 0;
    while (cur && seen < MAX_WORKS) {
      const r = await get(`https://api.openalex.org/works?filter=author.id:${id}&per-page=100&cursor=${cur}&select=id,doi,title,publication_year,type,primary_location,cited_by_count`);
      for (const x of r.results) {
        seen++; const wid = short(x.id), doi = cleanDoi(x.doi);
        if (scored.has(wid) || (doi && dois.has(doi)) || xw.has(`${id}-${wid}`) || SKIP_TYPES.has(x.type) || !x.title || !x.publication_year) continue;
        rows.push({ id: wid, t: String(x.title).replace(/\s+/g, " ").trim().slice(0, 300), y: x.publication_year, j: x.primary_location?.source?.display_name?.slice(0, 160) ?? "", ty: x.type ?? "", d: doi ?? "", c: x.cited_by_count ?? 0 });
      }
      cur = r.meta?.next_cursor;
    }
    rows.sort((a, b) => b.y - a.y || b.c - a.c);
    if (rows.length) { writeFileSync(`public/data/extra/${id}.json`, JSON.stringify(rows)); counts[id] = rows.length; } else if (existsSync(`public/data/extra/${id}.json`)) rmSync(`public/data/extra/${id}.json`);
    console.log(`${inProfile.get(id).name} (${id}): OpenAlex ${seen}, đã tính điểm ${scored.size}, công trình khác ${rows.length}`);
  } catch (e) { console.warn(`${id}: lỗi, bỏ qua (${String(e.message).slice(0, 80)})`); if (existsSync(`public/data/extra/${id}.json`)) { try { counts[id] = JSON.parse(readFileSync(`public/data/extra/${id}.json`, "utf8")).length; } catch { /* bỏ qua */ } } }
}
for (const f of readdirSync("public/data/extra")) if (!(f.replace(".json", "") in counts)) rmSync(`public/data/extra/${f}`);
writeFileSync("public/data/extra-index.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), n: counts }));
console.log(`Xong: ${Object.keys(counts).length} hồ sơ có công trình khác.`);
