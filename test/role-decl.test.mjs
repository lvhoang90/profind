// Thử khai báo tác giả liên hệ của chủ hồ sơ: node test/role-decl.test.mjs
// Chạy: npx esbuild api/account.js --bundle --format=esm --platform=node --outfile=/tmp/h.mjs && HANDLER=/tmp/h.mjs node test/role-decl.test.mjs
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
const A = "A5000000001", W = `${A}-W99123456`, W2 = `${A}-W2222222`;
const admin = await login("quan.tri@isavn.test", { phone: "0912345678", consent: true, name: "Quản trị" }), owner = await login("chu.ho.so@epu.edu.vn", { phone: "0987654321", consent: true, name: "Chủ hồ sơ" }), other = await login("nguoi.la@example.vn", { phone: "0977000111", consent: true, name: "Người lạ" });
// Xác thực chủ hồ sơ (quản trị viên xác nhận trực tiếp)
eq((await call("admin-claim-manual", { authorId: A, authorName: "Tác Giả Thử", name: "Chủ hồ sơ", email: "chu.ho.so@epu.edu.vn", direct: true }, admin)).status, 200, "xác thực chủ hồ sơ");
// 1. Người chưa đăng nhập hoặc không phải chủ hồ sơ: không khai được
eq((await call("author-work-role", { authorId: A, workId: W, confirm: true }, "")).status >= 400, true, "chưa đăng nhập bị chặn");
eq((await call("author-work-role", { authorId: A, workId: W, confirm: true }, other)).status >= 400, true, "người lạ bị chặn");
// 2. Chủ hồ sơ: phải xác nhận; mã công trình phải thuộc hồ sơ và đúng định dạng
eq((await call("author-work-role", { authorId: A, workId: W }, owner)).status, 400, "thiếu xác nhận");
eq((await call("author-work-role", { authorId: A, workId: "A5999999999-W99123456", confirm: true }, owner)).status >= 400, true, "công trình của hồ sơ khác");
eq((await call("author-work-role", { authorId: A, workId: `${A}-abc`, confirm: true }, owner)).status, 400, "mã sai định dạng");
let j = await (await call("author-work-role", { authorId: A, workId: W, confirm: true }, owner)).json(); eq(j.ok, true, "khai được"); eq(j.cr.join(), W, "danh sách");
j = await (await call("author-work-role", { authorId: A, workId: W, confirm: true }, owner)).json(); eq(j.cr.length, 1, "khai lại không nhân đôi");
await call("author-work-role", { authorId: A, workId: W2, confirm: true }, owner);
// 3. Công khai thấy ngay (kể cả người chưa đăng nhập)
j = await (await call("author-public", null, "", "GET", `&id=${A}`)).json(); eq(j.verified, true, "hồ sơ đã xác thực"); eq(j.cr.length, 2, "công khai thấy 2 khai tác giả liên hệ");
// 4. Quản trị viên xem và gỡ; người thường không gỡ được
j = await (await call("admin-claims", null, admin, "GET")).json(); eq(j.cr.length, 2, "quản trị thấy khai báo");
eq((await call("admin-claim-role", { authorId: A, workId: W }, owner)).status, 403, "chủ hồ sơ không dùng được lệnh quản trị");
eq((await call("admin-claim-role", { authorId: A, workId: W }, admin)).status, 200, "quản trị gỡ");
eq((await call("admin-claim-role", { authorId: A, workId: W }, admin)).status, 404, "gỡ lần hai: không còn");
j = await (await call("author-public", null, "", "GET", `&id=${A}`)).json(); eq(j.cr.join(), W2, "chỉ còn 1");
// 5. Chủ hồ sơ tự bỏ đánh dấu
j = await (await call("author-work-role", { authorId: A, workId: W2, undo: true }, owner)).json(); eq(j.cr.length, 0, "tự bỏ đánh dấu");
console.log(`OK ${ok} kiểm tra`);
