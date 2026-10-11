// Công trình bổ sung theo danh sách do tác giả cung cấp (ví dụ trang Google Scholar): OpenAlex tách một người thành nhiều hồ sơ hoặc không gắn tác giả vào công trình, nên
// hồ sơ thiếu bài. Quản trị viên ghi MÃ CÔNG TRÌNH OPENALEX (W…) vào data/manual-work-ids.json, script này tải từng công trình và ghi data/manual-works.json.
//   OPENALEX_API_KEY=... node scripts/fetch-manual-works.mjs --mailto <email>
// data/manual-work-ids.json: { "<mã tác giả A…>": ["W…", ...] }; thêm ":lead" hoặc ":co" sau mã ("W…:lead") để ghi đè vai trò khi OpenAlex không có danh sách tác giả (dựa vào thứ tự tác giả tác giả cung cấp). Chạy lại được. Công trình có ISSN vào danh sách tính điểm (build-index.mjs); không có ISSN (kỷ yếu, sách) vào
// "Công trình khác" (fetch-extra-works.mjs). Chỉ nhận công trình có trong OpenAlex (có thể truy vết bằng DOI); bài chỉ có trên Google Scholar thì không thêm.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY;
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const short = (id) => (id ?? "").replace("https://openalex.org/", "");
const cleanDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null : null);
const toks = (s) => new Set(String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1));
const same = (x, y) => { const A = toks(x), B = toks(y); let k = 0; for (const t of A) if (B.has(t)) k++; return A.size && B.size && (k >= Math.min(A.size, B.size) || k >= 2); };
const ids = JSON.parse(readFileSync("data/manual-work-ids.json", "utf8")); delete ids._note;
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), name = new Map(P.authors.map((a) => [a.id, a.name]));
const get = async (url) => {
  const u = url + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`;
  for (let t = 0; t < 6; t++) { let r; try { r = await fetch(u); } catch { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; } if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); continue; } throw new Error(`HTTP ${r.status}`); }
  throw new Error("Hết lượt thử");
};
const works = [];
for (const [aid, list] of Object.entries(ids)) {
  if (!name.has(aid)) { console.warn(`${aid}: không có trong profind.json, bỏ qua`); continue; }
  for (let i = 0; i < list.length; i += 40) {
    const forced = new Map(list.slice(i, i + 40).map((e) => String(e).split(":")).filter(([w]) => /^W\d+$/.test(w)).map(([w, r]) => [w, r]));
    const chunk = [...forced.keys()];
    const r = await get(`https://api.openalex.org/works?filter=openalex:${chunk.join("|")}&per-page=50&select=id,doi,title,publication_year,type,cited_by_count,primary_location,authorships`);
    for (const x of r.results) {
      const s = x.primary_location?.source, issn = s?.issn_l ?? s?.issn?.[0] ?? null, as = x.authorships ?? [];
      // Tác giả chính = đứng đầu hoặc tác giả liên hệ duy nhất (quy tắc HĐGSNN, như ingest-openalex.mjs); xác định người theo tên vì OpenAlex có thể không gắn mã tác giả.
      const idx = as.findIndex((z) => short(z.author?.id) === aid || same(z.author?.display_name, name.get(aid))), me = as[idx], nCorr = as.filter((z) => z.is_corresponding).length;
      const lead = !!me && (idx === 0 || me.author_position === "first" || (me.is_corresponding && nCorr === 1));
      works.push({ id: `${aid}-${short(x.id)}`, authorId: aid, doi: cleanDoi(x.doi), title: x.title, year: x.publication_year, journal: s?.display_name ?? "", ...(issn ? { issn, issns: s.issn ?? [issn] } : {}), type: x.type ?? "", citations: x.cited_by_count ?? 0, role: forced.get(short(x.id)) === "lead" || forced.get(short(x.id)) === "co" ? forced.get(short(x.id)) : lead ? "lead" : "co", corr: nCorr, demo: false, manual: true });
    }
    const got = new Set(r.results.map((x) => short(x.id))); for (const w of chunk) if (!got.has(w)) console.warn(`${aid}: không tìm thấy ${w} trên OpenAlex`);
  }
}
works.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync("data/manual-works.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), works }, null, 1));
console.log(`manual-works.json: ${works.length} công trình, ${works.filter((w) => w.issn).length} có ISSN (tính điểm), ${works.filter((w) => !w.issn).length} không ISSN (công trình khác)`);
