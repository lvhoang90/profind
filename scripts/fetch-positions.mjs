// Vị trí tác giả trên từng công trình (đứng đầu / giữa / cuối) và cờ tác giả liên hệ, từ OpenAlex -> data/raw/_positions.json
//   node scripts/fetch-positions.mjs [--mailto <email>]
// Cần OPENALEX_API_KEY. Chi phí khoảng 0,0001 USD mỗi lượt gọi (mỗi lượt 100 công trình). Chạy lại được: bỏ qua công trình đã có.
// Dùng cho vai trò "chủ đạo" (build-index.mjs): đứng tên đầu HOẶC là tác giả liên hệ (kể cả khi có nhiều tác giả liên hệ), đúng định nghĩa "tác giả chính" của HĐGSNN.
// Dạng lưu: { <mã công trình W...>: { n: số tác giả, c: số tác giả liên hệ, a: { <mã tác giả ProFind>: "f"|"m"|"l" + ("c" nếu là tác giả liên hệ) } } }, chỉ giữ tác giả có trong dữ liệu ProFind.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const MAIL = arg("mailto", "luongviethoang.safi@gmail.com"), KEY = process.env.OPENALEX_API_KEY; if (!KEY) throw new Error("Thiếu OPENALEX_API_KEY.");
const OUT = "data/raw/_positions.json", have = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const mine = new Set(JSON.parse(readFileSync("data/raw-authors.json", "utf8")).authors.map((a) => a.id));
const need = new Set();
for (const f of readdirSync("public/data/works")) { if (!f.endsWith(".json")) continue; for (const w of JSON.parse(readFileSync(`public/data/works/${f}`, "utf8"))) { const k = String(w.id).split("-")[1]; if (k && !(k in have)) need.add(k); } }
const ids = [...need]; console.log(`Cần tải ${ids.length} công trình (${Object.keys(have).length} đã có).`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { for (let t = 0; t < 6; t++) { try { const r = await fetch(u); if (r.ok) return r.json(); if (r.status === 429) { await sleep(5000 * (t + 1)); continue; } if (r.status === 403) throw new Error("403: hết ngân sách hoặc khóa không hợp lệ"); await sleep(1500 * 2 ** t); } catch (e) { if (String(e.message).startsWith("403")) throw e; await sleep(1500 * 2 ** t); } } return null; };
const batches = []; for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
let q = 0, done = 0, fail = 0;
await Promise.all(Array.from({ length: 5 }, async () => { while (q < batches.length) { const b = batches[q++]; const j = await get(`https://api.openalex.org/works?filter=openalex:${b.join("|")}&per-page=100&select=id,authorships&mailto=${MAIL}&api_key=${KEY}`);
  if (!j) { fail++; continue; }
  const got = new Set();
  for (const w of j.results ?? []) { const id = w.id.replace("https://openalex.org/", ""), a = {}; let c = 0; const au = w.authorships ?? [];
    for (const x of au) { if (x.is_corresponding) c++; const aid = x.author?.id?.replace("https://openalex.org/", ""); if (aid && mine.has(aid)) a[aid] = (x.author_position === "first" ? "f" : x.author_position === "last" ? "l" : "m") + (x.is_corresponding ? "c" : ""); }
    have[id] = { n: au.length, c, a }; got.add(id); }
  for (const id of b) if (!got.has(id)) have[id] = { n: 0, c: 0, a: {} };
  done += b.length; if (done % 5000 < 100) { writeFileSync(OUT, JSON.stringify(have)); console.log(`${done}/${ids.length}`); } } }));
writeFileSync(OUT, JSON.stringify(have)); console.log(`Xong: ${Object.keys(have).length} công trình; lô lỗi: ${fail}`);
