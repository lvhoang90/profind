// Thống kê truy cập ẩn danh của ProFind (không cookie, không lưu IP hay User-Agent).
//   POST /api/visit?ref=<host>&rv=<lần ghé>&us=<utm_source>&uc=<utm_campaign> → một lượt truy cập (mỗi phiên trình duyệt một lần)
//   POST /api/visit?d=<giây>&f=1   → thời lượng hoạt động (f=1 ở lần gửi đầu của phiên)
//   POST /api/visit?evt=<sự kiện>[&k=<mã>&t=<tên>] → đếm một sự kiện; author_view / work_open / search còn cộng vào bảng xếp hạng nội dung
//   GET  /api/visit → { enabled, total, today, week }
// Sự kiện chỉ là bộ đếm tổng hợp; từ khóa tìm kiếm được gộp chung, không gắn với người dùng hay thiết bị.
import { makeStore } from "./_store.js";
export const config = { runtime: "edge" };

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python-requests/i;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const dayKey = (back = 0) => new Date(Date.now() + 7 * 3600e3 - back * 864e5).toISOString().slice(0, 10);
const utmPart = (v) => { const s = String(v || "").toLowerCase(); return /^[a-z0-9_-]{1,30}$/.test(s) ? s : ""; };
const tidy = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function refOf(raw, selfHost) {
  const h = String(raw || "").toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if (!/^[a-z0-9.-]{3,80}$/.test(h) || h === selfHost.replace(/^www\./, "")) return "direct";
  if (/google\./.test(h)) return "google"; if (/bing\.com$/.test(h)) return "bing";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return "facebook"; if (/zalo/.test(h)) return "zalo";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(h)) return "x"; if (/linkedin\.com$|lnkd\.in$/.test(h)) return "linkedin";
  if (/(chatgpt|openai|perplexity|claude|gemini|copilot)/.test(h)) return "ai";
  if (/(^|\.)isavn\.edu\.vn$/.test(h)) return "isa:" + h.split(".")[0];
  return h.slice(0, 60);
}
function parseUa(ua) {
  const device = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /coc_coc/i.test(ua) ? "Cốc Cốc" : /firefox|fxios/i.test(ua) ? "Firefox" : /samsungbrowser/i.test(ua) ? "Samsung" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Khác";
  return { device, browser };
}
// Sự kiện: hành động tiêu biểu trong ProFind, lời mời đăng ký, và các điểm chạm sang hệ sinh thái ISA (go_<đích>_<vị trí>).
const EVENTS = new Set(["search", "filter", "author_view", "work_open", "csv", "save_gate", "save_author", "save_search", "reg_open", "reg_start", "reg_done", "login_done", "theme", "lang", "corr_open", "corr_sent", "banner_show", "nudge_show", "nudge_click", "account_open", "eco_show"]);
const GO_RE = /^go_(edufind|ami|may)_(footer|ecosystem|author|work|account|empty|header|nudge|welcome)$/;
const okEvent = (e) => EVENTS.has(e) || GO_RE.test(e);

export default async function handler(request) {
  const store = makeStore();
  if (!store) return json({ enabled: false });
  const q = new URL(request.url).searchParams, ua = request.headers.get("user-agent") || "";
  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase(), d = dayKey(), p = "profind:all";

  if (request.method === "POST") {
    if (BOT.test(ua)) return json({ ok: true });
    try {
      const cmds = [];
      if (q.has("d")) {
        cmds.push(["HINCRBY", `${p}:dur:${d}`, "sum", Math.max(0, Math.min(1800, Math.round(Number(q.get("d")) || 0)))]);
        if (q.get("f") === "1") cmds.push(["HINCRBY", `${p}:dur:${d}`, "n", 1]);
        cmds.push(["EXPIRE", `${p}:dur:${d}`, 60 * 86400]);
      }
      const evt = q.get("evt");
      if (evt && okEvent(evt)) {
        cmds.push(["HINCRBY", `${p}:evt:${d}`, evt, 1], ["EXPIRE", `${p}:evt:${d}`, 60 * 86400]);
        const k = String(q.get("k") || ""), t = tidy(q.get("t"), 140);
        if (evt === "author_view" && /^A\d{4,14}$/.test(k)) cmds.push(["HINCRBY", "profind:top:a", k, 1], ["HSET", "profind:top:t", k, t || k]);
        if (evt === "work_open" && /^[A-Za-z0-9._-]{4,60}$/.test(k)) cmds.push(["HINCRBY", "profind:top:w", k, 1], ["HSET", "profind:top:t", k, t || k]);
        if (evt === "search" && t.length >= 3) cmds.push(["HINCRBY", "profind:top:q", t.toLowerCase().slice(0, 60), 1]);
      }
      if (!q.has("d") && !q.has("evt") && !q.has("probe")) { // lượt truy cập
        const dim = (name, v) => cmds.push(["HINCRBY", `${p}:${name}:${d}`, v, 1], ["EXPIRE", `${p}:${name}:${d}`, 60 * 86400]);
        cmds.push(["INCR", `${p}:total`], ["INCR", `${p}:d:${d}`], ["EXPIRE", `${p}:d:${d}`, 60 * 86400]);
        dim("ref", refOf(q.get("ref"), new URL(request.url).hostname));
        const { device, browser } = parseUa(ua); dim("dev", device); dim("br", browser);
        const rv = Math.floor(Number(q.get("rv"))); if (rv >= 1) dim("rv", rv >= 4 ? "4+" : String(rv));
        const us = utmPart(q.get("us")), uc = utmPart(q.get("uc")); if (us) dim("utm", `${us}|${uc || "-"}`);
        if (/^[A-Z]{2}$/.test(country) && country !== "XX" && country !== "T1") dim("cc", country);
      }
      if (cmds.length) await store.run(cmds);
    } catch { /* thống kê không được làm hỏng trang */ }
    return json({ ok: true });
  }
  try {
    const days = Array.from({ length: 7 }, (_, i) => dayKey(6 - i));
    const [total, perDay] = await store.run([["GET", `${p}:total`], ["MGET", ...days.map((x) => `${p}:d:${x}`)]]);
    const series = (perDay || []).map(Number);
    const cc = {}; for (const flat of await store.run(days.map((x) => ["HGETALL", `${p}:cc:${x}`]))) { const a = flat || []; for (let i = 0; i + 1 < a.length; i += 2) cc[a[i]] = (cc[a[i]] || 0) + Number(a[i + 1]); }
    const countries = Object.entries(cc).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([c, n]) => ({ c, n }));
    return json({ enabled: true, total: Number(total || 0), today: series[6] || 0, week: series.reduce((a, b) => a + b, 0), days: days.map((d, i) => ({ d, n: series[i] || 0 })), countries });
  } catch { return json({ enabled: false }); }
}
