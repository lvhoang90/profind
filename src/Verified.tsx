// Tick vàng "Nhà khoa học đã xác thực" + hộp yêu cầu xác thực hồ sơ ("Đây là tôi").
import { useEffect, useState, type FormEvent } from "react";
import { api, useAccount } from "./accountStore";
import { Icon } from "./icons";

let cache: Map<string, number> | null = null, pending: Promise<void> | null = null;
const subs = new Set<() => void>();
function load() {
  if (cache || pending) return;
  pending = api<{ items: [string, number][] }>("verified").then((j) => { cache = new Map(j.items); }).catch(() => { cache = new Map(); }).finally(() => { pending = null; subs.forEach((f) => f()); });
}
export function useVerified(id: string): number | null {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); load(); return () => { subs.delete(f); }; }, []);
  const u = cache?.get(id);
  return u && u > Date.now() ? u : null;
}
const dmy = (ms: number) => new Date(ms).toLocaleDateString("vi-VN");
const LBL = "Nhà khoa học đã xác thực";

export function VerifiedTick({ id, size = 16 }: { id: string; size?: number }) {
  const until = useVerified(id);
  if (!until) return null;
  return <span className="vtick" title={`${LBL} · hiệu lực đến ${dmy(until)}`} role="img" aria-label={LBL}><Icon n="check" size={size} /></span>;
}
export function VerifiedBadge({ id }: { id: string }) {
  const until = useVerified(id);
  if (!until) return null;
  return <span className="badge vbadge"><span className="vtick" aria-hidden="true"><Icon n="check" size={14} /></span>{LBL} · đến {dmy(until)}</span>;
}

type Row = { id: string; authorId: string; status: string; until: number | null; reason: string };
export function ClaimBox({ authorId, authorName }: { authorId: string; authorName: string }) {
  const { user } = useAccount();
  const until = useVerified(authorId);
  const [st, setSt] = useState<"idle" | "sending" | "done">("idle"), [err, setErr] = useState(""), [res, setRes] = useState<{ status: string; until: number | null } | null>(null);
  const [mine, setMine] = useState<Row[]>([]);
  useEffect(() => { if (user) api<{ claims: Row[] }>("claim-status").then((j) => setMine(j.claims.filter((c) => c.authorId === authorId))).catch(() => {}); }, [user, authorId, st]);
  if (until) return <p className="banner"><Icon n="check" />Hồ sơ này đã được xác thực, hiệu lực đến {dmy(until)}.</p>;
  if (!user) return <p className="banner demo">Để xác thực hồ sơ, hãy <a href="#/tai-khoan">đăng nhập bằng email tổ chức</a> (đuôi của trường/viện) rồi quay lại trang này.</p>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSt("sending"); setErr("");
    const f = new FormData(e.currentTarget);
    try { setRes(await api("claim-submit", { authorId, authorName, name: f.get("name"), orcid: f.get("orcid"), scholar: f.get("scholar"), note: f.get("note") })); setSt("done"); }
    catch (x) { setErr((x as Error).message === "freemail" ? "Email miễn phí (Gmail, Yahoo…) không được xác thực tự động. Hãy dùng email của trường/viện, hoặc gửi thư đề nghị riêng để quản trị viên xem xét." : (x as Error).message); setSt("idle"); }
  };
  if (st === "done" && res) return <p className="banner" role="status"><Icon n="check" />{res.status === "approved" ? `Đã xác thực! Tick vàng hiện cạnh tên bạn đến ${dmy(res.until!)}.` : "Đã nhận yêu cầu. Hệ thống đã kiểm tra tự động, quản trị viên sẽ duyệt và gửi kết quả qua email."}</p>;
  const last = mine[0];
  return (
    <section className="card claimbox">
      <h2>Đây là tôi — xác thực hồ sơ</h2>
      <p className="meta">Đăng nhập bằng email tổ chức ({user.email}). Hồ sơ được xác thực khi email tổ chức, ORCID và tên khớp với hồ sơ OpenAlex; nếu chưa đủ, quản trị viên sẽ xem xét. Tick vàng có hiệu lực 2 năm.</p>
      {last && last.status !== "approved" && <p className="meta" role="status">Yêu cầu gần nhất: {last.status === "review" ? "đang chờ duyệt" : last.status === "rejected" ? `chưa được chấp nhận${last.reason ? " — " + last.reason : ""}` : `cần bổ sung${last.reason ? " — " + last.reason : ""}`}.</p>}
      <form onSubmit={submit} className="form">
        <label className="sel"><span>Họ tên đầy đủ</span><input name="name" required maxLength={80} defaultValue={user.name} autoComplete="name" /></label>
        <label className="sel"><span>ORCID</span><input name="orcid" maxLength={40} placeholder="0000-0000-0000-0000" /></label>
        <label className="sel"><span>Google Scholar</span><input name="scholar" type="url" maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
        <label className="sel"><span>Ghi chú (tuỳ chọn)</span><textarea name="note" rows={3} maxLength={1000} /></label>
        <p><button className="primary" disabled={st === "sending"}>{st === "sending" ? "Đang gửi…" : "Gửi yêu cầu xác thực"}</button></p>
        <div role="alert">{err && <p className="banner demo">{err}</p>}</div>
      </form>
    </section>
  );
}
