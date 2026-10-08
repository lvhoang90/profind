// Trang quản trị (chỉ dành cho tài khoản trong ADMIN_EMAILS). Giao diện tiếng Việt, dữ liệu từ api/account.js (admin-*).
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon, type IconName } from "./icons";
import { useAccount, api } from "./accountStore";

const TABS: [string, string, IconName][] = [["", "Tổng quan", "grid"], ["truy-cap", "Truy cập", "chart"], ["he-sinh-thai", "Hệ sinh thái ISA", "link"], ["noi-dung", "Nội dung", "book"], ["nguoi-dung", "Người dùng", "users"], ["xac-thuc", "Xác thực", "check"], ["thu", "Thư gửi", "link"], ["gop", "Gộp hồ sơ", "users"], ["don-vi", "Đơn vị mới", "building"]];
const n0 = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const delta = (a: number, b: number) => (b > 0 ? `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / b) * 100))}% so với 7 ngày trước` : a > 0 ? "mới có dữ liệu" : "");
const dd = (d: string) => d.slice(8) + "/" + d.slice(5, 7);
const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây` : `${Math.round(s)} giây`);

function useGet<T>(op: string, qs = "") {
  const [d, setD] = useState<T | null>(null), [err, setErr] = useState("");
  useEffect(() => { let on = true; setD(null); setErr(""); api<T>(op, undefined, qs).then((x) => on && setD(x)).catch((e) => on && setErr(e.message)); return () => { on = false; }; }, [op, qs]);
  return { d, err };
}
function Kpi({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) { return <div className="kpi"><span className="kic"><Icon n={icon} size={20} /></span><b>{value}</b><span>{label}</span>{sub && <small>{sub}</small>}</div>; }
function Bars({ data, title, color = "lead" }: { data: { d: string; n: number }[]; title: string; color?: string }) {
  const max = Math.max(1, ...data.map((x) => x.n));
  return <section className="card"><h2>{title}</h2><div className="ybars adm" role="img" aria-label={data.map((x) => `${x.d}: ${x.n}`).join(", ")}>{data.map((x) => <div key={x.d} className="yb" title={`${x.d}: ${x.n}`}><span className="yn">{x.n || ""}</span><div className={`yc solo ${color}`} style={{ height: `${(x.n / max) * 100}%` }} /><span className="yl">{dd(x.d)}</span></div>)}</div></section>;
}
function HList({ title, rows, unit = "", empty = "Chưa có dữ liệu" }: { title: string; rows: { name: string; n: number; href?: string }[]; unit?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return <section className="card"><h2>{title}</h2>{rows.length === 0 ? <p className="meta">{empty}</p> : <ul className="hbars wide">{rows.map((r) => <li key={r.name}><span title={r.name}>{r.href ? <a href={r.href}>{r.name}</a> : r.name}</span><i className="hb"><u className="c2" style={{ width: `${(r.n / max) * 100}%` }} /></i><b>{n0(r.n)}{unit}</b></li>)}</ul>}</section>;
}

export function AdminPage({ tab }: { tab: string }) {
  const { user, cfg } = useAccount();
  const cur = TABS.some((x) => x[0] === tab) ? tab : "";
  if (cfg === null || user === undefined) return <p className="empty" role="status">Đang tải…</p>;
  if (!user?.isAdmin) return <article><h1>Quản trị ProFind</h1><p className="empty" role="alert">Trang này chỉ dành cho quản trị viên. {user ? "Tài khoản của bạn không có quyền." : <a href="#/tai-khoan">Đăng nhập</a>}</p></article>;
  return (
    <article className="dash adm-page">
      <header className="dash-head"><div className="av" aria-hidden="true"><Icon n="grid" size={36} /></div><div className="dh-main"><h1>Quản trị ProFind</h1><p className="meta">{user.email} · số liệu theo giờ Việt Nam, khoảng 14 ngày gần nhất</p></div><div className="dh-act"><a className="ghost-link light" href="#/tai-khoan">← Không gian của tôi</a></div></header>
      <nav className="tabs" aria-label="Quản trị">{TABS.map(([k, l, ic]) => <a key={k} href={`#/quan-tri${k ? "/" + k : ""}`} aria-current={cur === k ? "page" : undefined}><Icon n={ic} size={16} />{l}</a>)}</nav>
      {cur === "" && <Summary />}{cur === "truy-cap" && <Traffic />}{cur === "he-sinh-thai" && <Eco />}{cur === "noi-dung" && <Content />}{cur === "nguoi-dung" && <Users />}{cur === "xac-thuc" && <Claims />}{cur === "thu" && <Mailer />}{cur === "gop" && <Merger />}{cur === "don-vi" && <Units />}
    </article>
  );
}

function Summary() {
  const { d, err } = useGet<any>("admin-summary");
  if (err) return <p className="banner demo">{err}</p>; if (!d) return <p className="empty">Đang tải…</p>;
  const rg = Object.entries(d.byReason as Record<string, number>).map(([name, n]) => ({ name: ({ reg: "Nút đăng ký", banner: "Lời mời", fav: "Khi lưu tác giả", ss: "Khi lưu tìm kiếm", csv: "Khi tải CSV", view: "Khi xem hồ sơ", eco: "Từ hệ sinh thái" } as any)[name] || name, n }));
  return (
    <>
      <div className="kpis">
        <Kpi icon="users" label="Người dùng đã đăng ký" value={n0(d.users)} sub={`${n0(d.new7)} mới trong 7 ngày · ${delta(d.new7, d.newPrev7)}`} />
        <Kpi icon="clock" label="Hoạt động 7 ngày" value={n0(d.active7)} sub={pct(d.active7, d.users) + " tổng số người dùng"} />
        <Kpi icon="eye" label="Quay lại (từ 2 ngày)" value={pct(d.returning, d.users)} sub={`${n0(d.returning)} người`} />
        <Kpi icon="star" label="Đã lưu tác giả" value={n0(d.savers)} sub={`${pct(d.savers, d.users)} người dùng · ${n0(d.favTotal)} lượt lưu`} />
        <Kpi icon="user" label="Hồ sơ trung bình" value={`${d.profile.avg}%`} sub={`${d.profile.full} người khai đủ`} />
      </div>
      <div className="insights"><Bars data={d.signups} title="Đăng ký mới theo ngày" /><Bars data={d.activeDaily} title="Người dùng hoạt động theo ngày" color="dom" /></div>
      <div className="insights">
        <section className="card"><h2>Giữ chân</h2><ul className="hbars wide"><li><span>Sau 1 ngày</span><i className="hb"><u className="c1" style={{ width: pct(d.ret1.back, d.ret1.n) }} /></i><b>{pct(d.ret1.back, d.ret1.n)}</b></li><li><span>Sau 7 ngày</span><i className="hb"><u className="c1" style={{ width: pct(d.ret7.back, d.ret7.n) }} /></i><b>{pct(d.ret7.back, d.ret7.n)}</b></li></ul><p className="meta">Tỷ lệ người đã đăng ký ít nhất 1 hoặc 7 ngày và đã quay lại dùng ở ngày khác.</p></section>
        <HList title="Đăng ký từ đâu" rows={rg} />
      </div>
      <div className="insights"><HList title="Nghề nghiệp" rows={d.byJob} /><HList title="Đơn vị công tác" rows={d.byOrg} /></div>
      <section className="card"><h2>Người dùng tích cực nhất</h2><table className="adm-t"><thead><tr><th>Email</th><th>Họ tên</th><th className="num">Ngày dùng</th><th className="num">Đã lưu</th><th className="num">Sang ISA</th></tr></thead><tbody>{d.top.map((u: any) => <tr key={u.email}><td>{u.email}</td><td>{u.name}</td><td className="num">{u.counts.days}</td><td className="num">{u.favs}</td><td className="num">{u.eco}</td></tr>)}</tbody></table></section>
      {!d.persistent && <p className="banner demo">Đang dùng kho tạm trong bộ nhớ: dữ liệu mất khi máy chủ khởi động lại. Cấu hình Upstash Redis (KV_REST_API_URL, KV_REST_API_TOKEN) để lưu bền.</p>}
    </>
  );
}

