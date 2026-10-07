// Tài khoản ProFind: đăng ký/đăng nhập không mật khẩu bằng mã 6 số gửi qua email, kèm số điện thoại liên hệ (bắt buộc khi đăng ký),
// lưu tác giả, lưu tìm kiếm, công trình đã xem, thống kê dùng và trang quản trị. Một hàm Edge, chọn thao tác bằng ?op=
//   GET  config | me | history | favs | ss | rv | export | admin-summary | admin-users | admin-traffic | admin-content | admin-csv | unsub
//   POST request {email, phone, name, consent, lang} → gửi mã | verify {email, code} → đăng nhập, tạo tài khoản nếu chưa có
//        logout | profile | delete | track | hop {to, place} | fav | ssave | rvput | rvdel
//
// CAM KẾT: miễn phí vĩnh viễn cho mọi người dùng đã đăng ký. Đăng ký chỉ để lưu dữ liệu cá nhân, liên hệ và hoàn thiện công cụ;
// không chặn, không giới hạn, không thu phí bất kỳ tính năng nào của ProFind.
//
// Biến môi trường (Vercel):
//   Gửi email  MAIL_PROVIDER=resend + RESEND_API_KEY + MAIL_FROM ("ProFind <no-reply@tên-miền-đã-xác-minh>")
//              hoặc MAIL_PROVIDER=brevo + BREVO_API_KEY + MAIL_FROM; MAIL_PROVIDER=console (chỉ chạy thử, in mã ra nhật ký)
//   Lưu trữ    KV_REST_API_URL + KV_REST_API_TOKEN (hoặc UPSTASH_REDIS_REST_URL/TOKEN)
//   Bảo mật    SESSION_SECRET (chuỗi ngẫu nhiên dài, bắt buộc)
//   Quản trị   ADMIN_EMAILS=email1,email2
// Thiếu một trong các mục trên thì tính năng tự tắt (config.enabled=false), mọi chức năng khác của ProFind vẫn chạy bình thường.
import { makeStore } from "./_store.js";
import { mailProvider, sendMail, codeMail, welcomeMail } from "./_mail.js";
export const config = { runtime: "edge" };

const PLEDGE = { vi: "Miễn phí vĩnh viễn cho mọi người dùng đã đăng ký và xác thực email.", en: "Free forever for every user who registers and verifies their email." };
const OTP_TTL = 600, MAX_TRIES = 5, COOLDOWN = 45, SESSION_DAYS = 180, COOKIE = "profind_s";
const EMAIL_RE = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const PHONE_RE = /^(0|84)(3|5|7|8|9)\d{8}$/; // di động Việt Nam, đã bỏ khoảng trắng, dấu chấm, gạch và "+"
const PROFILE_FIELDS = { name: 80, job: 80, org: 120, address: 200 };
const KEY_RE = /^[aw]\|[A-Za-z0-9._-]{1,60}$/; // a|<mã tác giả> hoặc w|<mã công trình>
const FAV_MAX = 300, SS_MAX = 30, SS_Q_MAX = 80, RV_MAX = 150, RV_TTL = 90 * 864e5;
const REASONS = ["reg", "banner", "fav", "ss", "csv", "view", "eco"];
const APPS = ["edufind", "ami", "may"];
const K = { user: (id) => `profind:u:${id}`, cnt: (id) => `profind:uc:${id}`, users: "profind:users", otp: (id) => `profind:otp:${id}`, rl: (k) => `profind:arl:${k}`, au: (d) => `profind:au:${d}`, fav: (id) => `profind:fav:${id}`, uh: (id) => `profind:uh:${id}`, ss: (id) => `profind:ss:${id}`, rv: (id) => `profind:rv:${id}`, favTop: "profind:favtop", favTitle: "profind:favtt" };

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const tidy = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const dayKey = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10); // ngày theo giờ Việt Nam
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64url = (s) => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
const sha = async (s, n = 24) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s))).slice(0, n);
const safeEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const pairs = (a) => { const o = {}; for (let i = 0; i < (a || []).length; i += 2) o[a[i]] = a[i + 1]; return o; };
const normPhone = (p) => String(p ?? "").replace(/[\s.()-]/g, "").replace(/^\+/, "");
/** Điểm tích cực: số ngày quay lại quan trọng nhất, rồi số lượt, số tác giả lưu. */
const activityScore = (c = {}, favs = 0) => Number(c.days || 0) * 3 + Number(c.visits || 0) + Number(favs || 0) * 2;

