import { useT } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { api, useAccount, type User } from "./accountStore";
import { evt } from "./analytics";

const L = {
  vi: { incomplete: (a: string) => `Liên kết không đầy đủ. Hãy quay lại ${a} và bấm kết nối lại.`, fail: "Có lỗi xảy ra, vui lòng thử lại.", net: "Không kết nối được máy chủ, vui lòng thử lại.", title: (a: string) => `Kết nối tài khoản ${a}`, login: "Đăng nhập bằng email", wait: "Đang kết nối tài khoản của bạn…" },
  en: { incomplete: (a: string) => `The link is incomplete. Go back to ${a} and connect again.`, fail: "Something went wrong. Please try again.", net: "Could not reach the server. Please try again.", title: (a: string) => `Connect your ${a} account`, login: "Sign in with email", wait: "Connecting your account…" },
};
/** Trang nhận liên kết từ Mây hoặc EduFind (ứng dụng ISA khác): #/ket-noi?t=<mã ký>&from=may|edufind|ami. Email đã được ứng dụng gửi sang xác thực nên không gửi mã OTP nữa. */
export function ConnectPage() {
  const { setUser, refresh } = useAccount();
  const { t: tr, lang } = useT(), l = L[lang === "vi" ? "vi" : "en"], [err, setErr] = useState(""), ran = useRef(false);
  const [from] = useState(() => (/[?&]from=edufind\b/.test(location.hash) ? "edufind" : /[?&]from=ami\b/.test(location.hash) ? "ami" : "may"));
  const app = from === "edufind" ? tr("appEdu") : from === "ami" ? "Ami" : tr("appMay");
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const full = location.hash.replace(/^#\/?/, ""), qs = new URLSearchParams(full.includes("?") ? full.slice(full.indexOf("?") + 1) : "");
    const tok = qs.get("t") || "";
    // Xóa mã khỏi thanh địa chỉ ngay để không lọt vào lịch sử hay ảnh chụp màn hình.
    try { history.replaceState(null, "", location.pathname + location.search + (from === "may" ? "#/ket-noi" : `#/ket-noi?from=${from}`)); } catch { /* bỏ qua */ }
    if (!tok) { setErr(l.incomplete(app)); return; }
    api<{ user: User; isNew: boolean; authorId: string }>("connect", { t: tok }).then(async (r) => {
      setUser(r.user); await refresh(); evt(r.isNew ? "connect_new" : "connect_old");
      try { if (r.authorId) sessionStorage.setItem("profind.sgpick", r.authorId); sessionStorage.setItem("profind.sgback", "#/tai-khoan"); } catch { /* bỏ qua */ }
      location.replace("#/tai-khoan/nhan-dien");
    }).catch((e: any) => { const m = String(e?.message ?? ""); setErr(/failed to fetch|networkerror|load failed/i.test(m) || e instanceof TypeError ? l.net : !m || /\bHTTP\s*\d{3}\b|\[[^\]]*\]/.test(m) ? l.fail : m); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="card" style={{ maxWidth: 520, margin: "2rem auto" }}>
    <h2>{l.title(app)}</h2>
    {err ? <><p role="alert">{err}</p><p><a className="primary" href="#/tai-khoan">{l.login}</a></p></> : <p role="status">{l.wait}</p>}
  </section>;
}
