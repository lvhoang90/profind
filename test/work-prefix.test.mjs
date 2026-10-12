// Mã công trình có tiền tố khác mã hồ sơ (op author-work-not / author-work-conf / xw-sweep): node test/work-prefix.test.mjs (HANDLER do scripts/run-tests.mjs đặt)
// Chạy riêng: npx esbuild api/account.js --bundle --format=esm --platform=node --outfile=/tmp/h.mjs && HANDLER=/tmp/h.mjs node test/work-prefix.test.mjs
Object.assign(process.env, { MAIL_PROVIDER: "console", RESEND_API_KEY: "k", ADMIN_EMAILS: "quan.tri@isavn.test", SESSION_SECRET: "test-session-secret-0123456789abcdef" });
const { makeStore } = await import("../api/_store.js");
const realFetch = globalThis.fetch;
const A = "A5000000001", B = "A5999999999", W_OWN = `${A}-W1111111`, W_OTHER_ON = `${B}-W2222222`, W_OTHER_OFF = `${B}-W3333333`;
let shard = [{ id: W_OWN }, { id: W_OTHER_ON }], shardStatus = 200, fetched = [];
globalThis.fetch = async (u, o) => {
  const url = String(u);
  if (url.includes(`/data/works/w${String(Number(A.replace(/\D/g, "")) % 1024).padStart(4, "0")}.json`)) { fetched.push(url); return shardStatus === 200 ? new Response(JSON.stringify({ [A]: shard }), { status: 200 }) : new Response("", { status: shardStatus }); }
  if (url.includes("/data/extra/")) return new Response("", { status: 404 });
  if (url.startsWith("https://api.openalex.org/")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
  if (url.startsWith("http://kv.test/pipeline")) {
    const saved = [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN]; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    try { const res = await makeStore().run(JSON.parse(o.body)); return new Response(JSON.stringify(res.map((result) => ({ result }))), { status: 200 }); }
    finally { [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN] = saved; }
  }
  if (url.startsWith("https://api.resend.com/")) return new Response("{}", { status: 200 });
  return realFetch(u, o);
};
const { default: acc } = await import(process.env.HANDLER ?? "../api/account.js");
process.env.KV_REST_API_URL = "http://kv.test"; process.env.KV_REST_API_TOKEN = "t";
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
const call = (op, body, cookie, method = "POST", qs = "") => acc(new Request(`https://profind.test/api/account?op=${op}${qs}`, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: method === "GET" ? undefined : JSON.stringify(body) }));
async function login(email, extra = {}) {
  const logs = []; const ol = console.log; console.log = (...a) => logs.push(a.join(" "));
  try {
    let r = await call("request", { email, lang: "vi", ...extra }); eq(r.status, 200, "request " + email);
    const code = (logs.join(" ").match(/\b(\d{6})\b/) || [])[1]; eq(!!code, true, "có mã " + email);
    r = await call("verify", { email, code, lang: "vi", ...extra }); eq(r.status, 200, "verify " + email);
    return (r.headers.get("set-cookie") || "").split(";")[0];
  } finally { console.log = ol; }
}

const owner = await login("chu.ho.so@epu.edu.vn", { phone: "0987654321", consent: true, name: "Chủ hồ sơ" }), admin = await login("quan.tri@isavn.test", { phone: "0912345678", consent: true, name: "Quản trị" });
eq((await call("admin-claim-manual", { authorId: A, authorName: "Tác Giả Thử", name: "Chủ hồ sơ", email: "chu.ho.so@epu.edu.vn", direct: true }, admin)).status, 200, "xác thực chủ hồ sơ");
const not = (workId, extra = {}) => call("author-work-not", { authorId: A, workId, ...extra }, owner);
// 1. author-work-not
let r = await not(W_OWN); eq(r.status, 200, "đúng tiền tố: nhận"); eq((await r.json()).xw.join(), W_OWN, "đúng tiền tố: lưu");
fetched = []; eq((await not(`${A}-W5555555`)).status, 200, "đúng tiền tố không cần tra khối (kể cả mã chưa có trong khối)"); eq(fetched.length, 0, "đúng tiền tố: không gọi fetch khối");
r = await not(W_OTHER_ON); eq(r.status, 200, "tiền tố khác, có trên hồ sơ: nhận"); eq(fetched.length, 1, "đã tra khối công trình"); eq((await r.json()).xw.includes(W_OTHER_ON), true, "tiền tố khác: được lưu");
eq((await not(W_OTHER_OFF)).status, 400, "tiền tố khác, không có trên hồ sơ: 400");
eq((await not(W_OTHER_ON, { undo: true })).status, 200, "bỏ báo mã tiền tố khác");
shardStatus = 404; eq((await not(W_OTHER_ON)).status, 400, "không tải được khối: từ chối"); shardStatus = 500; eq((await not(W_OTHER_ON)).status, 400, "khối lỗi 5xx: từ chối"); shardStatus = 200;
for (const bad of ["", "W1111111", `${A}-abc`, `${A}W1111111`, "A12-W1111111", `${A}-W12`, `${B}-W`, `x${A}-W1111111`, `${A}-W1111111x`, `${B}-W2222222\n`]) eq((await not(bad)).status, 400, "sai định dạng: " + JSON.stringify(bad));
eq((await call("author-work-not", { authorId: A, workId: W_OWN }, "")).status >= 400, true, "chưa đăng nhập bị chặn");
// 2. author-work-conf chỉ nhận đúng tiền tố hồ sơ
eq((await call("author-work-conf", { authorId: A, workId: W_OTHER_ON, confirm: true }, owner)).status, 400, "conf tiền tố khác (dù có trên hồ sơ): 400");
eq((await call("author-work-conf", { authorId: A, workId: W_OTHER_OFF, confirm: true }, owner)).status, 400, "conf tiền tố khác, không có: 400");
eq((await call("author-work-conf", { authorId: A, workId: W_OWN, confirm: true }, owner)).status, 200, "conf đúng tiền tố: nhận");
// 3. sweep chấp nhận mã tiền tố khác
delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; const st = makeStore(); process.env.KV_REST_API_URL = "http://kv.test"; process.env.KV_REST_API_TOKEN = "t";
process.env.CRON_SECRET = "test-cron-secret-0123456789";
await st.run([["SET", "profind:xwstart", "1"], ["DEL", "profind:xw"], ["HSET", "profind:xw", A, JSON.stringify([W_OTHER_ON, W_OTHER_OFF, "rac"])]]);
const sweep = async () => (await acc(new Request("https://profind.test/api/account?op=xw-sweep", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).json();
let j = await sweep(); eq(j.works, 1, "sweep: mã tiền tố khác không còn trên hồ sơ -> đã xử lý (1 mã); mã còn trên hồ sơ và mã rác bị bỏ qua");
eq(JSON.parse(await st.run([["HGET", "profind:xw", A]]).then((x) => x[0])).join(), W_OTHER_ON, "sweep: mã còn trên hồ sơ vẫn giữ trong danh sách");
console.log(`OK ${ok} kiểm tra`);