function Traffic() {
  const { d, err } = useGet<any>("admin-traffic");
  if (err) return <p className="banner demo">{err}</p>; if (!d) return <p className="empty">Đang tải…</p>;
  const sum = (a: { n: number }[]) => a.reduce((x, y) => x + y.n, 0), v7 = sum(d.days.slice(7)), vp = sum(d.days.slice(0, 7));
  const dur = d.dur.slice(7).reduce((x: any, y: any) => ({ s: x.s + y.sum, n: x.n + y.n }), { s: 0, n: 0 });
  const rvT = d.rv.slice(7).reduce((x: any, y: any) => ({ a: x.a + y["1"], b: x.b + y["2"] + y["3"] + y["4+"] }), { a: 0, b: 0 });
  const e = d.evt, ep = d.evtPrev, ev = (k: string) => Number(e[k] || 0);
  const funnel: [string, number][] = [["Truy cập (7 ngày)", v7], ["Mở trang đăng ký", ev("reg_open")], ["Gửi mã xác thực", ev("reg_start")], ["Hoàn tất đăng ký", ev("reg_done")]];
  return (
    <>
      <div className="kpis">
        <Kpi icon="eye" label="Lượt truy cập 7 ngày" value={n0(v7)} sub={delta(v7, vp)} />
        <Kpi icon="clock" label="Thời lượng TB/phiên" value={dur.n ? fmtSec(dur.s / dur.n) : "–"} />
        <Kpi icon="users" label="Khách quay lại" value={pct(rvT.b, rvT.a + rvT.b)} sub={`${n0(rvT.b)} lượt từ lần ghé thứ 2 trở đi`} />
        <Kpi icon="search" label="Lượt tìm kiếm" value={n0(ev("search"))} sub={delta(ev("search"), Number(ep.search || 0))} />
        <Kpi icon="user" label="Mở hồ sơ tác giả" value={n0(ev("author_view"))} sub={delta(ev("author_view"), Number(ep.author_view || 0))} />
      </div>
      <Bars data={d.days} title="Lượt truy cập theo ngày (14 ngày)" />
      <div className="insights"><HList title="Phễu đăng ký (7 ngày)" rows={funnel.map(([name, n]) => ({ name: `${name}${n && funnel[0][1] ? ` (${pct(n, funnel[0][1])})` : ""}`, n }))} /><HList title="Nguồn truy cập" rows={d.referrers.slice(0, 10)} /></div>
      <div className="insights"><HList title="Thiết bị" rows={d.devices} /><HList title="Trình duyệt" rows={d.browsers} /></div>
      <div className="insights"><HList title="Quốc gia" rows={d.countries.slice(0, 10)} /><HList title="Chiến dịch (utm_source|utm_campaign)" rows={d.utm.slice(0, 10)} empty="Chưa có lượt vào từ liên kết chiến dịch" /></div>
    </>
  );
}

function Eco() {
  const sm = useGet<any>("admin-summary"), tr = useGet<any>("admin-traffic");
  if (sm.err || tr.err) return <p className="banner demo">{sm.err || tr.err}</p>; if (!sm.d || !tr.d) return <p className="empty">Đang tải…</p>;
  const d = sm.d, e = tr.d.evt as Record<string, number>, ep = tr.d.evtPrev as Record<string, number>;
  const apps: [string, string][] = [["edufind", "EduFind"], ["ami", "Ami"], ["may", "Mây"]], places: [string, string][] = [["footer", "Chân trang"], ["ecosystem", "Khối hệ sinh thái"], ["author", "Trang tác giả"], ["account", "Không gian của tôi"], ["work", "Công trình"], ["empty", "Không có kết quả"], ["nudge", "Gợi ý"], ["welcome", "Thư chào mừng"]];
  const tot = (app: string, src = e) => places.reduce((s, [p]) => s + Number(src[`go_${app}_${p}`] || 0), 0);
  const allTot = apps.reduce((s, [a]) => s + tot(a), 0), allPrev = apps.reduce((s, [a]) => s + tot(a, ep), 0);
  const series = tr.d.evtDays.map((x: any) => ({ d: x.d, n: apps.reduce((s, [a]) => s + places.reduce((t, [p]) => t + Number(x[`go_${a}_${p}`] || 0), 0), 0) }));
  return (
    <>
      <div className="kpis">
        <Kpi icon="link" label="Lượt bấm sang ISA (7 ngày)" value={n0(allTot)} sub={delta(allTot, allPrev)} />
        <Kpi icon="users" label="Người dùng đã sang ít nhất 1 ứng dụng" value={pct(d.eco.any, d.users)} sub={`${n0(d.eco.any)} người`} />
        {apps.map(([a, n]) => <Kpi key={a} icon="external" label={`Đã sang ${n}`} value={n0((d.eco as any)[a])} sub={`${n0((d.eco.hops as any)[a])} lượt của người đã đăng nhập · ${n0(tot(a))} lượt (7 ngày, mọi khách)`} />)}
      </div>
      <Bars data={series} title="Lượt bấm sang hệ sinh thái theo ngày" color="dom" />
      <section className="card"><h2>Điểm chạm: lượt bấm 7 ngày theo vị trí</h2>
        <div className="tscroll"><table className="adm-t"><thead><tr><th>Vị trí</th>{apps.map(([, n]) => <th key={n} className="num">{n}</th>)}<th className="num">Tổng</th></tr></thead>
          <tbody>{places.map(([p, l]) => { const row = apps.map(([a]) => Number(e[`go_${a}_${p}`] || 0)); return <tr key={p}><td>{l}</td>{row.map((v, i) => <td key={i} className="num">{n0(v)}</td>)}<td className="num"><b>{n0(row.reduce((a, b) => a + b, 0))}</b></td></tr>; })}</tbody>
          <tfoot><tr><td>Tổng</td>{apps.map(([a]) => <td key={a} className="num">{n0(tot(a))}</td>)}<td className="num"><b>{n0(allTot)}</b></td></tr></tfoot></table></div></section>
      <section className="card"><h2>Gợi ý hành động</h2><ul className="tips">
        <li><b>Nhóm chưa sang ISA:</b> {n0(d.users - d.eco.any)} người dùng chưa mở EduFind, Ami hay Mây. Lọc ở tab Người dùng → “Chưa sang ISA” để gửi lời mời.</li>
        <li><b>Chuyển đổi từ lưu tác giả:</b> {n0(d.savers)} người đã lưu tác giả là nhóm nóng nhất cho EduFind (chọn tạp chí) và Ami (đọc và trích dẫn).</li>
        <li><b>Hồ sơ chưa đủ:</b> {n0(d.profile.low)} người khai dưới 40% hồ sơ; nhắc hoàn thiện sẽ tăng khả năng liên hệ sau này.</li>
      </ul></section>
    </>
  );
}

