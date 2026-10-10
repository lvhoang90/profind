// Thử luồng đề nghị từ biểu mẫu → kho → trang Quản trị: node test/reqs.test.mjs
// Chạy: npx esbuild api/account.js --bundle --format=esm --platform=node --outfile=/tmp/h.mjs && HANDLER=/tmp/h.mjs node test/reqs.test.mjs
// (kho Redis giả: chuyển /pipeline sang kho bộ nhớ của api/_store.js; Resend giả).
Object.assign(process.env, { MAIL_PROVIDER: "console", RESEND_API_KEY: "k", ADMIN_EMAILS: "quan.tri@isavn.test", SESSION_SECRET: "test-session-secret-0123456789abcdef" });
const { makeStore } = await import("../api/_store.js");
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = String(u);
  if (url.startsWith("http://kv.test/pipeline")) {
    const saved = [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN]; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    try { const res = await makeStore().run(JSON.parse(o.body)); return new Response(JSON.stringify(res.map((result) => ({ result }))), { status: 200 }); }
    finally { [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN] = saved; }
  }
  if (url.startsWith("https://api.resend.com/")) return new Response("{}", { status: 200 });
  return realFetch(u, o);
};
const { default: corr } = await import("../api/correction.js"), { default: acc } = await import(process.env.HANDLER ?? "../api/account.js");
process.env.KV_REST_API_URL = "http://kv.test"; process.env.KV_REST_API_TOKEN = "t";
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
const send = (f) => { const fd = new FormData(); for (const [k, v] of Object.entries(f)) fd.set(k, v); return corr(new Request("https://profind.test/api/correction", { method: "POST", body: fd, headers: { "x-forwarded-for": "9.9.9.9" } })); };
const call = (op, body, cookie, method = "POST") => acc(new Request(`https://profind.test/api/account?op=${op}`, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: method === "GET" ? undefined : JSON.stringify(body) }));
async function login(email, extra = {}) {
  const logs = []; const ol = console.log; console.log = (...a) => logs.push(a.join(" "));
  try {
    let r = await call("request", { email, lang: "vi", ...extra }); eq(r.status, 200, "request " + email);
    const code = (logs.join(" ").match(/\b(\d{6})\b/) || [])[1]; eq(!!code, true, "có mã " + email);
    r = await call("verify", { email, code, lang: "vi", ...extra }); eq(r.status, 200, "verify " + email);
    return (r.headers.get("set-cookie") || "").split(";")[0];
  } finally { console.log = ol; }
}
// 1. Gửi đề nghị: lưu vào kho dù email báo thế nào
let r = await send({ kind: "add", name: "Người Thử", email: "nguoi.thu@example.vn", orcid: "0000-0002-1825-0097", scholar: "", msg: "Chưa có hồ sơ", author: "", authorName: "Người Thử" });
eq(r.status, 200, "gửi đề nghị"); eq((await r.json()).ok, true, "ok");
eq((await send({ kind: "add", name: "X", email: "khong-hop-le", msg: "" })).status, 400, "email sai bị từ chối");
// 2. Quản trị viên thấy đề nghị; người thường và người chưa đăng nhập thì không
const admin = await login("quan.tri@isavn.test", { phone: "0912345678", consent: true, name: "Quản trị" }), user = await login("nguoi.thuong@example.vn", { phone: "0987654321", consent: true, name: "Người thường" });
eq((await call("admin-reqs", null, "", "GET")).status, 403, "chưa đăng nhập");
eq((await call("admin-reqs", null, user, "GET")).status, 403, "người thường bị chặn");
let j = await (await call("admin-reqs", null, admin, "GET")).json();
eq(j.items.length, 1, "có 1 đề nghị"); eq(j.items[0].status, "new", "chưa xử lý"); eq(j.items[0].email, "nguoi.thu@example.vn", "email"); eq(j.items[0].kind, "add", "loại");
// 3. Đánh dấu đã xử lý / mở lại; người thường không làm được
const id = j.items[0].id;
eq((await call("admin-req-done", { id, done: true }, user)).status, 403, "người thường không đánh dấu được");
eq((await call("admin-req-done", { id: "khong-co", done: true }, admin)).status, 404, "không có mã");
eq((await call("admin-req-done", { id, done: true }, admin)).status, 200, "đánh dấu xong");
j = await (await call("admin-reqs", null, admin, "GET")).json(); eq(j.items[0].status, "done", "đã xử lý"); eq(j.items[0].doneBy, "quan.tri@isavn.test", "ghi người xử lý");
eq((await call("admin-req-done", { id, done: false }, admin)).status, 200, "mở lại");
j = await (await call("admin-reqs", null, admin, "GET")).json(); eq(j.items[0].status, "new", "mở lại thành chưa xử lý");
console.log(`OK ${ok} kiểm tra`);
