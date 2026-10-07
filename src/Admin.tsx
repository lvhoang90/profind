// Trang quản trị (chỉ dành cho tài khoản trong ADMIN_EMAILS). Giao diện tiếng Việt, dữ liệu từ api/account.js (admin-*).
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";
import { useAccount, api } from "./accountStore";

const TABS: [string, string, IconName][] = [["", "Tổng quan", "grid"], ["truy-cap", "Truy cập", "chart"], ["he-sinh-thai", "Hệ sinh thái ISA", "link"], ["noi-dung", "Nội dung", "book"], ["nguoi-dung", "Người dùng", "users"]];
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
      {cur === "" && <Summary />}{cur === "truy-cap" && <Traffic />}{cur === "he-sinh-thai" && <Eco />}{cur === "noi-dung" && <Content />}{cur === "nguoi-dung" && <Users />}
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
