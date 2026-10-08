// Nạp thông tin cơ quan + ORCID của CHÍNH tác giả trên từng công trình (OpenAlex authorships) để dò công trình gán nhầm người trùng tên.
//   node scripts/fetch-authorship.mjs --mailto <email> [--batch 25] [--limit-usd 0.5]
// Mỗi lượt gọi lấy tối đa 200 công trình của một nhóm tác giả (author.id:A1|A2|...). Ghi data/raw/_authorship.json
//   { "<authorId>-<workId>": [khóa cơ quan[], mã quốc gia[], ORCID quan sát được[]] } — chạy lại được (bỏ qua nhóm đã xong), dừng êm khi gần hết ngân sách.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), KEY = process.env.OPENALEX_API_KEY, BATCH = +arg("batch", 25), LIMIT = +arg("limit-usd", 0.5);
if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const short = (u) => String(u ?? "").replace("https://openalex.org/", "").replace("https://orcid.org/", "");
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u + `&mailto=${encodeURIComponent(mailto)}&api_key=${KEY}`); if (r.ok) return r.json(); if (r.status === 429 || r.status >= 500) await new Promise((s) => setTimeout(s, 2000 * 2 ** t)); else return null; } catch { await new Promise((s) => setTimeout(s, 2000)); } } return null; };
const budget = async () => { const r = (await (await fetch(`https://api.openalex.org/rate-limit?api_key=${KEY}`)).json()).rate_limit; return r.daily_remaining_usd + (r.prepaid_remaining_usd ?? 0); };
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), ids = P.authors.filter((a) => a.worksCount > 0 && !a.suspect).sort((a, b) => b.worksCount - a.worksCount).map((a) => a.id);
const F = "data/raw/_authorship.json", doneF = "data/raw/_authorship-done.json", out = existsSync(F) ? JSON.parse(readFileSync(F, "utf8")) : {}, done = new Set(existsSync(doneF) ? JSON.parse(readFileSync(doneF, "utf8")) : []);
const start = await budget(); let n = 0;
for (let i = 0; i < ids.length; i += BATCH) {
  const grp = ids.slice(i, i + BATCH), key = grp[0]; if (done.has(key)) continue;
  if (start - (await budget()) > LIMIT || (await budget()) < 0.02) { console.log("Đạt giới hạn chi phí/ngân sách, dừng; chạy lại để tiếp tục."); break; }
  const mine = new Set(grp); let cur = "*";
  while (cur) {
    const j = await get(`https://api.openalex.org/works?filter=author.id:${grp.join("|")}&per-page=200&cursor=${cur}&select=id,authorships`);
    if (!j) { console.log("Lỗi mạng, dừng nhóm", key); cur = null; break; }
    for (const w of j.results) for (const a of w.authorships ?? []) { const aid = short(a.author?.id); if (!mine.has(aid)) continue;
      const keys = [...new Set([...(a.institutions ?? []).map((x) => short(x.id)), ...(a.institutions?.length ? [] : (a.raw_affiliation_strings ?? []).map((s) => "s:" + fold(s).slice(0, 60)))])].filter(Boolean).slice(0, 4);
      out[`${aid}-${short(w.id)}`] = [keys, [...new Set((a.countries ?? []).filter(Boolean))].slice(0, 3), [...new Set(a.author?.observed_orcids ?? [])].map(short).slice(0, 3)]; n++; }
    cur = j.meta?.next_cursor && j.results.length ? j.meta.next_cursor : null;
  }
  done.add(key); if (done.size % 20 === 0) { writeFileSync(F, JSON.stringify(out)); writeFileSync(doneF, JSON.stringify([...done])); console.log(`${done.size} nhóm, ${Object.keys(out).length} cặp tác giả-công trình`); }
}
writeFileSync(F, JSON.stringify(out)); writeFileSync(doneF, JSON.stringify([...done])); console.log(`Xong lượt này: ${Object.keys(out).length} cặp, ${done.size} nhóm đã nạp.`);
