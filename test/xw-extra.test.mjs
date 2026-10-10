// Thử xw-sweep với mục "Công trình khác": node test/xw-extra.test.mjs (HANDLER=/tmp/h.mjs sau khi esbuild api/account.js)
Object.assign(process.env, { MAIL_PROVIDER: "console", CRON_SECRET: "test-cron-secret-0123456789", SESSION_SECRET: "test-session-secret-0123456789abcdef" });
const { makeStore } = await import("../api/_store.js"), store = makeStore();
const { default: acc } = await import(process.env.HANDLER ?? "../api/account.js");
const A = "A5000000001", shard = [{ id: `${A}-W1111111` }], extra = [{ id: "W2222222" }];
let extraStatus = 200; const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = String(u);
  if (url.includes(`/data/works/${A}.json`)) return new Response(JSON.stringify(shard), { status: 200 });
  if (url.includes(`/data/extra/${A}.json`)) return extraStatus === 200 ? new Response(JSON.stringify(extra), { status: 200 }) : new Response("", { status: extraStatus });
  if (url.startsWith("https://api.openalex.org/")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
  return realFetch(u, o);
};
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
const sweep = async () => (await (await acc(new Request("https://profind.test/api/account?op=xw-sweep", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).json());
const report = (ids) => store.run([["HSET", "profind:xw", A, JSON.stringify(ids)]]);
await store.run([["SET", "profind:xwstart", "1"]]); // bỏ chế độ "backlog" lần đầu
// 1. Một bài tính điểm và một bài trong mục "Công trình khác" còn trên hồ sơ: chưa phải "đã xử lý"
await report([`${A}-W1111111`, `${A}-W2222222`]); let j = await sweep(); eq(j.works, 0, "còn trên hồ sơ (tính điểm + công trình khác)");
// 2. Bài trong "Công trình khác" đã bị loại khỏi tệp: đã xử lý
extra.length = 0; j = await sweep(); eq(j.works, 1, "bài công trình khác đã loại -> xử lý");
// 3. Tệp extra lỗi máy chủ (5xx): không kết luận "đã xử lý"
await report([`${A}-W2222222`]); extraStatus = 503; j = await sweep(); eq(j.works, 0, "lỗi tải extra thì chờ lượt sau");
// 4. Hồ sơ không có tệp extra (404): bài không còn trong dữ liệu là đã xử lý
await report([`${A}-W3333333`]); extraStatus = 404; j = await sweep(); eq(j.works, 1, "không có tệp extra -> như cũ");
console.log(`OK ${ok} kiểm tra`);
