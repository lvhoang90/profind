// Công thức khối công trình/chi tiết phải giống nhau ở mọi nơi: node test/shards.test.mjs (HANDLER do scripts/run-tests.mjs đặt)
// _works-io.mjs (1024) = src/worksShard.ts = api/account.js (sweep); build-lite.mjs (256, shardOf) = src/authorDetail.ts (detailShard).
import { build } from "esbuild";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const ROOT = process.cwd();
Object.assign(process.env, { MAIL_PROVIDER: "console", CRON_SECRET: "test-cron-secret-0123456789", SESSION_SECRET: "test-session-secret-0123456789abcdef" });
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
const tmp = mkdtempSync(path.join(tmpdir(), "profind-shards-"));
for (const [src, out] of [["src/worksShard.ts", "ws.mjs"], ["src/authorDetail.ts", "ad.mjs"]]) await build({ entryPoints: [path.join(ROOT, src)], bundle: true, format: "esm", outfile: path.join(tmp, out), logLevel: "error" });
const { shardName: wsName } = await import(pathToFileURL(path.join(tmp, "ws.mjs")));
const { detailShard } = await import(pathToFileURL(path.join(tmp, "ad.mjs")));
const io = await import(pathToFileURL(path.join(ROOT, "scripts/_works-io.mjs")));
// build-lite.mjs chạy cả bước dựng khi import, nên lấy dòng định nghĩa shardOf từ mã nguồn (chỉ đọc) thay vì import.
const liteLine = readFileSync(path.join(ROOT, "scripts/build-lite.mjs"), "utf8").split("\n").find((l) => l.startsWith("export const SHARDS"));
const shardOf = new Function(`${liteLine.replace("export const", "const")}; return shardOf;`)();
// Mã thử: các mã nêu tên, mã có số 0 đầu, mã lớn, và ~190 mã sinh giả ngẫu nhiên (cố định hạt giống)
const ids = ["A5000000937", "A5035471180", "A5100716476", "A5000000001", "A5000001024", "A5000000256", "A5000000000", "A0000000007", "A0001", "A5999999999", "A900719925474", "A123456789012"];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
while (ids.length < 200) ids.push("A" + String(Math.floor(rnd() * 1e10) + (rnd() < 0.2 ? 5e9 : 0)).padStart(10, "0"));
// 1. Công thức khối công trình: _works-io.mjs = src/worksShard.ts, khớp công thức mod 1024 viết thẳng
for (const id of ids) {
  const n = Number(id.replace(/\D/g, "")) % 1024, want = "w" + String(n).padStart(4, "0");
  eq(io.shardName(id), want, "shardName io " + id); eq(wsName(id), want, "worksShard " + id);
  eq(detailShard(id), shardOf(id), "authorDetail = build-lite " + id); eq(shardOf(id), "p" + String(Number(id.replace(/\D/g, "")) % 256).padStart(3, "0"), "build-lite mod 256 " + id);
}
eq(io.shardName("A5000000937"), "w" + String(5000000937 % 1024).padStart(4, "0"), "A5000000937"); eq(io.WSHARDS, 1024, "WSHARDS");
eq(/^w\d{4}$/.test(io.shardName("A0001")), true, "định dạng wNNNN"); eq(io.shardName("A0000000007"), "w0007", "số 0 đầu");
// 2. api/account.js (sweep): URL khối được tải phải đúng tên khối
const { makeStore } = await import(path.join(ROOT, "api/_store.js")), store = makeStore();
const { default: acc } = await import(process.env.HANDLER ?? pathToFileURL(path.join(ROOT, "api/account.js")));
const realFetch = globalThis.fetch; let seen = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), m = /\/data\/works\/(w\d{4})\.json/.exec(url);
  if (m) { seen.push(m[1]); return new Response(JSON.stringify({}), { status: 200 }); }
  if (url.includes("/data/extra/")) return new Response("", { status: 404 });
  if (url.startsWith("https://api.openalex.org/")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
  return realFetch(u, o);
};
await store.run([["SET", "profind:xwstart", "1"]]);
for (const id of ids) {
  await store.run([["DEL", "profind:xw"], ["HSET", "profind:xw", id, JSON.stringify([`${id}-W1234567`])]]); seen = [];
  const r = await acc(new Request("https://profind.test/api/account?op=xw-sweep", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  eq(r.status, 200, "sweep " + id); eq(seen.join(), io.shardName(id), "sweep tải khối " + id);
}
globalThis.fetch = realFetch;
// 3. writeAllWorks/readWorks: thư mục đích cố định là public/data/works (tương đối), nên chuyển sang thư mục tạm trước khi ghi để không đụng dữ liệu thật
const real = path.join(ROOT, "public/data/works"), realFiles = existsSync(real) ? readdirSync(real).filter((f) => /^w\d{4}\.json$/.test(f)) : [];
process.chdir(tmp);
const per = new Map(ids.slice(0, 120).map((id, i) => [id, [{ id: `${id}-W${i + 1000}`, year: 2000 + (i % 25), title: "Bài " + i }]]));
const nShards = io.writeAllWorks(per);
eq(nShards, new Set([...per.keys()].map(io.shardName)).size, "số khối ghi ra");
eq(existsSync(path.join(tmp, "public/data/works", io.shardName(ids[0]) + ".json")), true, "tệp khối có trong thư mục tạm");
for (const [id, ws] of per) { eq(JSON.stringify(io.readWorks(id)), JSON.stringify(ws), "đọc lại " + id); eq(io.hasWorks(id), true, "hasWorks " + id); }
eq(io.readWorks(ids[150]).length, 0, "tác giả không có công trình"); eq(io.hasWorks(ids[150]), false, "hasWorks vắng");
let n = 0; for (const [id, ws] of io.allWorks()) { eq(JSON.stringify(per.get(id)), JSON.stringify(ws), "allWorks " + id); n++; } eq(n, per.size, "allWorks đủ số tác giả");
process.chdir(ROOT);
// 4. Dữ liệu thật (nếu có): chỉ đọc; mọi tác giả trong khối wNNNN.json phải thuộc đúng khối đó
if (realFiles.length) {
  const f = realFiles[0], o = JSON.parse(readFileSync(path.join(real, f), "utf8")), k = Object.keys(o);
  eq(k.length > 0, true, "khối thật không rỗng"); for (const id of k.slice(0, 50)) eq(io.shardName(id) + ".json", f, "tác giả thật nằm đúng khối " + id);
}
console.log(`OK ${ok} kiểm tra`);
