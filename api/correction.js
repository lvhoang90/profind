// Nhận yêu cầu xác nhận hồ sơ / đính chính / gỡ hồ sơ từ trang ProFind và gửi email cho người quản trị (Resend).
//   POST /api/correction (multipart/form-data: kind = claim|correct|remove|add, author, authorName, name, email, orcid, msg, _honey)
// Biến môi trường (dùng chung với EduFind): RESEND_API_KEY; tùy chọn CORRECTION_TO (mặc định vienisavietnam@gmail.com), CORRECTION_FROM
// (mặc định "ProFind <onboarding@resend.dev>"), KV_REST_API_URL/KV_REST_API_TOKEN (giới hạn 5 yêu cầu/giờ/người).
// Yêu cầu CHƯA tự sửa dữ liệu: người quản trị xác minh người yêu cầu (trả lời email, ORCID, email cơ quan) rồi ghi vào data/corrections.json; yêu cầu gỡ hồ sơ được ưu tiên xử lý nhưng vẫn phải xác minh.
export const config = { runtime: "edge" };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clip = (v, n) => String(v ?? "").slice(0, n);
// Giới hạn dự phòng trong bộ nhớ (mỗi isolate) khi chưa cấu hình Redis: không thay thế Redis nhưng chặn spam đơn giản.
const MEM = new Map();
const memLimited = (ip) => { const now = Date.now(), k = ip || "?", a = (MEM.get(k) ?? []).filter((t) => now - t < 3600e3); a.push(now); MEM.set(k, a); if (MEM.size > 5000) MEM.clear(); return a.length > 5; };
const oneLine = (v, n) => clip(v, n).replace(/[\r\n\u2028\u2029]+/g, " ").trim();
const KINDS = { claim: "Xác nhận hồ sơ (đây là tôi)", correct: "Đính chính thông tin / công trình", remove: "Gỡ hồ sơ", add: "Đề nghị bổ sung nhà nghiên cứu" };

async function limited(request) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memLimited(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "?";
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`profind|${ip}`));
    const key = `profind:rl:${[...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    const r = await fetch(`${url.replace(/\/$/, "")}/pipeline`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify([["INCR", key], ["EXPIRE", key, 3600]]) });
    return Number((await r.json())?.[0]?.result) > 5;
  } catch { return false; }
}

export default async function handler(request) {
  if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
  // Chỉ nhận yêu cầu từ chính trang này (chặn gửi chéo từ trang khác) và nội dung nhỏ.
  const origin = request.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== new URL(request.url).host) return json({ ok: false, error: "origin" }, 403); } catch { return json({ ok: false, error: "origin" }, 403); } }
  if (Number(request.headers.get("content-length") || 0) > 20000) return json({ ok: false, error: "too-large" }, 413);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ ok: false, error: "not-configured" }, 503);
  let form; try { form = await request.formData(); } catch { return json({ ok: false, error: "bad-request" }, 400); }
  if (form.get("_honey")) return json({ ok: true });
  const kind = String(form.get("kind")); if (!KINDS[kind]) return json({ ok: false, error: "kind" }, 400);
  const email = clip(form.get("email"), 160).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "email" }, 400);
  const msg = clip(form.get("msg"), 4000).trim();
  if (!msg && kind === "correct") return json({ ok: false, error: "empty" }, 400);
  if (await limited(request)) return json({ ok: false, error: "rate" }, 429);
  const orcid = oneLine(form.get("orcid"), 40); if (orcid && !/^\d{4}-?\d{4}-?\d{4}-?\d{3}[\dXx]$/.test(orcid)) return json({ ok: false, error: "orcid" }, 400);
  const scholar = oneLine(form.get("scholar"), 300); if (scholar && !/^https:\/\/scholar\.google\.[a-z.]+\/citations\?[^\s]*user=[A-Za-z0-9_-]{8,14}/.test(scholar)) return json({ ok: false, error: "scholar" }, 400);
  const rows = [["Loại yêu cầu", KINDS[kind]], ...(scholar ? [["Google Scholar", scholar]] : []), ["Mã hồ sơ", oneLine(form.get("author"), 60)], ["Tên trong hồ sơ", oneLine(form.get("authorName"), 120)], ["Người gửi", oneLine(form.get("name"), 120)], ["Email", email], ["ORCID", orcid], ["Thời điểm (UTC)", new Date().toISOString()]];
  const html = `<h2>ProFind: ${esc(KINDS[kind])}</h2><table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd"><b>${esc(k)}</b></td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`).join("")}</table><h3>Nội dung</h3><p style="white-space:pre-wrap">${esc(msg || "(không có)")}</p>`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({
    from: process.env.CORRECTION_FROM || "ProFind <onboarding@resend.dev>", to: [process.env.CORRECTION_TO || "vienisavietnam@gmail.com"], reply_to: email,
    subject: `[ProFind] ${KINDS[kind]} - ${oneLine(form.get("authorName"), 60) || oneLine(form.get("author"), 40)}`, html, text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${msg}` }) });
  return r.ok ? json({ ok: true }) : json({ ok: false, error: "send" }, 502);
}
