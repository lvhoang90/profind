// Đo lường ẩn danh (api/visit.js): một lượt truy cập mỗi phiên, thời lượng hoạt động, sự kiện và điểm chạm sang hệ sinh thái ISA.
// Không cookie, không định danh; chỉ chạy khi máy chủ báo bật. Mọi lỗi mạng đều bị bỏ qua để không ảnh hưởng trang.
const VISIT = "/api/visit";
let on = true;
const post = (qs: string) => { if (!on) return; try { fetch(`${VISIT}?${qs}`, { method: "POST", keepalive: true }).then((r) => { if (r.status === 404) on = false; }).catch(() => {}); } catch { /* bỏ qua */ } };
export function evt(name: string, k?: string, t?: string) {
  const q = new URLSearchParams({ evt: name }); if (k) q.set("k", k); if (t) q.set("t", t.slice(0, 140)); post(q.toString());
}
const SKEY = "profind.session", RKEY = "profind.rv";
export function startSession() {
  try {
    if (sessionStorage.getItem(SKEY)) return; sessionStorage.setItem(SKEY, "1");
    let rv = 1; try { rv = (Number(localStorage.getItem(RKEY)) || 0) + 1; localStorage.setItem(RKEY, String(rv)); } catch { /* bỏ qua */ }
    const sp = new URLSearchParams(location.search), q = new URLSearchParams({ rv: String(rv) });
    try { if (document.referrer) q.set("ref", new URL(document.referrer).hostname); } catch { /* bỏ qua */ }
    const us = sp.get("utm_source") || (sp.get("from") ?? ""), uc = sp.get("utm_campaign"); if (us) q.set("us", us); if (uc) q.set("uc", uc);
    post(q.toString());
    // Thời lượng: gửi số giây hoạt động mỗi 30 giây khi tab đang hiện, và khi rời trang
    let last = Date.now(), first = true;
    const flush = () => { const sec = Math.round((Date.now() - last) / 1000); last = Date.now(); if (sec > 0 && sec < 1800) { post(`d=${sec}${first ? "&f=1" : ""}`); first = false; } };
    setInterval(() => { if (document.visibilityState === "visible") flush(); else last = Date.now(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); else last = Date.now(); });
  } catch { /* bỏ qua */ }
}
/** Điểm chạm sang hệ sinh thái ISA: ghi sự kiện ẩn danh và (nếu đã đăng nhập) lượt của người dùng. */
export type App = "edufind" | "ami" | "may";
export const ecoUrl = (app: App, place: string, to = "") => app === "edufind"
  ? `https://edufind.isavn.edu.vn/${to}?utm_source=profind&utm_medium=${place}&utm_campaign=ecosystem` // EduFind đọc utm_source để đo lượt vào từ ProFind™
  : `https://isavn.edu.vn/go/${app}?from=profind&utm_source=profind&utm_medium=${place}&utm_campaign=ecosystem`;
