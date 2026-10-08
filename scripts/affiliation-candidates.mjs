// Tìm ứng viên cho các đơn vị CHƯA có mã ROR/dữ liệu bằng cách tìm theo chuỗi cơ quan ghi trên bài báo (raw affiliation) trong OpenAlex.
//   node scripts/affiliation-candidates.mjs --mailto <email> [--min 20] [--from 2016]
// Chỉ nhận đơn vị có tên đủ đặc thù và ≥ --min bài từ --from; với mỗi đơn vị, chỉ xét tác giả có CHÍNH chuỗi cơ quan của mình chứa tên đơn vị (không lấy đồng tác giả ở nơi khác).
// Ghi data/affiliation-candidates.json (danh sách DUYỆT RIÊNG ở trang quản trị) — chưa nạp gì vào dữ liệu chính.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, MIN = +arg("min", 20), FROM = arg("from", "2016");
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const get = async (u) => { for (let t = 0; t < 5; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions;
const known = I.filter((i) => i.ror || existsSync(`data/raw/${i.id}.json`)).flatMap((i) => [norm(i.name), norm(i.en)]).filter((s) => s.length > 8);
const GENERIC = /^(truong|dai hoc|hoc vien|vien|cao dang|trung tam|phan hieu|university|college|institute|school)( [a-z]+)?$/;
const VN = /viet ?nam|hanoi|ha noi|ho chi minh|hcm|da nang|danang|hue|can tho|hai phong|thai nguyen|nghe an|vinh|da lat|nha trang|binh duong|dong nai|quang ninh|nam dinh|thanh hoa/;
const hasVi = (r) => /[À-ỹ]/.test(r) || VN.test(norm(r)); // có chữ Việt có dấu hoặc địa danh Việt Nam
const out = []; const rows = I.filter((i) => !i.ror && !existsSync(`data/raw/${i.id}.json`));
for (const inst of rows) {
  const phrases = [...new Set([inst.name.replace(/\s*\([^)]*\)\s*$/, ""), inst.en].filter(Boolean).map((p) => p.replace(/["“”]/g, "").trim()))];
  // đủ đặc thù: ≥3 từ, không phải chuỗi chung chung, không trùng/chứa tên đơn vị đã nạp (tránh nhiễu từ đơn vị cha)
  const ok = phrases.filter((p) => { const n = norm(p); return n.split(" ").length >= 3 && !GENERIC.test(n) && !known.some((k) => k === n || k.includes(n) || n.includes(k)) && !/dai hoc quoc gia|vietnam national university|vnu/.test(n); });
  if (!ok.length) continue;
  let best = null;
  for (const p of ok) {
    const j = await get(`https://api.openalex.org/works?filter=raw_affiliation_strings.search:${encodeURIComponent('"' + p + '"')},from_publication_date:${FROM}-01-01&per-page=1&select=id`);
    const n = j?.meta?.count ?? 0; if (n >= MIN && (!best || n > best.n)) best = { p, n };
  }
  if (!best) continue;
  const np = norm(best.p), authors = new Map(), strings = new Map(); let cursor = "*", scanned = 0, nRaw = 0, nVn = 0;
  while (cursor && scanned < 1200) {
    const j = await get(`https://api.openalex.org/works?filter=raw_affiliation_strings.search:${encodeURIComponent('"' + best.p + '"')},from_publication_date:${FROM}-01-01&per-page=200&cursor=${cursor}&select=id,authorships`);
    if (!j) break; scanned += j.results.length; cursor = j.meta?.next_cursor && j.results.length ? j.meta.next_cursor : null;
    for (const w of j.results) for (const a of w.authorships ?? []) {
      const raws = (a.raw_affiliation_strings ?? []).filter((r) => norm(r).includes(np)); if (!raws.length) continue;
      const id = (a.author?.id ?? "").replace("https://openalex.org/", ""); if (!id) continue;
      const e = authors.get(id) ?? { id, name: a.author.display_name, orcid: (a.author.orcid ?? "").replace("https://orcid.org/", "") || null, n: 0 }; e.n++; authors.set(id, e);
      for (const r of raws.slice(0, 1)) { strings.set(r, (strings.get(r) ?? 0) + 1); nRaw++; if (hasVi(r)) nVn++; }
    }
  }
  const list = [...authors.values()].sort((a, b) => b.n - a.n), vnShare = nRaw ? Math.round((nVn / nRaw) * 100) / 100 : 0;
  const tokens = norm(inst.name).split(" ").length, flags = [];
  if (vnShare < 0.6) flags.push("Nhiều chuỗi cơ quan không phải ở Việt Nam (có thể trùng tên trường nước ngoài)");
  if (/^truong [a-z]+( [a-z]+)?$/.test(norm(inst.name))) flags.push("Tên ngắn, có thể là khoa/trường thuộc đại học khác");
  if (!norm(inst.name).split(" ").every((w) => np.includes(w)) && !strings.size) flags.push("Chưa thấy tên tiếng Việt trong chuỗi cơ quan");
  const topStr = [...strings].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; if (topStr && !norm(topStr).includes(norm(inst.name).split(" ").slice(-2).join(" "))) flags.push("Chuỗi phổ biến nhất khác tên đơn vị (có thể là tên tiếng Anh của nơi khác)");
  out.push({ id: inst.id, name: inst.name, en: inst.en ?? null, type: inst.type, city: inst.city ?? null, phrase: best.p, works: best.n, authors: list.length, vnShare, flags, topAuthors: list.slice(0, 12), samples: [...strings].sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0].slice(0, 160)) });
  console.log(`${inst.name}: ${best.n} bài, ${list.length} tác giả`);
}
out.sort((a, b) => a.flags.length - b.flags.length || b.authors - a.authors);
writeFileSync("data/affiliation-candidates.json", JSON.stringify(out, null, 1)); writeFileSync("public/data/_aff-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), units: out })); console.log(`Ứng viên: ${out.length} đơn vị.`);
