// Công trình của từng tác giả nằm trong 1024 tệp khối public/data/works/wNNNN.json ({ "<mã tác giả>": [công trình...] }) thay vì một tệp mỗi tác giả
// (44.000+ tệp làm dựng và triển khai chậm). Khối của tác giả = số trong mã tác giả chia lấy dư cho 1024. Cùng công thức ở src/worksShard.ts và api/account.js.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
export const WSHARDS = 1024;
export const shardName = (id) => `w${String(Number(String(id).replace(/\D/g, "")) % WSHARDS).padStart(4, "0")}`;
const DIR = "public/data/works", cache = new Map();
const load = (n) => { if (!cache.has(n)) { let o = {}; try { o = JSON.parse(readFileSync(`${DIR}/${n}.json`, "utf8")); } catch { /* chưa có */ } cache.set(n, o); } return cache.get(n); };
/** Công trình của một tác giả ([] nếu không có). */
export const readWorks = (id) => load(shardName(id))[id] ?? [];
export const hasWorks = (id) => !!load(shardName(id))[id];
/** Duyệt mọi tác giả: [mã, công trình]. */
export function* allWorks() { for (const f of readdirSync(DIR).filter((x) => /^w\d{4}\.json$/.test(x))) for (const [id, ws] of Object.entries(JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")))) yield [id, ws]; }
/** Ghi lại toàn bộ (xóa thư mục cũ): per = Map(mã tác giả -> công trình). */
export function writeAllWorks(per) {
  rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true }); cache.clear();
  const by = new Map(); for (const [id, ws] of per) { const n = shardName(id); (by.get(n) ?? by.set(n, {}).get(n))[id] = ws; }
  for (const [n, o] of by) writeFileSync(`${DIR}/${n}.json`, JSON.stringify(o));
  return by.size;
}
