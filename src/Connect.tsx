import { useEffect, useRef, useState } from "react";
import { api, useAccount, type User } from "./accountStore";
import { evt } from "./analytics";

/** Trang nhận liên kết từ Mây hoặc EduFind (ứng dụng ISA khác): #/ket-noi?t=<mã ký>&from=may|edufind|ami. Email đã được ứng dụng gửi sang xác thực nên không gửi mã OTP nữa. */
export function ConnectPage() {
  const { setUser, refresh } = useAccount();
  const [err, setErr] = useState(""), ran = useRef(false);
  const [from] = useState(() => (/[?&]from=edufind\b/.test(location.hash) ? "edufind" : /[?&]from=ami\b/.test(location.hash) ? "ami" : "may"));
  const app = from === "edufind" ? "EduFind" : from === "ami" ? "Ami" : "Mây";
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const full = location.hash.replace(/^#\/?/, ""), qs = new URLSearchParams(full.includes("?") ? full.slice(full.indexOf("?") + 1) : "");
    const tok = qs.get("t") || "";
    // Xóa mã khỏi thanh địa chỉ ngay để không lọt vào lịch sử hay ảnh chụp màn hình.
    try { history.replaceState(null, "", location.pathname + location.search + (from === "may" ? "#/ket-noi" : `#/ket-noi?from=${from}`)); } catch { /* bỏ qua */ }
    if (!tok) { setErr(`Liên kết không đầy đủ. Hãy quay lại ${app} và bấm kết nối lại.`); return; }
    api<{ user: User; isNew: boolean; authorId: string }>("connect", { t: tok }).then(async (r) => {
      setUser(r.user); await refresh(); evt(r.isNew ? "connect_new" : "connect_old");
      try { if (r.authorId) sessionStorage.setItem("profind.sgpick", r.authorId); sessionStorage.setItem("profind.sgback", "#/tai-khoan"); } catch { /* bỏ qua */ }
      location.replace("#/tai-khoan/nhan-dien");
    }).catch((e: any) => setErr(e?.message || "Có lỗi xảy ra, vui lòng thử lại."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="card" style={{ maxWidth: 520, margin: "2rem auto" }}>
    <h2>Kết nối tài khoản {app}</h2>
    {err ? <><p role="alert">{err}</p><p><a className="primary" href="#/tai-khoan">Đăng nhập bằng email</a></p></> : <p role="status">Đang kết nối tài khoản của bạn…</p>}
  </section>;
}