function Content() {
  const { d, err } = useGet<any>("admin-content");
  if (err) return <p className="banner demo">{err}</p>; if (!d) return <p className="empty">Đang tải…</p>;
  const a = (rows: any[], pre: string) => rows.map((r) => ({ name: r.name, n: r.n, href: `#/tac-gia/${pre ? r.k.slice(pre.length) : r.k}` }));
  return <><div className="insights"><HList title="Tác giả được xem nhiều nhất" rows={a(d.authors, "")} /><HList title="Tác giả được lưu nhiều nhất" rows={d.saved.filter((r: any) => r.k.startsWith("a|")).map((r: any) => ({ name: r.name, n: r.n, href: `#/tac-gia/${r.k.slice(2)}` }))} /></div>
    <div className="insights"><HList title="Từ khóa tìm kiếm phổ biến" rows={d.queries} /><HList title="Công trình được mở nhiều nhất" rows={d.works.map((r: any) => ({ name: r.name, n: r.n }))} /></div>
    <div className="insights"><HList title="Công trình được lưu nhiều nhất" rows={d.saved.filter((r: any) => r.k.startsWith("w|")).map((r: any) => ({ name: r.name, n: r.n }))} /></div>
    <p className="meta">Từ khóa tìm kiếm được gộp chung, không gắn với người dùng hay thiết bị. Chỉ ghi từ khóa từ 3 ký tự trở lên.</p></>;
}

const SEGS: [string, string][] = [["all", "Tất cả"], ["saver", "Đã lưu tác giả"], ["noeco", "Chưa sang ISA"], ["edufind", "Đã sang EduFind"], ["ami", "Đã sang Ami"], ["may", "Đã sang Mây"], ["noprofile", "Hồ sơ dưới 40%"], ["full", "Hồ sơ đủ"], ["oneday", "Mới dùng 1 ngày"]];
function Users() {
  const [q, setQ] = useState(""), [f, setF] = useState("all"), [sort, setSort] = useState("score"), [dir, setDir] = useState("desc"), [page, setPage] = useState(1), [dq, setDq] = useState("");
  useEffect(() => { const id = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(id); }, [q]);
  const qs = useMemo(() => `&q=${encodeURIComponent(dq)}&f=${f}&sort=${sort}&dir=${dir}&page=${page}&per=25`, [dq, f, sort, dir, page]);
  const { d, err } = useGet<any>("admin-users", qs);
  const th = (k: string, l: string, num = false) => <th className={num ? "num" : ""} aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"}><button className={`thb${sort === k ? " on" : ""}`} onClick={() => { if (sort === k) setDir(dir === "asc" ? "desc" : "asc"); else { setSort(k); setDir(["name", "email", "org"].includes(k) ? "asc" : "desc"); } setPage(1); }}>{l}<span className="ar" aria-hidden="true">{sort === k ? (dir === "asc" ? "▲" : "▼") : "↕"}</span></button></th>;
  return (
    <>
      <div className="wbar"><label className="sel inl grow"><span>Tìm theo email, tên, số điện thoại, đơn vị</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <a className="ghost-link" href={`/api/account?op=admin-csv${qs}`} download><Icon n="download" size={16} />Tải CSV</a></div>
      <div className="seg wrap" role="group" aria-label="Nhóm người dùng">{SEGS.map(([k, l]) => <button key={k} aria-pressed={f === k} onClick={() => { setF(k); setPage(1); }}>{l}{d?.seg ? <em>{d.seg[k] ?? 0}</em> : null}</button>)}</div>
      {err ? <p className="banner demo">{err}</p> : !d ? <p className="empty">Đang tải…</p> : (
        <div className="table-wrap"><table className="adm-t big"><thead><tr>{th("email", "Email")}{th("name", "Họ tên")}<th>Điện thoại</th>{th("org", "Đơn vị")}{th("createdAt", "Đăng ký")}{th("lastSeen", "Lần cuối")}{th("days", "Ngày dùng", true)}{th("favs", "Đã lưu", true)}{th("eco", "Sang ISA", true)}{th("profile", "Hồ sơ", true)}</tr></thead>
          <tbody>{d.users.map((u: any) => <tr key={u.email}><td>{u.email}</td><td>{u.name}</td><td>{u.phone}</td><td>{u.org}</td><td>{u.createdAt.slice(0, 10)}</td><td>{String(u.lastSeen).slice(0, 10)}</td><td className="num">{u.counts.days}</td><td className="num">{u.favs}</td><td className="num" title={`EduFind ${u.hops.edufind} · Ami ${u.hops.ami} · Mây ${u.hops.may}`}>{u.eco}</td><td className="num">{u.profilePct}%</td></tr>)}</tbody></table></div>)}
      {d && <div className="pager"><button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button><span className="meta">Trang {d.page}/{d.pages} · {n0(d.total)} người</span><button className="ghost" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Sau ›</button></div>}
    </>
  );
}