export default async function handler(request) {
  const url = new URL(request.url), op = url.searchParams.get("op") || "config";
  const store = makeStore();
  const secret = process.env.SESSION_SECRET || (store?.kind === "memory" ? "profind-dev-secret" : "");
  const enabled = !!(store && mailProvider() && secret);
  const adminEmails = String(process.env.ADMIN_EMAILS || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  const isAdmin = (u) => !!u && adminEmails.includes(u.email);

  if (op === "config") return json({ enabled, pledge: PLEDGE, persistent: store?.kind === "redis", adminConfigured: adminEmails.length > 0 });
  if (!enabled) return json({ error: "Chức năng đăng ký chưa được bật." }, 503);

  const one = async (cmd) => (await store.run([cmd]))[0];
  const hmac = async (s) => { const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return hex(await crypto.subtle.sign("HMAC", key, enc.encode(s))); };
  const cookies = Object.fromEntries(String(request.headers.get("cookie") || "").split(/;\s*/).map((p) => { const i = p.indexOf("="); return i < 0 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)]; }));
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const cookie = (v, maxAge) => ({ "set-cookie": `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}` });
  async function signToken(uid) { const p = b64url(`${uid}.${Date.now() + SESSION_DAYS * 864e5}`); return `${p}.${await hmac(p)}`; }
  async function readToken(tok) {
    const [p, sig] = String(tok || "").split(".");
    if (!p || !sig || !safeEq(sig, await hmac(p))) return null;
    try { const [uid, exp] = unb64url(p).split("."); return Number(exp) > Date.now() && /^[a-f0-9]{24}$/.test(uid) ? uid : null; } catch { return null; }
  }
  const loadUser = async (id) => { try { const raw = await one(["GET", K.user(id)]); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const saveUser = (u) => one(["SET", K.user(u.id), JSON.stringify(u)]);
  /** Mức hoàn thiện hồ sơ (5 mục, mỗi mục 20%). */
  const profilePct = (u) => Math.round(["name", "phone", "job", "org", "address"].filter((k) => String(u[k] || "").trim()).length * 20);
  const counts = (h) => ({ visits: Number(h.visits || 0), days: Number(h.days || 0), login: Number(h.login || 0), views: Number(h.views || 0), searches: Number(h.searches || 0) });
  const hopsOf = (h) => Object.fromEntries(APPS.map((a) => [a, Number(h[`hop_${a}`] || 0)]));
  const pub = (u, h) => ({ email: u.email, name: u.name || "", phone: u.phone || "", job: u.job || "", org: u.org || "", address: u.address || "", createdAt: u.createdAt, regVisits: u.regVisits || 0, regReason: u.regReason || "", lastSeen: h.lastSeen || u.createdAt, plan: "free-forever", isAdmin: isAdmin(u), profilePct: profilePct(u), utm: u.utm || "", consentAt: u.consentAt || "", noMail: !!u.noMail, hops: hopsOf(h), counts: counts(h) });
  const limit = async (key, max, ex) => { const [n] = await store.run([["INCR", K.rl(key)]]); if (n === 1) await one(["EXPIRE", K.rl(key), String(ex)]); return n <= max; };

  const uid = await readToken(cookies[COOKIE]);
  const me = uid ? await loadUser(uid) : null;
  const needUser = () => (me ? null : json({ error: "Bạn chưa đăng nhập." }, 401));
  const needAdmin = () => (isAdmin(me) ? null : json({ error: "Chỉ dành cho quản trị viên." }, 403));
  if (request.method !== "GET") {
    const o = request.headers.get("origin");
    if (o) { try { if (new URL(o).host !== url.host) return json({ error: "Yêu cầu không hợp lệ." }, 403); } catch { return json({ error: "Yêu cầu không hợp lệ." }, 403); } }
  }
  let body = {};
  if (request.method === "POST") { try { const t = await request.text(); body = t.length < 30000 && t ? JSON.parse(t) : {}; } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); } }
  const mine = async (kf) => Object.entries(pairs(await one(["HGETALL", kf(me.id)]))).map(([k, v]) => { try { return { k, ...JSON.parse(v) }; } catch { return null; } }).filter(Boolean);

  try {
    if (op === "me") return json({ user: me ? pub(me, pairs(await one(["HGETALL", K.cnt(me.id)]))) : null });

    if (op === "request" && request.method === "POST") {
      const email = String(body.email || "").trim().toLowerCase(), lang = body.lang === "en" ? "en" : "vi", phone = normPhone(body.phone);
      if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: lang === "en" ? "Invalid email." : "Email chưa đúng định dạng." }, 400);
      // Đăng ký gửi kèm số điện thoại và đồng ý; đăng nhập chỉ cần email (người chưa có tài khoản sẽ được bổ sung thông tin sau khi nhập mã, không để lộ email nào đã đăng ký).
      if (phone) {
        if (!PHONE_RE.test(phone)) return json({ error: lang === "en" ? "Enter a Vietnamese mobile number, e.g. 0912345678." : "Nhập số điện thoại di động Việt Nam, ví dụ 0912345678." }, 400);
        if (body.consent !== true) return json({ error: lang === "en" ? "Please agree to how we handle your information." : "Vui lòng đồng ý với cách chúng tôi xử lý thông tin để tiếp tục." }, 400);
      }
      const id = await sha(email);
      let rec = null; try { const old = await one(["GET", K.otp(id)]); rec = old ? JSON.parse(old) : null; } catch { /* bỏ qua */ }
      if (rec && Date.now() - rec.sent < COOLDOWN * 1000) { const s = Math.ceil((COOLDOWN * 1000 - (Date.now() - rec.sent)) / 1000); return json({ error: `Vui lòng đợi ${s} giây rồi gửi lại mã.`, retry: s }, 429); }
      const ip = (request.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
      if (!(await limit(`e:${id}`, 5, 3600)) || !(await limit(`ip:${await sha(ip, 16)}`, 30, 3600))) return json({ error: "Bạn yêu cầu mã quá nhiều lần. Vui lòng thử lại sau một giờ." }, 429);
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
      try { await sendMail(email, codeMail(code, lang)); } catch (e) { console.error("[mail]", e.message); return json({ error: "Chưa gửi được email xác thực. Vui lòng thử lại sau ít phút.", detail: String(e.message).slice(0, 220) }, 502); }
      await one(["SET", K.otp(id), JSON.stringify({ h: await hmac(`${email}:${code}`), sent: Date.now(), tries: 0, consentAt: phone ? new Date().toISOString() : "", phone, name: tidy(body.name, 80) }), "EX", String(OTP_TTL)]);
      return json({ ok: true, retry: COOLDOWN });
    }

    if (op === "verify" && request.method === "POST") {
      const email = String(body.email || "").trim().toLowerCase(), code = String(body.code || "").replace(/\D/g, ""), id = await sha(email);
      let rec = null; try { const raw = await one(["GET", K.otp(id)]); rec = raw ? JSON.parse(raw) : null; } catch { /* bỏ qua */ }
      if (!rec) return json({ error: "Mã đã hết hạn hoặc chưa được gửi. Hãy gửi lại mã mới." }, 400);
      if (rec.tries >= MAX_TRIES) { await one(["DEL", K.otp(id)]); return json({ error: "Nhập sai quá nhiều lần. Hãy gửi lại mã mới." }, 429); }
      if (!(code.length === 6 && safeEq(await hmac(`${email}:${code}`), rec.h))) {
        rec.tries++; await one(["SET", K.otp(id), JSON.stringify(rec), "EX", String(OTP_TTL)]);
        return json({ error: `Mã chưa đúng. Bạn còn ${MAX_TRIES - rec.tries} lần thử.` }, 400);
      }
      let user = await loadUser(id), isNew = false; const now = new Date().toISOString();
      if (!user && !rec.phone) { // email chưa có tài khoản và chưa khai số điện thoại: yêu cầu bổ sung, giữ nguyên mã để nhập lại một lần
        const phone2 = normPhone(body.phone);
        if (!phone2) return json({ need: "profile" });
        if (!PHONE_RE.test(phone2)) return json({ error: "Nhập số điện thoại di động Việt Nam, ví dụ 0912345678." }, 400);
        if (body.consent !== true) return json({ error: "Vui lòng đồng ý với cách chúng tôi xử lý thông tin để tiếp tục." }, 400);
        rec.phone = phone2; rec.name = tidy(body.name, 80); rec.consentAt = now;
      }
      await one(["DEL", K.otp(id)]);
      if (!user) {
        isNew = true;
        const us = /^[a-z0-9_-]{1,30}$/.test(String(body.us || "")) ? String(body.us) : "";
        user = { id, email, lang: body.lang === "en" ? "en" : "vi", name: rec.name || "", phone: rec.phone || "", job: "", org: "", address: "", createdAt: now, verifiedAt: now, consentAt: rec.consentAt, regVisits: Math.min(99, Math.max(0, Math.floor(Number(body.rv)) || 0)), regReason: REASONS.includes(body.reason) ? body.reason : "" };
        if (us) user.utm = us;
        await store.run([["SET", K.user(id), JSON.stringify(user)], ["SADD", K.users, id],
          ["HINCRBY", `profind:all:evt:${dayKey()}`, "reg_done", 1], ["EXPIRE", `profind:all:evt:${dayKey()}`, 60 * 86400],
          ...(us ? [["HINCRBY", `profind:all:suts:${dayKey()}`, us, 1], ["EXPIRE", `profind:all:suts:${dayKey()}`, 60 * 86400]] : [])]);
        await sendWelcome(user);
      } else if (!user.phone && rec.phone) { user.phone = rec.phone; await saveUser(user); }
      await one(["HINCRBY", K.cnt(id), "login", "1"]);
      return json({ user: pub(user, pairs(await one(["HGETALL", K.cnt(id)]))), isNew }, 200, cookie(await signToken(id), SESSION_DAYS * 86400));
    }

    /** Thư chào mừng: tắt bằng WELCOME_MAIL=0. Lỗi gửi không làm hỏng đăng nhập. */
    async function sendWelcome(u) {
      if (process.env.WELCOME_MAIL === "0") return;
      try {
        const pubO = (process.env.PUBLIC_ORIGIN || "https://profind.isavn.edu.vn").replace(/\/$/, ""), utmq = "utm_source=email&utm_medium=welcome&utm_campaign=new_user";
        const go = (app) => `https://isavn.edu.vn/go/${app}?from=profind&utm_source=profind&utm_medium=email&utm_campaign=welcome`;
        const mail = welcomeMail({ lang: u.lang === "en" ? "en" : "vi", u: { account: `${pubO}/?${utmq}#/tai-khoan`, profile: `${pubO}/?${utmq}#/tai-khoan/ho-so`, start: `${pubO}/?${utmq}`, edufind: go("edufind"), ami: go("ami"), may: go("may"), unsub: `${pubO}/api/account?op=unsub&u=${u.id}&s=${(await hmac(`unsub:${u.id}`)).slice(0, 32)}` } });
        await Promise.race([sendMail(u.email, mail), new Promise((_, rej) => setTimeout(() => rej(new Error("hết thời gian gửi")), 4000))]);
        await store.run([["HINCRBY", `profind:all:evt:${dayKey()}`, "welcome_sent", 1], ["EXPIRE", `profind:all:evt:${dayKey()}`, 60 * 86400]]);
      } catch (e) { console.error("[welcome]", e.message); }
    }

    if (op === "unsub" && request.method === "GET") {
      const id = url.searchParams.get("u") || "", sig = url.searchParams.get("s") || "";
      const page = (msg) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProFind</title><body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#0f2a3d"><h2>ProFind</h2><p>${msg}</p><p><a href="/">profind.isavn.edu.vn</a></p>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
      if (!/^[a-f0-9]{24}$/.test(id) || !safeEq((await hmac(`unsub:${id}`)).slice(0, 32), sig)) return page("Liên kết không hợp lệ hoặc đã hết hiệu lực.");
      const u = await loadUser(id); if (u) { u.noMail = true; await saveUser(u); }
      return page("Đã tắt các thư thông tin của ProFind. Thư mã xác thực vẫn được gửi khi bạn yêu cầu đăng nhập. Bạn vẫn dùng ProFind bình thường.");
    }

    if (op === "logout" && request.method === "POST") return json({ ok: true }, 200, cookie("", 0));

    if (op === "hop" && request.method === "POST") { // người đã đăng nhập bấm sang EduFind, Ami hoặc Mây
      const bad = needUser(); if (bad) return bad;
      const to = APPS.includes(body.to) ? body.to : ""; if (!to) return json({ error: "Không hợp lệ." }, 400);
      await one(["HINCRBY", K.cnt(me.id), `hop_${to}`, "1"]);
      return json({ ok: true });
    }

    if (op === "track" && request.method === "POST") { // một lượt dùng trong ngày (mỗi phiên trình duyệt gọi một lần)
      const bad = needUser(); if (bad) return bad;
      const d = dayKey(), h = pairs(await one(["HGETALL", K.cnt(me.id)]));
      const cmds = [["HINCRBY", K.cnt(me.id), "visits", "1"], ["HSET", K.cnt(me.id), "lastSeen", new Date().toISOString()]];
      if (h.lastDay !== d) cmds.push(["HINCRBY", K.cnt(me.id), "days", "1"], ["HSET", K.cnt(me.id), "lastDay", d]);
      cmds.push(["SADD", K.au(d), me.id], ["EXPIRE", K.au(d), String(60 * 86400)], ["HINCRBY", K.uh(me.id), d, "1"]);
      if (h.lastDay !== d) { const old = Object.keys(pairs(await one(["HGETALL", K.uh(me.id)]))).filter((f) => f < dayKey(new Date(Date.now() - 100 * 864e5))); old.forEach((f) => cmds.push(["HDEL", K.uh(me.id), f])); }
      await store.run(cmds);
      return json({ ok: true });
    }

    if (op === "profile" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      for (const [k, max] of Object.entries(PROFILE_FIELDS)) if (body[k] !== undefined) me[k] = tidy(body[k], max);
      if (body.phone !== undefined) { const p = normPhone(tidy(body.phone, 20)); if (p && !PHONE_RE.test(p)) return json({ error: "Số điện thoại di động chưa đúng định dạng." }, 400); me.phone = p; }
      if (body.noMail !== undefined) me.noMail = !!body.noMail;
      await saveUser(me);
      return json({ user: pub(me, pairs(await one(["HGETALL", K.cnt(me.id)]))) });
    }

    if (op === "history" && request.method === "GET") {
      const bad = needUser(); if (bad) return bad;
      const h = pairs(await one(["HGETALL", K.uh(me.id)]));
      return json({ days: Object.entries(h).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 90).map(([d, n]) => ({ d, n: Number(n) })) });
    }

    // ---- Tác giả / công trình đã lưu (k = a|<mã tác giả> hoặc w|<mã công trình>) ----
    if (op === "favs" && request.method === "GET") {
      const bad = needUser(); if (bad) return bad;
      return json({ items: (await mine(K.fav)).sort((a, b) => String(b.at).localeCompare(String(a.at))) });
    }
    if (op === "fav" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      const k = String(body.k || ""); if (!KEY_RE.test(k)) return json({ error: "Mã không hợp lệ." }, 400);
      if (body.on === false) { if (await one(["HDEL", K.fav(me.id), k])) await store.run([["HINCRBY", K.favTop, k, "-1"]]); return json({ ok: true }); }
      const n = await one(["HLEN", K.fav(me.id)]); let had = null; try { const old = await one(["HGET", K.fav(me.id), k]); had = old ? JSON.parse(old) : null; } catch { /* bỏ qua */ }
      if (!had && n >= FAV_MAX) return json({ error: `Bạn đã lưu tối đa ${FAV_MAX} mục.` }, 400);
      const title = tidy(body.t, 140) || had?.t || "";
      const rec = { t: title, s: tidy(body.s, 160) || had?.s || "", sc: Number.isFinite(Number(body.sc)) ? Math.round(Number(body.sc) * 100) / 100 : had?.sc, rk: Number.isFinite(Number(body.rk)) && Number(body.rk) > 0 ? Math.floor(Number(body.rk)) : had?.rk, at: had?.at || new Date().toISOString() };
      const cmds = [["HSET", K.fav(me.id), k, JSON.stringify(rec)]]; if (!had) cmds.push(["HINCRBY", K.favTop, k, "1"], ["HSET", K.favTitle, k, title]);
      await store.run(cmds);
      return json({ ok: true });
    }

    // ---- Đã xem: đồng bộ từ trình duyệt, tối đa RV_MAX, hết hạn sau RV_TTL ----
    if (op === "rv" && request.method === "GET") {
      const bad = needUser(); if (bad) return bad;
      const now = Date.now();
      return json({ items: (await mine(K.rv)).filter((x) => now - Number(x.at) < RV_TTL).sort((a, b) => Number(b.at) - Number(a.at)) });
    }
    if (op === "rvput" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      const now = Date.now(), cmds = []; let nv = 0;
      for (const r of (Array.isArray(body.items) ? body.items.slice(0, 40) : [])) {
        const k = String(r?.k || ""); if (!KEY_RE.test(k)) continue;
        const rec = { t: tidy(r.t, 140), s: tidy(r.s, 160), at: Math.min(now, Math.max(0, Number(r.at) || now)), n: Math.min(999, Math.max(1, Number(r.n) || 1)), u: /^https:\/\/(doi\.org|openalex\.org)\/[A-Za-z0-9._()\/;:-]{1,120}$/.test(String(r.u || "")) ? String(r.u) : "" };
        if (!rec.t) continue; cmds.push(["HSET", K.rv(me.id), k, JSON.stringify(rec)]); nv++;
      }
      if (cmds.length) await store.run([...cmds, ["HINCRBY", K.cnt(me.id), "views", String(nv)]]);
      const all = pairs(await one(["HGETALL", K.rv(me.id)])), keys = Object.keys(all);
      if (keys.length > RV_MAX) {
        const old = keys.map((k) => { let at = 0; try { at = Number(JSON.parse(all[k]).at) || 0; } catch { /* bỏ qua */ } return [k, at]; }).sort((a, b) => a[1] - b[1]).slice(0, keys.length - RV_MAX);
        await store.run(old.map(([k]) => ["HDEL", K.rv(me.id), k]));
      }
      return json({ ok: true });
    }
    if (op === "rvdel" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      if (body.all === true) await one(["DEL", K.rv(me.id)]); else if (KEY_RE.test(String(body.k || ""))) await one(["HDEL", K.rv(me.id), String(body.k)]);
      return json({ ok: true });
    }

    // ---- Tìm kiếm đã lưu: từ khóa + bộ lọc để mở lại đúng kết quả ----
    if (op === "ss" && request.method === "GET") {
      const bad = needUser(); if (bad) return bad;
      return json({ items: (await mine(K.ss)).sort((a, b) => String(b.at).localeCompare(String(a.at))) });
    }
    if (op === "ssave" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      const f = { q: tidy(body.q, SS_Q_MAX), d: tidy(body.d, 40), ty: tidy(body.ty, 30), i: tidy(body.i, 60), sc: body.sc === "all" ? "all" : "vn" };
      if (!f.q && !f.d && !f.ty && !f.i) return json({ error: "Hãy nhập từ khóa hoặc chọn bộ lọc trước khi lưu." }, 400);
      const k = `${f.d}|${f.ty}|${f.i}|${f.sc}|${f.q.toLowerCase()}`;
      if (body.on === false) { await one(["HDEL", K.ss(me.id), k]); return json({ ok: true, k }); }
      const n = await one(["HLEN", K.ss(me.id)]), had = await one(["HGET", K.ss(me.id), k]);
      if (!had && n >= SS_MAX) return json({ error: `Bạn đã lưu tối đa ${SS_MAX} tìm kiếm.` }, 400);
      await one(["HSET", K.ss(me.id), k, JSON.stringify({ ...f, label: tidy(body.label, 120), at: had ? (JSON.parse(had).at || new Date().toISOString()) : new Date().toISOString() })]);
      await one(["HINCRBY", K.cnt(me.id), "searches", "1"]);
      return json({ ok: true, k });
    }

    if (op === "export" && request.method === "GET") { // tải toàn bộ dữ liệu của chính mình (quyền của chủ dữ liệu)
      const bad = needUser(); if (bad) return bad;
      const data = { exportedAt: new Date().toISOString(), account: pub(me, pairs(await one(["HGETALL", K.cnt(me.id)]))), saved: await mine(K.fav), searches: await mine(K.ss), viewed: await mine(K.rv) };
      return new Response(JSON.stringify(data, null, 1), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="profind-du-lieu-cua-toi-${dayKey()}.json"`, "cache-control": "no-store" } });
    }

    if (op === "delete" && request.method === "POST") {
      const bad = needUser(); if (bad) return bad;
      const favs = pairs(await one(["HGETALL", K.fav(me.id)]));
      await store.run([["DEL", K.user(me.id)], ["DEL", K.cnt(me.id)], ["SREM", K.users, me.id], ["DEL", K.fav(me.id)], ["DEL", K.uh(me.id)], ["DEL", K.ss(me.id)], ["DEL", K.rv(me.id)], ...Object.keys(favs).map((k) => ["HINCRBY", K.favTop, k, "-1"])]);
      return json({ ok: true }, 200, cookie("", 0));
    }

    // ---------------- Quản trị ----------------
    if (op.startsWith("admin-") && request.method === "GET") {
      const bad = needAdmin(); if (bad) return bad;
      const ids = (await one(["SMEMBERS", K.users])) || [];
      const raw = await store.run(ids.flatMap((id) => [["GET", K.user(id)], ["HGETALL", K.cnt(id)], ["HLEN", K.fav(id)], ["HLEN", K.ss(id)]]));
      const list = [];
      ids.forEach((id, i) => {
        let u = null; try { u = raw[i * 4] ? JSON.parse(raw[i * 4]) : null; } catch { /* bỏ qua */ }
        if (!u) return;
        const p = pub(u, pairs(raw[i * 4 + 1])); const favs = Number(raw[i * 4 + 2] || 0);
        list.push({ ...p, favs, searches: Number(raw[i * 4 + 3] || 0), score: activityScore(p.counts, favs), eco: p.hops.edufind + p.hops.ami + p.hops.may });
      });
      const SORT_KEYS = { score: (u) => u.score, days: (u) => u.counts.days, visits: (u) => u.counts.visits, favs: (u) => u.favs, eco: (u) => u.eco, profile: (u) => u.profilePct, lastSeen: (u) => String(u.lastSeen || ""), createdAt: (u) => String(u.createdAt || ""), name: (u) => String(u.name || "").toLowerCase(), email: (u) => String(u.email || "").toLowerCase(), org: (u) => String(u.org || "").toLowerCase() };
      const TEXT_KEYS = new Set(["name", "email", "org"]);
      const sortKey = SORT_KEYS[url.searchParams.get("sort")] ? url.searchParams.get("sort") : "score";
      const sortAsc = url.searchParams.has("dir") ? url.searchParams.get("dir") === "asc" : TEXT_KEYS.has(sortKey);
      const sort = (a, b) => {
        const x = SORT_KEYS[sortKey](a), y = SORT_KEYS[sortKey](b), ex = x === "" || x == null, ey = y === "" || y == null;
        if (ex !== ey) return ex ? 1 : -1;
        const c = typeof x === "string" ? x.localeCompare(y, "vi") : x - y;
        return c ? (sortAsc ? c : -c) : (b.score - a.score) || String(a.email).localeCompare(String(b.email));
      };
      const SEGS = { all: () => true, noprofile: (u) => u.profilePct <= 40, full: (u) => u.profilePct === 100, edufind: (u) => u.hops.edufind > 0, ami: (u) => u.hops.ami > 0, may: (u) => u.hops.may > 0, noeco: (u) => u.eco === 0, saver: (u) => u.favs > 0, oneday: (u) => u.counts.days <= 1 };
      const segCounts = Object.fromEntries(Object.entries(SEGS).map(([k, f]) => [k, list.filter(f).length]));
      const filtered = () => { const q = String(url.searchParams.get("q") || "").toLowerCase().trim(), f = SEGS[url.searchParams.get("f")] || SEGS.all; return list.filter((u) => f(u) && (!q || [u.email, u.name, u.job, u.org, u.address, u.phone].join(" ").toLowerCase().includes(q))).sort(sort); };
      const sum = (a) => a.reduce((x, y) => x + Number(y || 0), 0);

      if (op === "admin-users") {
        const out = filtered(), per = Math.max(5, Math.min(100, Number(url.searchParams.get("per")) || 25)), pages = Math.max(1, Math.ceil(out.length / per));
        const page = Math.max(1, Math.min(pages, Number(url.searchParams.get("page")) || 1));
        return json({ total: out.length, page, pages, per, seg: segCounts, users: out.slice((page - 1) * per, page * per) });
      }
      if (op === "admin-summary") {
        const now = Date.now(), week = 7 * 864e5, dayList = (n) => Array.from({ length: n }, (_, i) => dayKey(new Date(now - (n - 1 - i) * 864e5)));
        const days = dayList(14), signAt = (u) => dayKey(new Date(u.createdAt)), dayN = (ds) => ds.map((d) => ({ d, n: list.filter((u) => signAt(u) === d).length }));
        const au = await store.run(days.map((d) => ["SCARD", K.au(d)]));
        const cnt = (key) => { const m = {}; for (const u of list) { const v = (u[key] || "").trim() || "(chưa khai)"; m[v] = (m[v] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n })); };
        const old = (d) => list.filter((u) => now - new Date(u.createdAt) >= d * 864e5), back = (arr) => arr.filter((u) => u.counts.days >= 2).length;
        const byReason = {}; for (const u of list) if (u.regReason) byReason[u.regReason] = (byReason[u.regReason] || 0) + 1;
        const sign14 = dayN(days);
        return json({
          users: list.length, returning: list.filter((u) => u.counts.days >= 2).length, savers: list.filter((u) => u.favs > 0).length, withSearch: list.filter((u) => u.searches > 0).length,
          profile: { low: list.filter((u) => u.profilePct <= 40).length, mid: list.filter((u) => u.profilePct > 40 && u.profilePct < 100).length, full: list.filter((u) => u.profilePct === 100).length, avg: list.length ? Math.round(sum(list.map((u) => u.profilePct)) / list.length) : 0 },
          eco: { edufind: list.filter((u) => u.hops.edufind > 0).length, ami: list.filter((u) => u.hops.ami > 0).length, may: list.filter((u) => u.hops.may > 0).length, any: list.filter((u) => u.eco > 0).length, hops: { edufind: sum(list.map((u) => u.hops.edufind)), ami: sum(list.map((u) => u.hops.ami)), may: sum(list.map((u) => u.hops.may)) } },
          active7: list.filter((u) => now - new Date(u.lastSeen) < week).length, new7: sum(sign14.slice(7).map((x) => x.n)), newPrev7: sum(sign14.slice(0, 7).map((x) => x.n)),
          activeDaily: days.map((d, i) => ({ d, n: Number(au[i] || 0) })), signups: sign14, top: [...list].sort((a, b) => b.score - a.score).slice(0, 8),
          byJob: cnt("job"), byOrg: cnt("org"), byReason, ret1: { n: old(1).length, back: back(old(1)) }, ret7: { n: old(7).length, back: back(old(7)) },
          favTotal: sum(list.map((u) => u.favs)), searchTotal: sum(list.map((u) => u.searches)), persistent: store.kind === "redis", mail: { welcome: process.env.WELCOME_MAIL !== "0" },
        });
      }
      if (op === "admin-traffic" || op === "admin-content") {
        const now = Date.now(), days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(now - (13 - i) * 864e5))), last7 = days.slice(7);
        if (op === "admin-content") {
          const [ta, tw, tq, tt, ft, ftt] = await store.run([["HGETALL", "profind:top:a"], ["HGETALL", "profind:top:w"], ["HGETALL", "profind:top:q"], ["HGETALL", "profind:top:t"], ["HGETALL", K.favTop], ["HGETALL", K.favTitle]]);
          const top = (flat, titles) => Object.entries(pairs(flat)).map(([k, n]) => ({ k, name: titles?.[k] || k, n: Number(n) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10);
          const T = pairs(tt), FT = pairs(ftt);
          return json({ authors: top(ta, T), works: top(tw, T), queries: top(tq), saved: top(ft, FT) });
        }
        const dims = ["ref", "dev", "br", "cc", "utm", "suts"];
        const res = await store.run([["MGET", ...days.map((d) => `profind:all:d:${d}`)], ...dims.flatMap((m) => last7.map((d) => ["HGETALL", `profind:all:${m}:${d}`])), ...days.map((d) => ["HGETALL", `profind:all:dur:${d}`]), ...days.map((d) => ["HGETALL", `profind:all:rv:${d}`]), ...days.map((d) => ["HGETALL", `profind:all:evt:${d}`])]);
        const base = 1 + dims.length * 7, perDay = (res[0] || []).map((v, i) => ({ d: days[i], n: Number(v || 0) }));
        const agg = (mi) => { const m = {}; for (let i = 0; i < 7; i++) for (const [k, v] of Object.entries(pairs(res[1 + mi * 7 + i]))) m[k] = (m[k] || 0) + Number(v); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })); };
        const dur = days.map((d, i) => { const h = pairs(res[base + i]); return { d, sum: Number(h.sum || 0), n: Number(h.n || 0) }; });
        const rvDay = days.map((d, i) => { const h = pairs(res[base + 14 + i]); return { d, "1": Number(h["1"] || 0), "2": Number(h["2"] || 0), "3": Number(h["3"] || 0), "4+": Number(h["4+"] || 0) }; });
        const evt = {}, evtPrev = {}, evtDays = [];
        for (let i = 0; i < 14; i++) { const h = Object.fromEntries(Object.entries(pairs(res[base + 28 + i])).map(([k, v]) => [k, Number(v)])); evtDays.push({ d: days[i], ...h }); const t = i < 7 ? evtPrev : evt; for (const [k, v] of Object.entries(h)) t[k] = (t[k] || 0) + v; }
        return json({ days: perDay, referrers: agg(0), devices: agg(1), browsers: agg(2), countries: agg(3), utm: agg(4), utmSignups: agg(5), dur, rv: rvDay, evt, evtPrev, evtDays });
      }
      if (op === "admin-csv") {
        const rows = filtered(), cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
        const head = ["Email", "Họ tên", "Số điện thoại", "Nghề nghiệp", "Đơn vị", "Địa chỉ", "Hồ sơ (%)", "Ngày đăng ký", "Đăng ký qua", "Số lần ghé trước khi đăng ký", "Nguồn", "Đồng ý lúc", "Lần cuối", "Số ngày dùng", "Số lượt", "Tác giả đã lưu", "Tìm kiếm đã lưu", "Sang EduFind", "Sang Ami", "Sang Mây"];
        const data = rows.map((u) => [u.email, u.name, u.phone, u.job, u.org, u.address, u.profilePct, u.createdAt, u.regReason, u.regVisits, u.utm, u.consentAt, u.lastSeen, u.counts.days, u.counts.visits, u.favs, u.searches, u.hops.edufind, u.hops.ami, u.hops.may]);
        return new Response("﻿" + [head, ...data].map((r) => r.map(cell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="nguoi-dung-profind-${dayKey()}.csv"`, "cache-control": "no-store" } });
      }
    }
    return json({ error: "Thao tác không hợp lệ." }, 400);
  } catch (e) {
    console.error("[account]", e.message);
    return json({ error: "Có lỗi xảy ra, vui lòng thử lại." }, 500);
  }
}
