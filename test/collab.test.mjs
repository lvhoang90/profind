// Thử đề nghị hợp tác (api/correction.js, kind=collab): thư về hộp thư ISA, bắt buộc có tổ chức và đồng ý; không gửi thư thật (fetch giả).
import { pathToFileURL } from "node:url";
import path from "node:path";
process.env.RESEND_API_KEY = "k"; process.env.CORRECTION_TO = "isa@example.test"; process.env.CORRECTION_FROM = "ProFind <no-reply@example.test>";
const sent = []; globalThis.fetch = async (u, o) => { sent.push([String(u), JSON.parse(o.body)]); return new Response("{}", { status: 200 }); };
const { default: h } = await import(pathToFileURL(path.resolve("api/correction.js")).href);
const eq = (a, b, m) => { if (a !== b) { console.error(`FAIL ${m}: ${a} !== ${b}`); process.exit(1); } };
const mk = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return new Request("https://x.test/api/correction", { method: "POST", body: f }); };
const ok = { kind: "collab", org: "ĐH Mẫu", orgType: "school", name: "A", email: "a@b.vn", need: "panel", field: "cntt", msg: "Cần hội đồng", consent: "1" };
let r = await h(mk(ok)); eq(r.status, 200, "gửi hợp lệ"); eq((await r.json()).ok, true, "ok");
eq(sent[0][1].to[0], "isa@example.test", "thư về hộp thư ISA"); eq(sent[0][1].reply_to, "a@b.vn", "trả lời tới người gửi");
eq(/ĐH Mẫu/.test(sent[0][1].subject), true, "tiêu đề có tên tổ chức"); eq(/Tìm nhà khoa học cho đề tài/.test(sent[0][1].html), true, "thư có nhu cầu");
eq((await h(mk({ ...ok, consent: "" }))).status, 400, "thiếu đồng ý"); eq((await h(mk({ ...ok, org: "" }))).status, 400, "thiếu tổ chức");
eq((await h(mk({ ...ok, msg: "" }))).status, 400, "thiếu nội dung"); eq(sent.length, 1, "không gửi thư khi dữ liệu sai");
console.log("collab: ok");