type ClaimRec = { id: string; kind?: string; authorId: string; authorName: string; name: string; email: string; orcid: string; scholar: string; note: string; status: string; auto: boolean; reason?: string; createdAt: number; until?: number; decidedBy?: string; checks: { k: string; ok: boolean | null; label: string; detail: string }[]; oa: { works: number; cited: number } | null };
type VfRec = { authorId: string; email: string; name: string; until: number; since: number };
const dmy = (ms: number) => new Date(ms).toLocaleDateString("vi-VN");
const KIND: Record<string, string> = { remove: "Gỡ hồ sơ", claim: "Xác thực" };
const ST: Record<string, string> = { review: "Chờ duyệt", approved: "Đã xác thực", rejected: "Từ chối", info: "Cần bổ sung" };
function Claims() {
  const [v, setV] = useState(0), [msg, setMsg] = useState("");
  const { d, err } = useGet<{ claims: ClaimRec[]; verified: VfRec[]; expiring: number; allow: string[]; works: { authorId: string; doi: string; title: string; year: number; why: string }[]; hidden: { score: string[]; profile: string[] } }>("admin-claims", `&v=${v}`);
  const act = async (op: string, body: object, ok: string) => { try { await api(op, body); setMsg(ok); setV((x) => x + 1); } catch (e) { setMsg((e as Error).message); } };
  const decide = (c: ClaimRec, decision: string) => { let reason = ""; if (decision !== "approve") { reason = prompt(decision === "reject" ? "Lý do từ chối (gửi cho tác giả):" : "Cần tác giả bổ sung gì?") ?? ""; if (!reason && !confirm("Gửi không kèm lý do?")) return; } act("admin-claim-decide", { id: c.id, decision, reason }, "Đã xử lý và gửi email cho tác giả."); };
  const manual = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); act("admin-claim-manual", f, "Đã chạy kiểm tra tự động cho hồ sơ này."); };
  if (err) return <p className="banner demo" role="alert">{err}</p>;
  if (!d) return <p className="empty" role="status">Đang tải…</p>;
  const pend = d.claims.filter((c) => c.status === "review");
  return (
    <>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      <section className="card"><h2>Chính sách xác thực</h2><p className="meta">Chỉ email tổ chức; email miễn phí phải có đề nghị riêng và được thêm vào danh sách cho phép bên dưới. Tick vàng hiệu lực 2 năm rồi xem xét lại{d.expiring ? ` — ${d.expiring} hồ sơ sắp hết hạn trong 60 ngày` : ""}. Tự động duyệt khi: email tổ chức + ORCID trùng OpenAlex + tên khớp + không xung đột.</p></section>
      <section className="card"><h2>Chờ duyệt ({pend.length})</h2>{pend.length === 0 && <p className="meta">Không có yêu cầu nào đang chờ.</p>}
        {pend.map((c) => <div key={c.id} className="claimrow"><p>{c.kind === "remove" && <span className="badge warnb">Đề nghị gỡ hồ sơ</span>}{c.kind === "hide" && <span className="badge warnb">Đề nghị ẩn điểm/xếp hạng</span>} <b><a href={`#/tac-gia/${c.authorId}`}>{c.authorName}</a></b> · {c.name} &lt;{c.email}&gt;{c.orcid && <> · ORCID {c.orcid}</>}{c.scholar && <> · <a href={c.scholar} target="_blank" rel="noopener">Scholar</a></>}</p>
          <ul className="meta">{c.checks.map((k) => <li key={k.k}>{k.ok === true ? "✅" : k.ok === false ? "❌" : "⚠️"} {k.label}{k.detail ? `: ${k.detail}` : ""}</li>)}</ul>{c.note && <p className="meta">Ghi chú: {c.note}</p>}
          <p><button className="primary" onClick={() => decide(c, "approve")}>Duyệt</button> <button onClick={() => decide(c, "info")}>Cần bổ sung</button> <button onClick={() => decide(c, "reject")}>Từ chối</button></p></div>)}</section>
      <section className="card"><h2>Công trình tự bổ sung chờ duyệt ({d.works?.length ?? 0})</h2>{!d.works?.length ? <p className="meta">Không có.</p> : <ul>{d.works.map((w) => <li key={w.authorId + w.doi}><a href={`#/tac-gia/${w.authorId}`}>{w.authorId}</a> · <a href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">{w.title || w.doi}</a> {w.year || ""} · {w.why} <button onClick={() => act("admin-claim-work", { authorId: w.authorId, doi: w.doi, decision: "approve" }, "Đã duyệt công trình.")}>Duyệt</button> <button onClick={() => act("admin-claim-work", { authorId: w.authorId, doi: w.doi, decision: "reject" }, "Đã loại công trình.")}>Loại</button></li>)}</ul>}</section>
      <section className="card"><h2>Hồ sơ đang ẩn theo yêu cầu ({(d.hidden?.score.length ?? 0) + (d.hidden?.profile.length ?? 0)})</h2>
        <p className="meta">Áp dụng ngay trên website (Luật BVDLCN: quyền phản đối, hạn chế, xóa). Duyệt đề nghị gỡ hồ sơ hoặc ẩn điểm ở hàng chờ trên sẽ tự thêm vào đây.</p>
        <ul>{[...(d.hidden?.profile ?? []).map((i) => [i, "profile"]), ...(d.hidden?.score ?? []).map((i) => [i, "score"])].map(([i, m]) => <li key={i + m}><a href={`#/tac-gia/${i}`}>{i}</a> · {m === "profile" ? "ẩn toàn bộ hồ sơ" : "ẩn điểm và huy hiệu"} <button onClick={() => act("admin-claim-hide", { authorId: i, mode: "none" }, "Đã hiển thị lại.")}>Hiển thị lại</button></li>)}</ul>
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("admin-claim-hide", { authorId: f.get("authorId"), mode: f.get("mode") }, "Đã cập nhật."); }} className="form"><label className="sel"><span>Mã hồ sơ (A…)</span><input name="authorId" required placeholder="A5032223071" /></label><label className="sel"><span>Chế độ</span><select name="mode" defaultValue="score"><option value="score">Ẩn điểm và huy hiệu</option><option value="profile">Ẩn toàn bộ hồ sơ</option><option value="none">Hiển thị lại</option></select></label><p><button className="primary">Áp dụng</button></p></form></section>
      <section className="card"><h2>Xác thực thủ công (ca thử, hoặc đã trao đổi riêng)</h2><p className="meta">Chạy kiểm tra tự động theo mã hồ sơ OpenAlex; nếu đạt sẽ duyệt ngay và gửi email, nếu không sẽ vào hàng chờ.</p>
        <form onSubmit={manual} className="form"><label className="sel"><span>Mã hồ sơ (A…)</span><input name="authorId" required placeholder="A5079721281" /></label><label className="sel"><span>Họ tên</span><input name="name" required /></label><label className="sel"><span>Email</span><input name="email" type="email" required /></label><label className="sel"><span>ORCID</span><input name="orcid" /></label><label className="sel"><span>Google Scholar</span><input name="scholar" type="url" /></label><p><button className="primary">Chạy kiểm tra / xác thực</button></p></form></section>
      <section className="card"><h2>Đã xác thực ({d.verified.length})</h2>{d.verified.length === 0 ? <p className="meta">Chưa có.</p> : <ul>{d.verified.map((x) => <li key={x.authorId}><a href={`#/tac-gia/${x.authorId}`}>{x.name}</a> · {x.email} · đến {dmy(x.until)} <button onClick={() => act("admin-claim-renew", { authorId: x.authorId }, "Đã gia hạn 2 năm.")}>Gia hạn</button> <button onClick={() => confirm("Gỡ tick vàng?") && act("admin-claim-revoke", { authorId: x.authorId }, "Đã gỡ xác thực.")}>Gỡ</button></li>)}</ul>}</section>
      <section className="card"><h2>Email miễn phí được cho phép</h2>{d.allow.length === 0 ? <p className="meta">Chưa có.</p> : <ul>{d.allow.map((e) => <li key={e}>{e} <button onClick={() => act("admin-claim-allow", { email: e, on: false }, "Đã gỡ.")}>Gỡ</button></li>)}</ul>}
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("admin-claim-allow", { email: f.get("email") }, "Đã thêm."); e.currentTarget.reset(); }} className="form"><label className="sel"><span>Thêm email (sau khi chấp nhận thư đề nghị)</span><input name="email" type="email" required /></label><p><button>Thêm</button></p></form></section>
      <section className="card"><h2>Lịch sử yêu cầu</h2><ul>{d.claims.filter((c) => c.status !== "review").slice(0, 40).map((c) => <li key={c.id}>{dmy(c.createdAt)} · {c.authorName} · {c.email} · <b>{ST[c.status] ?? c.status}</b>{c.auto ? " (tự động)" : c.decidedBy ? ` (${c.decidedBy})` : ""}</li>)}</ul></section>
    </>
  );
}

const TPL: Record<string, { label: string; subject: string; body: string }> = {
  remove: { label: "Phản hồi yêu cầu gỡ hồ sơ (cần xác minh)", subject: "ProFind: about your profile removal request", body: `Dear Dr. {{name}},

Thank you for contacting ProFind. To protect researchers from unauthorised removal requests, we verify the requester's identity before acting.

Please do one of the following:
1) Reply from your university email, or sign in to ProFind with that email and use "This is me / correct / remove profile" on your profile page; or
2) If only Gmail is available, add a short line "ProFind removal request" to your public ORCID biography so we can verify it.

If some information in your profile is incorrect, tell us which works or details are wrong and we can correct them directly instead of removing the profile.

Please note that removal hides the profile on ProFind only; the underlying records remain in OpenAlex and ORCID.

Best regards,
ProFind team` },
  removed: { label: "Xác nhận đã gỡ hồ sơ", subject: "ProFind: your profile has been removed", body: `Dear Dr. {{name}},

Your profile has been removed from ProFind as requested. It will disappear from the site at the next data update. The underlying records remain in OpenAlex and ORCID, where you can edit them.

Best regards,
ProFind team` },
  thanks: { label: "Cảm ơn góp ý về dữ liệu cá nhân (anh Hiếu, CSD)", subject: "Cảm ơn anh về góp ý cho ProFind", body: `Kính gửi {{name}},

Cảm ơn anh đã dành thời gian góp ý chi tiết cho ProFind. Góp ý của anh rất xác đáng, và nhóm đã cập nhật ngay những nội dung sau trên website:

1. Chính sách dữ liệu cá nhân đầy đủ (mục "Quyền riêng tư" trong trang Giới thiệu): nêu rõ pháp nhân chịu trách nhiệm (Viện Khoa học Giáo dục và Kinh tế Đông Nam Á), nguồn và loại dữ liệu, mục đích, thời gian lưu, nhà cung cấp hạ tầng, quy trình xử lý sự cố và kênh liên hệ.
2. Cơ chế quyền của chủ thể dữ liệu: nhà khoa học có thể yêu cầu chỉnh sửa, ẩn điểm và huy hiệu xếp hạng (vẫn giữ công trình), tạm ẩn hoặc gỡ hồ sơ. Sau khi xác minh danh tính, việc ẩn có hiệu lực ngay.
3. Khuyến cáo rõ ràng: PRO-SCORE1000 là chỉ số tham khảo mô phỏng của ProFind, không phải đánh giá chính thức, không thay thế hội đồng chuyên môn và không nên là tiêu chí duy nhất trong tuyển dụng, xét duyệt, bổ nhiệm hay phân bổ nguồn lực.
4. Đổi cách diễn đạt "chuyên gia ảo" thành "cấu hình trọng số mô phỏng" để tránh hiểu nhầm đây là khảo sát chuyên gia thật.
5. Tách riêng sự đồng ý nhận thư giới thiệu các công cụ khác khỏi việc đăng ký tài khoản.

Chúng tôi đang xin ý kiến chuyên gia pháp lý về các nghĩa vụ còn lại theo Luật Bảo vệ dữ liệu cá nhân (hồ sơ đánh giá tác động, chuyển dữ liệu xuyên biên giới) và sẽ cập nhật chính sách khi có kết quả. Nếu anh thấy còn điểm nào cần hoàn thiện, rất mong tiếp tục nhận được góp ý của anh.

Trân trọng,
Lương Việt Hoàng
Nhóm dự án ProFind, Viện ISA` },
  hidden: { label: "Xác nhận đã ẩn điểm/xếp hạng", subject: "ProFind: your score and rank have been hidden", body: `Dear Dr. {{name}},

As requested, your PRO-SCORE1000 score and rank badge are now hidden on ProFind. Your scientific works remain visible. You can ask us to show them again at any time.

Best regards,
ProFind team` },
  blank: { label: "Thư trống", subject: "", body: "" },
};
type MailStatus = { provider: string | null; from: string; sandbox: boolean; persistent: boolean; session: boolean; admins: number; correctionTo: string };
type MailRow = { id: string; at: number; to: string; subject: string; ok: boolean; err: string; by: string };
function Mailer() {
  const [v, setV] = useState(0), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [tpl, setTpl] = useState("remove");
  const [f, setF] = useState({ to: "", name: "", subject: TPL.remove.subject, body: TPL.remove.body });
  const st = useGet<MailStatus>("admin-mail-status"), lg = useGet<{ rows: MailRow[] }>("admin-mail-log", `&v=${v}`);
  const pick = (k: string) => { setTpl(k); setF((x) => ({ ...x, subject: TPL[k].subject, body: TPL[k].body })); };
  const send = async () => {
    const body = f.body.replace(/\{\{name\}\}/g, f.name || "colleague"), subject = f.subject.replace(/\{\{name\}\}/g, f.name || "colleague");
    if (!confirm(`Gửi thư tới ${f.to}?\n\nTiêu đề: ${subject}`)) return;
    setBusy(true); setMsg("");
    try { await api("admin-mail-send", { to: f.to, subject, body, kind: tpl }); setMsg("Đã gửi thư."); setV((x) => x + 1); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const s = st.d;
  return (
    <>
      <section className="card"><h2>Tình trạng gửi email</h2>
        {!s ? <p className="meta">Đang kiểm tra…</p> : <ul>
          <li>{s.provider ? "✅" : "❌"} Dịch vụ gửi thư: <b>{s.provider ?? "chưa cấu hình"}</b></li>
          <li>{s.from && !s.sandbox ? "✅" : "⚠️"} Địa chỉ gửi: <b>{s.from || "chưa đặt (MAIL_FROM)"}</b>{s.sandbox && " — đang dùng địa chỉ thử nghiệm của Resend, CHỈ gửi được tới chủ tài khoản Resend; cần xác minh tên miền"}</li>
          <li>{s.persistent ? "✅" : "❌"} Lưu trữ Redis (Upstash): {s.persistent ? "đã kết nối" : "chưa có, dữ liệu xác thực sẽ mất"}</li>
          <li>{s.session ? "✅" : "❌"} SESSION_SECRET: {s.session ? "đã đặt" : "chưa đặt"}</li>
          <li>{s.admins ? "✅" : "❌"} Số email quản trị (ADMIN_EMAILS): {s.admins}</li>
          <li>Thư đính chính gửi về: {s.correctionTo}</li></ul>}
        <p className="meta">Gửi một thư tới chính bạn ở bên dưới để thử. Nếu báo lỗi, nội dung lỗi của nhà cung cấp sẽ hiện ngay.</p></section>
      <section className="card"><h2>Soạn thư (duyệt xong mới gửi)</h2>
        <div role="status" aria-live="polite">{msg && <p className={msg.startsWith("Đã") ? "banner" : "banner demo"}>{msg}</p>}</div>
        <label className="sel"><span>Mẫu thư</span><select value={tpl} onChange={(e) => pick(e.target.value)}>{Object.entries(TPL).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></label>
        <label className="sel"><span>Người nhận (email)</span><input type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
        <label className="sel"><span>Tên người nhận (thay vào {"{{name}}"})</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="sel"><span>Tiêu đề</span><input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={200} /></label>
        <label className="sel"><span>Nội dung (chỉnh sửa tự do)</span><textarea rows={14} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={6000} /></label>
        <p><button className="primary" disabled={busy || !f.to || !f.body} onClick={() => void send()}>{busy ? "Đang gửi…" : "Duyệt và gửi"}</button> <small className="meta">Người nhận bấm Trả lời sẽ gửi về email của bạn.</small></p></section>
      <section className="card"><h2>Thư đã gửi gần đây</h2>{!lg.d?.rows.length ? <p className="meta">Chưa có.</p> : <ul>{lg.d.rows.map((r) => <li key={r.id}>{new Date(r.at).toLocaleString("vi-VN")} · {r.to} · {r.subject} · {r.ok ? "✅ đã gửi" : `❌ ${r.err}`}</li>)}</ul>}</section>
    </>
  );
}

type SSide = { id: string; name: string; orcid: string | null; inst: string[]; works: number; cites: number; years: [number | null, number | null]; pro: number | null; top: { t: string; y: number; d: string | null }[] };
type SPair = { tier: string; band: string; score: number; field: number | null; topic: number | null; a: string; b: string; name: string; groupSize: number; overlap: number; exactlyOneOrcid: boolean; noWorks: boolean; shared: string[]; A: SSide; B: SSide };
type SDec = { a: string; b: string; d: string; at: number };
const pk = (a: string, b: string) => [a, b].sort().join("|");
const BANDS: [string, string, string][] = [["1", "Rất nghi trùng", "Điểm 75–100: tên giống, cùng đơn vị, thường một bên có ORCID, chủ đề công trình gần nhau."], ["2", "Nghi trùng", "Điểm 60–74."], ["3", "Ít nghi", "Điểm 45–59: nhiều khả năng là hai người cùng tên."], ["4", "Rất ít nghi", "Điểm dưới 45: hầu như chắc là hai người khác nhau."]];
function Merger() {
  const [pairs, setPairs] = useState<SPair[] | null>(null), [err, setErr] = useState(""), [v, setV] = useState(0), [page, setPage] = useState(0), [band, setBand] = useState("1"), [view, setView] = useState<"todo" | "merge" | "different">("todo"), [out, setOut] = useState(""), [pick, setPick] = useState<Set<string>>(new Set()), [open, setOpen] = useState<string | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [per, setPer] = useState(50), [thr, setThr] = useState(85), [cur, setCur] = useState(0);
  const { d } = useGet<{ split: SDec[] }>("admin-claims", `&sp=${v}`);
  useEffect(() => { fetch("/data/_split-review.json", { cache: "no-store" }).then((r) => r.json()).then((j: { pairs: SPair[] }) => { if (j.pairs.some((p) => !p.band)) setErr("Dữ liệu cũ trong bộ nhớ đệm của trình duyệt, hãy tải lại trang bằng Ctrl+F5."); else setPairs(j.pairs); }).catch(() => setErr("Không tải được danh sách cặp hồ sơ.")); }, []);
  const dec = useMemo(() => new Map((d?.split ?? []).map((x) => [pk(x.a, x.b), x])), [d]);
  const counts = useMemo(() => { const c: Record<string, [number, number]> = {}; for (const p of pairs ?? []) { const t = (c[p.band] ??= [0, 0]); t[1]++; if (!dec.has(pk(p.a, p.b))) t[0]++; } return c; }, [pairs, dec]);
  const list = useMemo(() => (pairs ?? []).filter((p) => p.band === band && (view === "todo" ? !dec.has(pk(p.a, p.b)) : dec.get(pk(p.a, p.b))?.d === view)), [pairs, dec, band, view]);
  const rows = list.slice(page * per, page * per + per), nPages = Math.max(1, Math.ceil(list.length / per));
  const send = async (items: { a: string; b: string; decision: string }[], ok: string) => {
    setBusy(true); setMsg("");
    try { for (let i = 0; i < items.length; i += 200) await api("admin-claim-split", { items: items.slice(i, i + 200) }); setMsg(ok); setPick(new Set()); setCur(0); setV((x) => x + 1); window.scrollTo({ top: 0 }); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const toggle = (k: string) => setPick((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const ticked = rows.filter((p) => pick.has(pk(p.a, p.b)));
  const saveAll = () => send(rows.map((p) => ({ a: p.a, b: p.b, decision: pick.has(pk(p.a, p.b)) ? "merge" : "different" })), `Đã lưu ${rows.length} cặp: ${ticked.length} gộp, ${rows.length - ticked.length} khác người.`);
  const saveTicked = () => send(ticked.map((p) => ({ a: p.a, b: p.b, decision: "merge" })), `Đã chọn gộp ${ticked.length} cặp; ${rows.length - ticked.length} cặp còn lại giữ chưa duyệt.`);
  const allDifferent = () => confirm(`Đánh dấu KHÁC NGƯỜI cho toàn bộ ${list.length} cặp chưa duyệt trong nhóm này? Không có hồ sơ nào bị gộp.`) && send(list.map((p) => ({ a: p.a, b: p.b, decision: "different" })), `Đã đánh dấu ${list.length} cặp là khác người.`);
  const tickWhere = (f: (p: SPair) => boolean) => setPick(new Set(rows.filter(f).map((p) => pk(p.a, p.b))));
  const exportJson = () => {
    const merges = (d?.split ?? []).filter((x) => x.d === "merge").map((x) => { const p = pairs?.find((q) => pk(q.a, q.b) === pk(x.a, x.b)); if (!p) return null; const into = p.A.orcid ? p.A : p.B.orcid ? p.B : p.A.works >= p.B.works ? p.A : p.B; return { into: into.id, from: [into.id === p.a ? p.b : p.a], date: new Date().toISOString().slice(0, 10), reason: `Gộp sau khi quản trị viên duyệt (điểm nghi trùng ${p.score}): ${p.name}` }; }).filter(Boolean);
    setOut(JSON.stringify({ merge: merges, different: (d?.split ?? []).filter((x) => x.d === "different").map((x) => [x.a, x.b]) }, null, 1));
  };
  const onKey = (e: React.KeyboardEvent, k: string, i: number) => {
    if (e.target instanceof HTMLElement && (e.target.tagName === "A" || e.target.tagName === "BUTTON")) return;
    if (e.key === " " || e.key === "x") { e.preventDefault(); toggle(k); }
    else if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); setCur(Math.min(rows.length - 1, i + 1)); document.getElementById(`sp-${i + 1}`)?.focus(); }
    else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); setCur(Math.max(0, i - 1)); document.getElementById(`sp-${i - 1}`)?.focus(); }
  };
  const Side = ({ s, full }: { s: SSide; full: boolean }) => (
    <div className="spcell">
      <p className="spn"><a href={`#/tac-gia/${s.id}`} target="_blank" rel="noopener">{s.name}</a> <span className={s.orcid ? "orc yes" : "orc no"} title={s.orcid ?? "Chưa có ORCID"}>{s.orcid ? "ORCID" : "không ORCID"}</span></p>
      <p className="meta sps">{s.works} bài · {n0(s.cites)} trích dẫn · {s.years[0] ?? "?"}–{s.years[1] ?? "?"}</p>
      {(full ? s.top : s.top.slice(0, 1)).map((t) => <p key={t.t} className="spt">{t.d ? <a href={`https://doi.org/${t.d}`} target="_blank" rel="noopener">{t.t}</a> : t.t} <small className="meta">({t.y})</small></p>)}
    </div>
  );
  if (err) return <p className="banner demo" role="alert">{err}</p>;
  if (!pairs) return <p className="empty" role="status">Đang tải…</p>;
  const total = Object.values(counts).reduce((a, c) => a + c[0], 0), pct = pairs.length ? Math.round(((pairs.length - total) / pairs.length) * 100) : 0;
  return (
    <>
      <section className="card spbar">
        <h2>Gộp hồ sơ bị tách đôi <small className="meta">{pairs.length - total}/{pairs.length} đã duyệt ({pct}%)</small></h2>
        <div className="spprog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p className="meta">Điểm nghi trùng (tên, đơn vị, ORCID, năm công bố, chủ đề) chỉ để xếp thứ tự. <b>Tick = cùng một người.</b> Phím tắt: ↑ ↓ (hoặc j k) để di chuyển, Space (hoặc x) để tick.</p>
        <div className="sptabs">{BANDS.map(([k, l]) => <button key={k} className={band === k ? "on" : ""} onClick={() => { setBand(k); setPage(0); setPick(new Set()); }}><b>{l}</b><small>{counts[k]?.[0] ?? 0} còn lại / {counts[k]?.[1] ?? 0}</small></button>)}</div>
        <p className="meta">{BANDS.find((b) => b[0] === band)?.[2]}</p>
        <p className="sprow2">{(["todo", "merge", "different"] as const).map((k) => <button key={k} className={view === k ? "primary" : ""} onClick={() => { setView(k); setPage(0); setPick(new Set()); }}>{k === "todo" ? "Chưa duyệt" : k === "merge" ? "Đã chọn gộp" : "Đã chọn khác người"}</button>)}
          <label className="sel inl"><span>Số hàng/trang</span><select value={per} onChange={(e) => { setPer(+e.target.value); setPage(0); setPick(new Set()); }}>{[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <button onClick={exportJson}>Xuất kết quả (JSON)</button></p>
        {msg && <p className="banner" role="status"><Icon n="check" />{msg}</p>}
        {out && <><p className="meta">Sao chép đoạn này gửi cho trợ lý để đưa vào <code>data/corrections.json</code>:</p><textarea readOnly rows={8} value={out} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%" }} /></>}
      </section>
      {view === "todo" && list.length > 0 && <section className="card spact">
        <p className="sprow2"><span className="meta">Tick nhanh trên trang này:</span>
          <button disabled={busy} onClick={() => tickWhere(() => true)}>Tất cả</button>
          <button disabled={busy} onClick={() => tickWhere((p) => p.score >= thr)}>Điểm ≥</button><input className="spthr" type="number" min={0} max={100} value={thr} onChange={(e) => setThr(+e.target.value)} aria-label="Ngưỡng điểm" />
          <button disabled={busy} onClick={() => tickWhere((p) => p.exactlyOneOrcid && p.groupSize === 2)}>Chỉ 2 hồ sơ cùng tên, một bên có ORCID</button>
          <button disabled={busy} onClick={() => setPick(new Set())}>Bỏ tick</button></p>
        <p className="sprow2">
          <button className="primary" disabled={busy} onClick={() => void saveAll()}>Lưu trang: {ticked.length} gộp, {rows.length - ticked.length} khác người</button>
          <button disabled={busy || !ticked.length} onClick={() => void saveTicked()}>Chỉ gộp {ticked.length} cặp đã tick (giữ phần còn lại)</button>
          {(band === "3" || band === "4") && <button disabled={busy} onClick={() => void allDifferent()}>Cả nhóm: khác người ({list.length})</button>}</p>
      </section>}
      <div className="sptable" role="list">
        {rows.map((p, i) => { const k = pk(p.a, p.b), dd = dec.get(k), on = pick.has(k);
          return (
            <div key={k} id={`sp-${i}`} role="listitem" tabIndex={0} className={`sprow${on ? " on" : ""}${i === cur ? " cur" : ""}${open === k ? " open" : ""}`} onKeyDown={(e) => onKey(e, k, i)} onFocus={() => setCur(i)}>
              <div className="spck">{view === "todo" ? <input type="checkbox" checked={on} onChange={() => toggle(k)} aria-label={`Cùng một người: ${p.name}`} tabIndex={-1} /> : null}</div>
              <div className="spcell spmain"><p className="spn">{p.name}</p>
                <p className="meta sps"><span className={`score s${p.band}`}>{p.score}</span> {p.shared[0]}{p.groupSize > 2 ? ` · ${p.groupSize} hồ sơ cùng tên` : ""}{p.noWorks ? " · thiếu công trình" : ""}</p>
                <p className="meta sps"><button className="lnk" onClick={() => setOpen(open === k ? null : k)}>{open === k ? "Thu gọn" : "3 công trình"}</button>{view !== "todo" && dd ? <button className="lnk" onClick={() => void send([{ a: p.a, b: p.b, decision: "undo" }], "Đã bỏ quyết định.")}>Bỏ quyết định</button> : null}</p></div>
              <Side s={p.A} full={open === k} /><Side s={p.B} full={open === k} />
            </div>); })}
      </div>
      {list.length === 0 && <p className="meta">Không có cặp nào trong mục này.</p>}
      {list.length > per && <p className="sprow2"><button disabled={page === 0} onClick={() => { setPage(page - 1); setPick(new Set()); setCur(0); }}>← Trước</button> Trang {page + 1}/{nPages} <button disabled={page + 1 >= nPages} onClick={() => { setPage(page + 1); setPick(new Set()); setCur(0); }}>Sau →</button></p>}
    </>
  );
}
type UCand = { id: string; name: string; en: string | null; type: string; city: string | null; phrase: string; works: number; authors: number; vnShare: number; flags: string[]; topAuthors: { id: string; name: string; orcid: string | null; n: number }[]; samples: string[] };
type UDec = { id: string; d: string };
function Units() {
  const [units, setUnits] = useState<UCand[] | null>(null), [err, setErr] = useState(""), [v, setV] = useState(0), [out, setOut] = useState(""), [view, setView] = useState<"todo" | "approve" | "reject" | "skip">("todo"), [pick, setPick] = useState<Set<string>>(new Set()), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const { d } = useGet<{ units: UDec[] }>("admin-claims", `&un=${v}`);
  useEffect(() => { fetch("/data/_aff-review.json", { cache: "no-store" }).then((r) => r.json()).then((j: { units: UCand[] }) => setUnits(j.units)).catch(() => setErr("Không tải được danh sách đơn vị.")); }, []);
  const dec = useMemo(() => new Map((d?.units ?? []).map((x) => [x.id, x.d])), [d]);
  const decideMany = async (ids: string[], decision: string, ok: string) => { setBusy(true); setMsg(""); try { await api("admin-claim-unit", { items: ids.map((id) => ({ id, decision })) }); setMsg(ok); setPick(new Set()); setV((x) => x + 1); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const decide = (id: string, decision: string) => decideMany([id], decision, "Đã lưu.");
  const toggle = (id: string) => setPick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (err) return <p className="banner demo" role="alert">{err}</p>;
  if (!units) return <p className="empty" role="status">Đang tải…</p>;
  const list = units.filter((u) => (view === "todo" ? !dec.has(u.id) : dec.get(u.id) === view));
  const approved = units.filter((u) => dec.get(u.id) === "approve").map((u) => u.id);
  return (
    <>
      <section className="card"><h2>Đơn vị chưa có dữ liệu: duyệt nạp theo chuỗi cơ quan</h2>
        <p className="meta">{units.length} đơn vị có từ 20 bài trở lên ghi tên đơn vị trong chuỗi cơ quan trên OpenAlex nhưng chưa có bản ghi đơn vị. Với mỗi đơn vị chỉ nạp tác giả có <b>chính chuỗi cơ quan của mình</b> chứa tên đơn vị (từ 2 bài, hoặc có ORCID). Cảnh báo màu vàng nghĩa là tên có thể trùng đơn vị khác: xem các chuỗi mẫu trước khi duyệt.</p>
        <p>{(["todo", "approve", "reject", "skip"] as const).map((k) => <button key={k} className={view === k ? "primary" : ""} onClick={() => setView(k)}>{k === "todo" ? `Chưa duyệt (${units.filter((u) => !dec.has(u.id)).length})` : k === "approve" ? `Đã duyệt (${approved.length})` : k === "reject" ? "Đã loại" : "Để sau"}</button>)} <button onClick={() => setOut(JSON.stringify({ ids: approved }))}>Xuất danh sách đã duyệt</button></p>
        {msg && <p className="banner" role="status"><Icon n="check" />{msg}</p>}
        {out && <><p className="meta">Sao chép gửi cho trợ lý để nạp:</p><textarea readOnly rows={3} value={out} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%" }} /></>}</section>
      {view === "todo" && list.length > 0 && <section className="card"><p>
        <button disabled={busy} onClick={() => setPick(new Set(list.filter((u) => !u.flags.length).map((u) => u.id)))}>Tick tất cả đơn vị không cảnh báo ({list.filter((u) => !u.flags.length).length})</button>{" "}
        <button disabled={busy} onClick={() => setPick(new Set(list.map((u) => u.id)))}>Tick tất cả ({list.length})</button> <button disabled={busy} onClick={() => setPick(new Set())}>Bỏ tick</button></p>
        <p><button className="primary" disabled={busy || !pick.size} onClick={() => void decideMany([...pick], "approve", `Đã duyệt nạp ${pick.size} đơn vị.`)}>Duyệt nạp ({pick.size} đã tick)</button>{" "}
        <button disabled={busy || !pick.size} onClick={() => void decideMany([...pick], "reject", `Đã loại ${pick.size} đơn vị.`)}>Loại ({pick.size})</button>{" "}
        <button disabled={busy || !pick.size} onClick={() => void decideMany([...pick], "skip", `Đã để sau ${pick.size} đơn vị.`)}>Để sau ({pick.size})</button></p></section>}
      {list.map((u) => (
        <section key={u.id} className="card splitcard">
          <p>{view === "todo" && <label className="chk"><input type="checkbox" checked={pick.has(u.id)} onChange={() => toggle(u.id)} aria-label={`Chọn ${u.name}`} /></label>}<b>{u.name}</b> <small className="meta">{u.type}{u.city ? ` · ${u.city}` : ""} · {u.works} bài · {u.authors} tác giả · chuỗi tìm: “{u.phrase}”</small></p>
          {u.flags.map((f) => <p key={f} className="banner demo" role="note"><Icon n="info" />{f}</p>)}
          <p className="meta">Chuỗi cơ quan mẫu: {u.samples.join(" | ")}</p>
          <p className="meta">Tác giả nhiều bài nhất: {u.topAuthors.slice(0, 8).map((a) => `${a.name} (${a.n})`).join(", ")}</p>
          <p>{view === "todo" ? <><button className="primary" onClick={() => void decide(u.id, "approve")}>Duyệt nạp</button> <button onClick={() => void decide(u.id, "reject")}>Loại</button> <button onClick={() => void decide(u.id, "skip")}>Để sau</button></> : <button onClick={() => void decide(u.id, "undo")}>Bỏ quyết định</button>}</p>
        </section>))}
      {list.length === 0 && <p className="meta">Không có đơn vị nào trong mục này.</p>}
    </>
  );
}
