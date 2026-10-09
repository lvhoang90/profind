// Trang quản trị (chỉ dành cho tài khoản trong ADMIN_EMAILS). Giao diện tiếng Việt, dữ liệu từ api/account.js (admin-*).
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon, type IconName } from "./icons";
import { useAccount, api } from "./accountStore";

const TABS: [string, string, IconName][] = [["", "Tổng quan", "grid"], ["truy-cap", "Truy cập", "chart"], ["noi-dung", "Nội dung", "book"], ["he-sinh-thai", "Hệ sinh thái ISA", "link"], ["nguoi-dung", "Người dùng", "users"], ["xac-thuc", "Xác thực", "check"], ["thu", "Thư gửi", "link"], ["gop", "Gộp hồ sơ", "users"], ["nghi-gop", "Nghi gộp nhiều người", "check"], ["top2", "Top 2% chưa gắn", "check"], ["don-vi-tg", "Đơn vị tác giả", "building"]];
/** Nhóm điều hướng: hàng trên là nhóm, hàng dưới là mục trong nhóm đang chọn (đường dẫn cũ vẫn dùng được). */
const GROUPS: [string, IconName, string[]][] = [["Tổng quan", "grid", [""]], ["Phân tích", "chart", ["truy-cap", "noi-dung", "he-sinh-thai"]], ["Người dùng", "users", ["nguoi-dung"]], ["Xác thực", "check", ["xac-thuc", "thu"]], ["Rà soát dữ liệu", "scroll", ["gop", "nghi-gop", "top2", "don-vi-tg"]]];
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
      <nav className="tabs adm-tabs" aria-label="Quản trị">{GROUPS.map(([l, ic, keys]) => <a key={l} href={`#/quan-tri${keys[0] ? "/" + keys[0] : ""}`} aria-current={keys.includes(cur) ? "page" : undefined}><Icon n={ic} size={16} />{l}</a>)}</nav>
      {(() => { const g = GROUPS.find(([, , keys]) => keys.includes(cur)); return g && g[2].length > 1 ? <nav className="subtabs" aria-label={g[0]}>{g[2].map((k) => <a key={k} href={`#/quan-tri/${k}`} aria-current={cur === k ? "page" : undefined}>{TABS.find((x) => x[0] === k)![1]}</a>)}</nav> : null; })()}
      {cur === "" && <Summary />}{cur === "truy-cap" && <Traffic />}{cur === "he-sinh-thai" && <Eco />}{cur === "noi-dung" && <Content />}{cur === "nguoi-dung" && <Users />}{cur === "xac-thuc" && <Claims />}{cur === "thu" && <Mailer />}{cur === "gop" && <Merger />}{cur === "nghi-gop" && <MergeRisk />}{cur === "top2" && <Top2Review />}{cur === "don-vi-tg" && <AuthorUnits />}
    </article>
  );
}

function Summary() {
  const { d, err } = useGet<any>("admin-summary");
  const cl = useGet<any>("admin-claims").d, t2 = useGet<{ map: Record<string, string>; items: { name: string }[] }>("admin-t2").d, mr = useGet<{ map: Record<string, string>; profiles: { id: string }[] }>("admin-mrisk").d;
  if (err) return <p className="banner demo">{err}</p>; if (!d) return <p className="empty">Đang tải…</p>;
  const pending = cl ? (cl.claims as any[]).filter((c) => c.status === "review" || c.status === "info").length : null;
  const queue: [string, number | null, string, string][] = [["Yêu cầu xác thực chờ duyệt", pending, "#/quan-tri/xac-thuc", "Duyệt hoặc từ chối"], ["Người Top 2% chưa gắn hồ sơ", t2 ? t2.items.filter((i) => !t2.map[i.name]).length : null, "#/quan-tri/top2", "Chọn đúng hồ sơ"], ["Hồ sơ nghi gộp nhiều người", mr ? mr.profiles.filter((p) => !mr.map[p.id]).length : null, "#/quan-tri/nghi-gop", "Xác nhận một người hay nhiều"], ["Xác thực sắp hết hạn (60 ngày)", cl ? cl.expiring : null, "#/quan-tri/xac-thuc", "Gia hạn"]];
  return (
    <>
      <section className="queue" aria-label="Việc cần làm"><h2>Việc cần làm</h2>
        <ul>{queue.map(([l, n, h, a]) => <li key={l} className={n ? "has" : ""}><a href={h}><b>{n === null ? "…" : n}</b><span>{l}</span><em>{n ? a : "Không còn việc"}</em></a></li>)}</ul></section>
      <div className="kpis four">
        <Kpi icon="users" label="Người dùng đã đăng ký" value={n0(d.users)} sub={`${n0(d.new7)} mới trong 7 ngày · ${delta(d.new7, d.newPrev7)}`} />
        <Kpi icon="clock" label="Hoạt động 7 ngày" value={n0(d.active7)} sub={pct(d.active7, d.users) + " tổng số người dùng"} />
        <Kpi icon="check" label="Hồ sơ khoa học đã xác thực" value={cl ? n0((cl.verified as any[]).length) : "…"} sub={cl ? `${n0(pending ?? 0)} yêu cầu đang chờ` : ""} />
        <Kpi icon="eye" label="Quay lại (từ 2 ngày)" value={pct(d.returning, d.users)} sub={`${n0(d.returning)} người`} />
      </div>
      <div className="insights"><Bars data={d.signups} title="Đăng ký mới theo ngày" /><Bars data={d.activeDaily} title="Người dùng hoạt động theo ngày" color="dom" /></div>
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

/** Mã công trình có dạng "<mã tác giả>-W…": mở trang tác giả trong ProFind; không có mã tác giả thì mở OpenAlex. */
const workHref = (k: string) => { const m = /^(A\d+)-(W\d+)$/.exec(k); return m ? `#/tac-gia/${m[1]}` : /^W\d+$/.test(k) ? `https://openalex.org/${k}` : undefined; };
function Content() {
  const { d, err } = useGet<any>("admin-content");
  if (err) return <p className="banner demo">{err}</p>; if (!d) return <p className="empty">Đang tải…</p>;
  const a = (rows: any[], pre: string) => rows.map((r) => ({ name: r.name, n: r.n, href: `#/tac-gia/${pre ? r.k.slice(pre.length) : r.k}` }));
  return <><div className="insights"><HList title="Tác giả được xem nhiều nhất" rows={a(d.authors, "")} /><HList title="Tác giả được lưu nhiều nhất" rows={d.saved.filter((r: any) => r.k.startsWith("a|")).map((r: any) => ({ name: r.name, n: r.n, href: `#/tac-gia/${r.k.slice(2)}` }))} /></div>
    <div className="insights"><HList title="Từ khóa tìm kiếm phổ biến" rows={d.queries} /><HList title="Công trình được mở nhiều nhất" rows={d.works.map((r: any) => ({ name: r.name, n: r.n, href: workHref(r.k) }))} /></div>
    <div className="insights"><HList title="Công trình được lưu nhiều nhất" rows={d.saved.filter((r: any) => r.k.startsWith("w|")).map((r: any) => ({ name: r.name, n: r.n, href: workHref(r.k.slice(2)) }))} /></div>
    <p className="meta">Từ khóa tìm kiếm được gộp chung, không gắn với người dùng hay thiết bị. Chỉ ghi từ khóa từ 3 ký tự trở lên.</p></>;
}

const SEGS: [string, string][] = [["all", "Tất cả"], ["saver", "Đã lưu tác giả"], ["noeco", "Chưa sang ISA"], ["edufind", "Đã sang EduFind"], ["ami", "Đã sang Ami"], ["may", "Đã sang Mây"], ["noprofile", "Hồ sơ dưới 40%"], ["full", "Hồ sơ đủ"], ["oneday", "Mới dùng 1 ngày"]];
const ini = (n: string) => { const w = n.replace(/[^\p{L}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() || "?"; };
const dm = (iso: unknown) => { const x = String(iso ?? "").slice(0, 10).split("-"); return x.length === 3 ? `${x[2]}/${x[1]}/${x[0]}` : "—"; };
type UD = { user: any; saved: { k: string; t?: string; at?: number | string }[]; searches: { k: string; q?: string; d?: string; ty?: string; i?: string; sc?: string; at?: string }[]; viewed: { k: string; t?: string; at?: number }[]; verified: { authorId: string; name: string; since: number; until: number; orcid?: string }[]; claims: { id: string; authorId: string; authorName: string; kind: string; status: string; createdAt: number }[] };
const REASON: Record<string, string> = { reg: "Nút đăng ký", banner: "Lời mời", fav: "Khi lưu tác giả", ss: "Khi lưu tìm kiếm", csv: "Khi tải CSV", view: "Khi xem hồ sơ", eco: "Từ hệ sinh thái" };
/** Ngăn chi tiết một người dùng (chỉ quản trị viên): thông tin đăng ký, hoạt động, mục đã lưu, tìm kiếm, đã xem, xác thực. */
function UserDetail({ email, onClose }: { email: string; onClose: () => void }) {
  const { d, err } = useGet<UD>("admin-user", `&email=${encodeURIComponent(email)}`);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  const u = d?.user, row = (l: string, v: React.ReactNode) => <div className="udr"><dt>{l}</dt><dd>{v || <span className="meta">—</span>}</dd></div>;
  const tm = (ms: unknown) => { const t = new Date(typeof ms === "number" ? ms : String(ms)); return isNaN(+t) ? "—" : t.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }); };
  const ref = (k: string, t?: string) => { const [ty, id] = k.split("|"); return ty === "a" && id ? <a href={`#/tac-gia/${id}`} target="_blank" rel="noopener">{t || id}</a> : <span>{t || k}</span>; };
  return (
    <div className="ud-back" onClick={onClose}>
      <aside className="ud" role="dialog" aria-modal="true" aria-label="Chi tiết người dùng" onClick={(e) => e.stopPropagation()}>
        <header><div><h2>{u?.name || (d ? "(chưa khai tên)" : "Đang tải…")}</h2><p className="meta">{email}</p></div><button className="ghost" onClick={onClose} aria-label="Đóng">✕</button></header>
        {err ? <p className="banner demo">{err}</p> : !d ? <p className="empty">Đang tải…</p> : <>
          <dl className="udl">
            {row("Điện thoại", u.phone)}{row("Nghề nghiệp", u.job)}{row("Đơn vị", u.org)}{row("Địa chỉ", u.address)}
            {row("Đăng ký", tm(u.createdAt))}{row("Lần cuối", tm(u.lastSeen))}{row("Nguồn đăng ký", [REASON[u.regReason] ?? u.regReason, u.utm].filter(Boolean).join(" · "))}
            {row("Ngày dùng / Sang ISA", `${u.counts.days} ngày · EduFind ${u.hops.edufind}, Ami ${u.hops.ami}, Mây ${u.hops.may}`)}
            {row("Hồ sơ khai", `${u.profilePct}%`)}{row("Đồng ý điều khoản", u.consentAt ? tm(u.consentAt) : "")}{row("Nhận thư thông tin", u.noMail ? "Không" : "Có")}{row("Ngôn ngữ", u.lang)}
          </dl>
          <h3>Xác thực hồ sơ khoa học ({d.verified.length})</h3>
          {d.verified.length ? <ul>{d.verified.map((v) => <li key={v.authorId}><a href={`#/tac-gia/${v.authorId}`} target="_blank" rel="noopener">{v.name || v.authorId}</a> · đến {new Date(v.until).toLocaleDateString("vi-VN")}</li>)}</ul> : <p className="meta">Chưa có.</p>}
          {d.claims.length > 0 && <><h3>Yêu cầu hồ sơ ({d.claims.length})</h3><ul>{d.claims.map((c) => <li key={c.id}>{c.kind === "remove" ? "Gỡ hồ sơ" : c.kind === "hide" ? "Ẩn" : "Xác thực"} · <a href={`#/tac-gia/${c.authorId}`} target="_blank" rel="noopener">{c.authorName || c.authorId}</a> · {ST[c.status] ?? c.status} · {new Date(c.createdAt).toLocaleDateString("vi-VN")}</li>)}</ul></>}
          <h3>Đã lưu ({d.saved.length})</h3>
          {d.saved.length ? <ul>{d.saved.map((x) => <li key={x.k}>{ref(x.k, x.t)}</li>)}</ul> : <p className="meta">Chưa lưu mục nào.</p>}
          <h3>Tìm kiếm đã lưu ({d.searches.length})</h3>
          {d.searches.length ? <ul>{d.searches.map((x) => <li key={x.k}><b>{x.q || "(trống)"}</b>{[x.d, x.i, x.ty].filter(Boolean).length ? <span className="meta"> · {[x.d, x.i, x.ty].filter(Boolean).join(" · ")}</span> : null}{x.at ? <span className="meta"> · {tm(x.at)}</span> : null}</li>)}</ul> : <p className="meta">Chưa có.</p>}
          <h3>Đã xem gần đây ({d.viewed.length})</h3>
          {d.viewed.length ? <ul>{d.viewed.map((x) => <li key={x.k}>{ref(x.k, x.t)}{x.at ? <span className="meta"> · {tm(x.at)}</span> : null}</li>)}</ul> : <p className="meta">Chưa có.</p>}
        </>}
      </aside>
    </div>
  );
}
function Users() {
  const [sel, setSel] = useState<string | null>(null), [q, setQ] = useState(""), [f, setF] = useState("all"), [sort, setSort] = useState("score"), [dir, setDir] = useState("desc"), [page, setPage] = useState(1), [dq, setDq] = useState("");
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
        <div className="table-wrap"><table className="adm-t users"><thead><tr>{th("name", "Người dùng")}{th("org", "Đơn vị")}<th>Điện thoại</th>{th("createdAt", "Đăng ký")}{th("lastSeen", "Lần cuối")}{th("days", "Ngày dùng", true)}{th("favs", "Đã lưu", true)}{th("eco", "Sang ISA", true)}{th("profile", "Hồ sơ", true)}</tr></thead>
          <tbody>{d.users.map((u: any) => <tr key={u.email} className="clk" onClick={() => setSel(u.email)}>
            <td><div className="ucell"><span className="uav" aria-hidden="true">{ini(u.name || u.email)}</span><span className="utxt"><button type="button" className="ulink" onClick={(e) => { e.stopPropagation(); setSel(u.email); }} title="Xem chi tiết"><b title={u.name}>{u.name || "(chưa khai tên)"}</b></button><small title={u.email}>{u.email}</small></span></div></td>
            <td className="uorg" title={u.org}>{u.org || <span className="meta">—</span>}</td>
            <td className="nw">{u.phone || <span className="meta">—</span>}</td>
            <td className="nw">{dm(u.createdAt)}</td><td className="nw">{dm(u.lastSeen)}</td>
            <td className="num">{u.counts.days}</td><td className="num">{u.favs}</td><td className="num" title={`EduFind ${u.hops.edufind} · Ami ${u.hops.ami} · Mây ${u.hops.may}`}>{u.eco}</td>
            <td className="num"><span className="upct" title={`${u.profilePct}%`}><i><u style={{ width: `${u.profilePct}%` }} /></i><em>{u.profilePct}%</em></span></td></tr>)}</tbody></table></div>)}
      {sel && <UserDetail email={sel} onClose={() => setSel(null)} />}
      {d && <div className="pager"><button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button><span className="meta">Trang {d.page}/{d.pages} · {n0(d.total)} người</span><button className="ghost" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Sau ›</button></div>}
    </>
  );
}

type ClaimRec = { id: string; kind?: string; authorId: string; authorName: string; name: string; email: string; orcid: string; scholar: string; note: string; status: string; auto: boolean; reason?: string; createdAt: number; until?: number; decidedBy?: string; checks: { k: string; ok: boolean | null; label: string; detail: string }[]; oa: { works: number; cited: number } | null };
type VfRec = { authorId: string; email: string; name: string; until: number; since: number };
const dmy = (ms: number) => new Date(ms).toLocaleDateString("vi-VN");
const KIND: Record<string, string> = { remove: "Gỡ hồ sơ", claim: "Xác thực" };
const ST: Record<string, string> = { review: "Chờ duyệt", approved: "Đã xác thực", rejected: "Từ chối", info: "Cần bổ sung" };
const XMAIL: Record<string, string> = { sent: "đã gửi thư", "no-email": "không có email chủ hồ sơ", failed: "gửi thư lỗi", backlog: "xử lý trước khi bật thư tự động" };
function Claims() {
  const [v, setV] = useState(0), [msg, setMsg] = useState(""), [scan, setScan] = useState("");
  const { d, err } = useGet<{ claims: ClaimRec[]; verified: VfRec[]; expiring: number; allow: string[]; works: { authorId: string; doi: string; title: string; year: number; why: string }[]; hidden: { score: string[]; profile: string[] }; xw?: { authorId: string; workId: string }[]; xwdone?: { authorId: string; w: string; t: string; at: number; mail: string }[] }>("admin-claims", `&v=${v}`);
  const act = async (op: string, body: object, ok: string) => { try { await api(op, body); setMsg(ok); setV((x) => x + 1); } catch (e) { setMsg((e as Error).message); } };
  const sweep = async (silent = false) => { try { const r = await api<{ works: number; mailed: number; noEmail: number; failed: number; retry: number }>("xw-sweep", {}); if (!silent) setScan(r.works ? `Vừa xử lý ${r.works} công trình: ${r.mailed} thư đã gửi, ${r.noEmail} không gửi (không có email hoặc xử lý từ trước), ${r.failed + r.retry} lỗi gửi.` : `Chưa có công trình nào đủ điều kiện: các công trình đang chờ vẫn còn trong dữ liệu đang chạy. Cần đưa mã vào excludeWorks, dựng lại dữ liệu và triển khai thì lần quét sau mới chuyển và báo chủ hồ sơ.`);
      if (!silent || r.works) { setMsg(`Quét xong: ${r.works} công trình đã xử lý, ${r.mailed} thư đã gửi, ${r.noEmail} không gửi (không có email hoặc xử lý từ trước), ${r.failed + r.retry} lỗi gửi.`); setV((x) => x + 1); } } catch (e) { if (!silent) setMsg((e as Error).message); } };
  useEffect(() => { void sweep(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = (c: ClaimRec, decision: string) => { let reason = ""; if (decision !== "approve") { reason = prompt(decision === "reject" ? "Lý do từ chối (gửi cho tác giả):" : "Cần tác giả bổ sung gì?") ?? ""; if (!reason && !confirm("Gửi không kèm lý do?")) return; } act("admin-claim-decide", { id: c.id, decision, reason }, "Đã xử lý và gửi email cho tác giả."); };
  const manual = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); act("admin-claim-manual", { ...f, direct: f.direct === "on" }, f.direct === "on" ? "Đã xác thực ngay và gửi email cho tác giả." : "Đã chạy kiểm tra tự động cho hồ sơ này."); };
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
      <section className="card"><h2>Xác thực thủ công (ca thử, hoặc đã trao đổi riêng)</h2><p className="meta">Mặc định quản trị viên xác nhận trực tiếp (tick vàng ngay, gửi email, không cần duyệt lại). Bỏ chọn ô bên dưới để chỉ chạy kiểm tra tự động (không đạt thì vào hàng chờ). Lưu ý: tài khoản chỉ thấy hồ sơ khi đăng nhập đúng email ở ô Email; yêu cầu chờ khác của cùng hồ sơ được đóng tự động.</p>
        <form onSubmit={manual} className="form"><label className="sel"><span>Mã hồ sơ (A…)</span><input name="authorId" required placeholder="A5079721281" /></label><label className="sel"><span>Họ tên</span><input name="name" required /></label><label className="sel"><span>Email</span><input name="email" type="email" required /></label><label className="sel"><span>ORCID</span><input name="orcid" /></label><label className="sel"><span>Google Scholar</span><input name="scholar" type="url" /></label><label className="chk"><input type="checkbox" name="direct" defaultChecked />Xác thực ngay (quản trị viên xác nhận trực tiếp)</label><p><button className="primary">Chạy kiểm tra / xác thực</button></p></form></section>
      <section className="card"><h2>Công trình chủ hồ sơ báo "không phải của tôi" ({(d.xw ?? []).length})</h2><p className="meta">Đã ẩn ngay trên hồ sơ. Để loại khỏi điểm, đưa mã vào <code>excludeWorks</code> trong <code>data/corrections.json</code> (nhờ Claude áp dụng khi dựng dữ liệu). Khi công trình đã biến khỏi dữ liệu đang chạy, hệ thống <b>tự gửi thư báo chủ hồ sơ</b> (quét mỗi ngày) rồi chuyển sang mục "Đã xử lý" bên dưới, lưu 90 ngày. <button type="button" onClick={() => void sweep()}>Quét ngay</button></p>
        {scan && <p className="banner" role="status"><Icon n="check" />{scan}</p>}
        {(d.xw ?? []).length === 0 ? <p className="meta">Chưa có.</p> : <>
          <p><button type="button" className="primary" onClick={() => void navigator.clipboard.writeText(JSON.stringify({ excludeWorks: (d.xw ?? []).map((x) => x.workId) }, null, 1)).then(() => setMsg("Đã chép JSON excludeWorks."))}>Chép JSON excludeWorks</button></p>
          <details className="xwgrp"><summary>Xem theo hồ sơ ({new Set((d.xw ?? []).map((x) => x.authorId)).size} hồ sơ)</summary>
            <ul className="xwlist">{Object.entries((d.xw ?? []).reduce<Record<string, string[]>>((m, x) => { (m[x.authorId] ??= []).push(x.workId); return m; }, {})).map(([id, ws]) => <li key={id}><a href={`#/tac-gia/${id}`}>{id}</a> <b>{ws.length}</b> bài: {ws.map((w, i) => <span key={w}>{i ? ", " : ""}<a href={`https://openalex.org/${w.split("-").pop()}`} target="_blank" rel="noopener">{w.split("-").pop()}</a></span>)}</li>)}</ul>
          </details></>}</section>
      <section className="card"><h2>Đã xử lý, lưu 90 ngày ({(d.xwdone ?? []).length})</h2><p className="meta">Công trình đã loại khỏi dữ liệu. Thư báo chủ hồ sơ gửi tự động; mục tự xóa sau 90 ngày.</p>
        {(d.xwdone ?? []).length === 0 ? <p className="meta">Chưa có.</p> : <ul className="xwlist">{Object.entries((d.xwdone ?? []).reduce<Record<string, { at: number; mail: string; ws: { w: string; t: string }[] }>>((m, x) => { const k = x.authorId + "|" + dmy(x.at); (m[k] ??= { at: x.at, mail: x.mail, ws: [] }).ws.push({ w: x.w, t: x.t }); return m; }, {})).map(([k, g]) => <li key={k}>{dmy(g.at)} · <a href={`#/tac-gia/${k.split("|")[0]}`}>{k.split("|")[0]}</a> · <b>{g.ws.length}</b> bài · {XMAIL[g.mail] ?? g.mail}<details><summary>Xem bài</summary><ul>{g.ws.map((x) => <li key={x.w}><a href={`https://openalex.org/${x.w.split("-").pop()}`} target="_blank" rel="noopener">{x.t || x.w.split("-").pop()}</a></li>)}</ul></details></li>)}</ul>}</section>
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
  added: { label: "Chấp nhận đề nghị bổ sung hồ sơ nhà nghiên cứu", subject: "ProFind: hồ sơ của {{name}} đã được bổ sung", body: `Kính gửi {{name}},

ProFind đã tiếp nhận đề nghị bổ sung nhà nghiên cứu của thầy/cô và đã thêm hồ sơ vào hệ thống. Hồ sơ được lập từ mã ORCID và Google Scholar mà thầy/cô cung cấp, công trình lấy từ OpenAlex, ORCID và các nguồn công khai khác.

Thầy/cô có thể tìm hồ sơ của mình tại https://profind.isavn.edu.vn (tìm theo tên hoặc mã ORCID). Hồ sơ sẽ hiển thị đầy đủ sau lần cập nhật dữ liệu kế tiếp nếu chưa thấy ngay.

Lưu ý:
1. PRO-SCORE1000 là chỉ số tham khảo mô phỏng của ProFind, không phải đánh giá chính thức.
2. Nếu đơn vị, công trình hoặc thông tin nào chưa đúng, thầy/cô vui lòng trả lời thư này hoặc dùng nút "Đây là tôi / chỉnh sửa" trên trang hồ sơ để chúng tôi cập nhật.
3. Thầy/cô có thể yêu cầu ẩn điểm và xếp hạng, hoặc gỡ hồ sơ, bất cứ lúc nào sau khi xác minh danh tính.

Cảm ơn thầy/cô đã đồng hành cùng ProFind.

Trân trọng,
Nhóm ProFind` },
  addedEn: { label: "Accept request to add a researcher profile (English)", subject: "ProFind: your profile has been added", body: `Dear Dr. {{name}},

Thank you for your request. ProFind has added your researcher profile, built from the ORCID and Google Scholar identifiers you provided; publications come from OpenAlex, ORCID and other public sources.

You can find your profile at https://profind.isavn.edu.vn (search by name or ORCID). If it does not appear immediately, it will show after the next data update.

Please note that PRO-SCORE1000 is a simulated reference indicator, not an official evaluation. If any affiliation or publication is incorrect, reply to this email or use the "This is me / correct" option on your profile page. You may also ask us to hide your score and rank, or remove your profile, at any time after identity verification.

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
          <button onClick={exportJson}>Xuất kết quả (JSON)</button>
          <button className="danger" disabled={busy} onClick={() => { if (!confirm("LÀM LẠI TỪ ĐẦU: xóa mọi quyết định gộp và khác người của tất cả các nhóm? Việc này chưa động tới dữ liệu chính vì các cặp chọn gộp mới được áp dụng sau khi bạn xuất JSON cho trợ lý.")) return; if (prompt("Gõ XOA để xác nhận") !== "XOA") return; setBusy(true); api("admin-claim-split", { reset: true }).then(() => { setMsg("Đã xóa toàn bộ quyết định."); setPick(new Set()); setV((x) => x + 1); }).catch((e) => setErr((e as Error).message)).finally(() => setBusy(false)); }}>Làm lại từ đầu</button></p>
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
      {view !== "todo" && list.length > 0 && <section className="card spact">
        <p className="sprow2"><span className="meta">Hoàn tác (đưa về “Chưa duyệt”):</span>
          <button disabled={busy} onClick={() => tickWhere(() => true)}>Tick cả trang</button><button disabled={busy} onClick={() => setPick(new Set())}>Bỏ tick</button>
          <button className="primary" disabled={busy || !ticked.length} onClick={() => void send(ticked.map((p) => ({ a: p.a, b: p.b, decision: "undo" })), `Đã hoàn tác ${ticked.length} cặp.`)}>Hoàn tác {ticked.length} cặp đã tick</button>
          <button disabled={busy} onClick={() => confirm(`Hoàn tác toàn bộ ${list.length} cặp “${view === "merge" ? "đã chọn gộp" : "đã chọn khác người"}” trong nhóm này?`) && void send(list.map((p) => ({ a: p.a, b: p.b, decision: "undo" })), `Đã hoàn tác ${list.length} cặp.`)}>Hoàn tác cả nhóm này ({list.length})</button></p>
      </section>}
      <div className="sptable" role="list">
        {rows.map((p, i) => { const k = pk(p.a, p.b), dd = dec.get(k), on = pick.has(k);
          return (
            <div key={k} id={`sp-${i}`} role="listitem" tabIndex={0} className={`sprow${on ? " on" : ""}${i === cur ? " cur" : ""}${open === k ? " open" : ""}`} onKeyDown={(e) => onKey(e, k, i)} onFocus={() => setCur(i)}>
              <div className="spck"><input type="checkbox" checked={on} onChange={() => toggle(k)} aria-label={view === "todo" ? `Cùng một người: ${p.name}` : `Chọn để hoàn tác: ${p.name}`} tabIndex={-1} /></div>
              <div className="spcell spmain"><p className="spn">{p.name}</p>
                <p className="meta sps"><span className={`mscore s${p.band}`}>{p.score}</span> {p.shared[0]}{p.groupSize > 2 ? ` · ${p.groupSize} hồ sơ cùng tên` : ""}{p.noWorks ? " · thiếu công trình" : ""}</p>
                <p className="meta sps"><button className="lnk" onClick={() => setOpen(open === k ? null : k)}>{open === k ? "Thu gọn" : "3 công trình"}</button>{view !== "todo" && dd ? <button className="lnk" onClick={() => void send([{ a: p.a, b: p.b, decision: "undo" }], "Đã bỏ quyết định.")}>Bỏ quyết định</button> : null}</p></div>
              <Side s={p.A} full={open === k} /><Side s={p.B} full={open === k} />
            </div>); })}
      </div>
      {list.length === 0 && <p className="meta">Không có cặp nào trong mục này.</p>}
      {list.length > per && <p className="sprow2"><button disabled={page === 0} onClick={() => { setPage(page - 1); setPick(new Set()); setCur(0); }}>← Trước</button> Trang {page + 1}/{nPages} <button disabled={page + 1 >= nPages} onClick={() => { setPage(page + 1); setPick(new Set()); setCur(0); }}>Sau →</button></p>}
    </>
  );
}
type AU = { id: string; name: string; institutions: string[]; instPast?: string[] };
type MUnit = { id: string; now: boolean; w: number | null; sim?: number | null; n: number; y: [number, number] | null; same: number; other: number; none: number; inRec: number; s: { t: string; y: number; j: string | null; d: string | null; st: string }[] };
type MRev = { id: string; name: string; mainUnit?: string | null; orcid: string | null; works: number; cat: string; orcidCurrent: string[]; rankable: boolean; ids: { scopus: string | null; scholar: string | null; observed: string[]; orcidWorks: number | null }; ev: { works: number; authOrcidSame: number; authOrcidOther: number; authOrcidNone: number; inOrcidRecord: number; withDoi: number; otherOrcids: { o: string; n: number }[] }; units: MUnit[] };
const MCAT: Record<string, string> = { "orcid-khong-khop-don-vi": "ORCID có việc làm hiện tại nhưng không khớp đơn vị nào", "orcid-khong-co-viec-hien-tai": "ORCID không ghi việc làm hiện tại", "khong-orcid": "Không có ORCID", "khop-mot-phan": "ORCID khớp một phần" };
type UnitRow = { id: string; name: string };
/** Đặt tay đơn vị công tác của tác giả (hiện ngay trên website; xuất JSON để đưa vào corrections.setInstitutions khi dựng dữ liệu). */
function Evidence({ r, name }: { r: MRev; name: (id: string) => string }) {
  const q = encodeURIComponent(r.name), uq = (id: string) => encodeURIComponent(name(id)), first = r.units.find((u) => u.now) ?? r.units[0], ev = r.ev;
  return <div className="mxev">
    <p><b>Mã định danh:</b> {r.orcid ? <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noopener">ORCID {r.orcid}</a> : <span className="meta">không có ORCID</span>} · <a href={`https://openalex.org/${r.id}`} target="_blank" rel="noopener">OpenAlex {r.id}</a> · {r.ids.scopus ? <a href={`https://www.scopus.com/authid/detail.uri?authorId=${r.ids.scopus}`} target="_blank" rel="noopener">Scopus {r.ids.scopus}</a> : <a href={`https://www.scopus.com/results/authorNamesList.uri?st1=${q}`} target="_blank" rel="noopener">Tìm Scopus Author ID</a>} · {r.ids.scholar ? <a href={`https://scholar.google.com/citations?user=${r.ids.scholar}`} target="_blank" rel="noopener">Google Scholar {r.ids.scholar}</a> : <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(`author:"${r.name}"`)}`} target="_blank" rel="noopener">Tìm Google Scholar</a>} · <a href={`https://www.researchgate.net/search/researcher?q=${q}`} target="_blank" rel="noopener">Tìm ResearchGate</a>{first ? <> · <a href={`https://www.google.com/search?q=${q}+${uq(first.id)}`} target="_blank" rel="noopener">Tìm tên + {name(first.id)}</a></> : null}</p>
    {r.ids.observed.length > 1 && <p className="banner demo">OpenAlex từng thấy {r.ids.observed.length} ORCID khác nhau trên hồ sơ này ({r.ids.observed.join(", ")}): nhiều khả năng đã gộp nhiều người.</p>}
    <p className="meta">{ev.works} công trình trong ProFind · tác giả mang ORCID hồ sơ trên {ev.authOrcidSame} công trình, ORCID khác trên {ev.authOrcidOther}{ev.otherOrcids.length ? ` (${ev.otherOrcids.map((x) => `${x.o}: ${x.n}`).join("; ")})` : ""}, không ghi ORCID trên {ev.authOrcidNone}{r.ids.orcidWorks != null ? ` · danh sách công trình do chủ ORCID tự quản lý có ${r.ids.orcidWorks} mục, trùng DOI với ${ev.inOrcidRecord}/${ev.withDoi} công trình có DOI` : ""}. ORCID gắn trên công trình là ORCID mà OpenAlex gán cho tác giả đó, nên chỉ khi chủ ORCID tự khai công trình thì mới là bằng chứng độc lập.</p>
    <table className="adm-t"><thead><tr><th>Đơn vị</th><th>Công trình</th><th>Giống chủ đề đơn vị chính</th><th>Trong ORCID tự khai</th><th>Công trình mẫu</th></tr></thead><tbody>{r.units.map((u) => <tr key={u.id}><td>{name(u.id)}{u.now ? "" : " [cũ]"}</td><td>{u.n}{u.y ? ` (${u.y[0] === u.y[1] ? u.y[0] : `${u.y[0]}–${u.y[1]}`})` : ""}</td><td>{u.id === r.mainUnit ? <span className="meta">đơn vị chính</span> : u.sim == null ? "-" : u.sim < 8 ? <b className="warnb">{u.sim}%: khác chủ đề rõ rệt</b> : `${u.sim}%`}</td><td>{r.ids.orcidWorks == null ? "-" : u.inRec ? <b>{u.inRec}</b> : "0"}</td><td>{u.s.length ? <ul className="mxs">{u.s.map((x, i) => <li key={i}>{x.d ? <a href={`https://doi.org/${x.d}`} target="_blank" rel="noopener">{x.t}</a> : x.t} <span className="meta">({x.y}{x.j ? `, ${x.j}` : ""})</span></li>)}</ul> : <span className="meta">không có công trình ghi đơn vị này</span>}</td></tr>)}</tbody></table>
  </div>;
}
type T2C = { id: string; name: string; works: number; units: string[]; firstYear?: number; citations?: number; inProfind: boolean; rank: number | null };
type T2I = { name: string; inst: string; field: string; subfield: string; rank: number; np: number; firstyr: number; lastyr: number; topCntry: string; scope: string; dup: boolean; cands: T2C[] };
/** Người trong danh sách Top 2% (Việt Nam) chưa gắn được hồ sơ ProFind: chọn đúng hồ sơ trong các ứng viên hoặc ghi "không có/không gắn". Xuất JSON để đưa vào data/top2/overrides.json. */
function Top2Review() {
  const [ver, setVer] = useState(0), [view, setView] = useState<"todo" | "done">("todo"), [msg, setMsg] = useState(""), [loc, setLoc] = useState<Record<string, string>>({});
  const { d } = useGet<{ map: Record<string, string>; items: T2I[] }>("admin-t2", `&v=${ver}`);
  if (!d) return <p className="empty" role="status">Đang tải…</p>;
  const map: Record<string, string> = { ...d.map }; for (const [k, v] of Object.entries(loc)) { if (v === "clear") delete map[k]; else map[k] = v; }
  const todo = d.items.filter((i) => !map[i.name]), done = d.items.filter((i) => map[i.name]), rows = view === "todo" ? todo : done;
  const dec = async (name: string, decision: string) => { const prev = loc[name]; setLoc((l) => ({ ...l, [name]: decision })); try { await api("admin-t2", { name, decision }); setMsg(decision === "clear" ? "Đã bỏ quyết định." : decision === "none" ? "Đã ghi: không gắn." : "Đã ghi hồ sơ được chọn."); setVer((x) => x + 1); } catch (e) { setLoc((l) => { const c = { ...l }; if (prev) c[name] = prev; else delete c[name]; return c; }); setMsg((e as Error).message); } };
  const exportJson = () => { const ov: Record<string, string | null> = {}, pins: string[] = []; for (const i of done) { const v = map[i.name]; ov[i.name] = v === "none" ? null : v; const c = i.cands.find((x) => x.id === v); if (c && !c.inProfind) pins.push(c.id); } void navigator.clipboard.writeText(JSON.stringify({ overrides: ov, pins }, null, 1)).then(() => setMsg("Đã chép JSON (overrides + pins).")); };
  return (
    <section className="card"><h2>Người Top 2% (Việt Nam) chưa gắn hồ sơ</h2>
      <p className="meta">{d.items.length} người trong danh sách Top 2% (bản 9, 8/2026) chưa gắn được hồ sơ ProFind. Mỗi người có các hồ sơ ứng viên (cùng tên, hoặc tra OpenAlex theo tên). Tên giống nhau chưa đủ: hãy so đơn vị, số công trình, năm công bố đầu và hạng; cơ quan khác thường là người khác. Chọn đúng hồ sơ, hoặc "Không gắn" nếu không chắc. Ứng viên ghi "chưa có trong ProFind" cần ghim thêm hồ sơ khi áp dụng. Dùng "Chép JSON" rồi gửi tôi để đưa vào <code>data/top2/overrides.json</code> (và <code>pinned-orcids.json</code>). Quyết định lưu ở đây không đổi website cho đến khi dựng lại dữ liệu.</p>
      <p className="sprow2"><button type="button" className={view === "todo" ? "primary" : ""} onClick={() => setView("todo")}>Chưa xem ({todo.length})</button> <button type="button" className={view === "done" ? "primary" : ""} onClick={() => setView("done")}>Đã quyết định ({done.length})</button> {done.length > 0 && <button type="button" onClick={exportJson}>Chép JSON quyết định</button>}</p>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      {rows.length === 0 ? <p className="meta">{view === "todo" ? "Đã xem hết." : "Chưa có quyết định."}</p> : <ul className="mxlist">{rows.map((i) => <li key={i.name}><b>{i.name}</b> <span className="meta">· {i.inst} · {i.field}{i.subfield ? ` / ${i.subfield}` : ""} · {i.np} bài ({i.firstyr}–{i.lastyr}) · hạng sự nghiệp/năm {n0(i.rank)} · nước công bố chính {i.topCntry}{i.dup ? " · tên này có nhiều người khác đơn vị trong danh sách" : ""}</span>
        {map[i.name] && <p className="meta">Quyết định: <b>{map[i.name] === "none" ? "Không gắn" : (i.cands.find((c) => c.id === map[i.name])?.name ?? map[i.name]) + " (" + map[i.name] + ")"}</b> <button type="button" onClick={() => void dec(i.name, "clear")}>Bỏ quyết định</button></p>}
        {i.cands.length === 0 ? <p className="meta">Không có ứng viên.</p> : <table className="adm-t"><thead><tr><th>Ứng viên</th><th>Đơn vị</th><th>Công trình</th><th>Từ năm</th><th>Hạng</th><th /></tr></thead><tbody>{i.cands.map((c) => <tr key={c.id}><td><a href={`https://openalex.org/${c.id}`} target="_blank" rel="noopener">{c.name}</a> <span className="meta">{c.id}</span>{c.inProfind ? <> · <a href={`#/tac-gia/${c.id}`} target="_blank" rel="noopener">hồ sơ</a></> : <span className="meta"> · chưa có trong ProFind</span>}</td><td>{c.units.join("; ") || "–"}</td><td>{c.works}</td><td>{c.firstYear ?? "–"}</td><td>{c.rank ?? "–"}</td><td><button type="button" disabled={map[i.name] === c.id} onClick={() => void dec(i.name, c.id)}>Đúng người này</button></td></tr>)}</tbody></table>}
        {map[i.name] !== "none" && <p><button type="button" onClick={() => void dec(i.name, "none")}>Không gắn (không chắc/không có hồ sơ)</button></p>}</li>)}</ul>}
    </section>
  );
}
type MR = { id: string; name: string; rank: number | null; works: number; units: number; same: number; H: number; fld3: number; risk: number; reviewed: boolean };
/** Hồ sơ nghi gộp nhiều người, chấm từ chủ đề công trình + tên + số đơn vị (scripts/build-merge-risk.mjs). Chỉ để rà: không tự ẩn hồ sơ. */
function MergeRisk() {
  const [ver, setVer] = useState(0), [view, setView] = useState<"todo" | "one" | "multi">("todo"), [n, setN] = useState(25), [msg, setMsg] = useState(""), [loc, setLoc] = useState<Record<string, string>>({});
  const { d } = useGet<{ map: Record<string, string>; profiles: MR[] }>("admin-mrisk", `&v=${ver}`);
  const list = d?.profiles ?? null;
  if (!list || !d) return <p className="empty" role="status">Đang tải…</p>;
  const map: Record<string, string> = { ...d.map }; for (const [k, v] of Object.entries(loc)) { if (v === "clear") delete map[k]; else map[k] = v; }
  const rows = list.filter((r) => (view === "todo" ? !map[r.id] : map[r.id] === view)), cnt = (k: string) => list.filter((r) => map[r.id] === k).length;
  const dec = async (id: string, decision: string) => { const prev = loc[id]; setLoc((l) => ({ ...l, [id]: decision })); try { await api("admin-mrisk", { authorId: id, decision }); setMsg(decision === "one" ? "Đã ghi: một người." : decision === "multi" ? "Đã ghi: nhiều người, cần tách." : "Đã bỏ quyết định."); setVer((x) => x + 1); } catch (e) { setLoc((l) => { const c = { ...l }; if (prev) c[id] = prev; else delete c[id]; return c; }); setMsg((e as Error).message); } };
  return (
    <section className="card"><h2>Hồ sơ nghi gộp nhiều người</h2>
      <p className="meta">{list.length} hồ sơ ở nhóm 11% có điểm rủi ro cao nhất, tính từ chủ đề công trình, số hồ sơ cùng tên và số đơn vị. Kiểm định trên mẫu gán nhãn: khoảng 3 trong 4 hồ sơ ở nhóm này đúng là nghi gộp, nhưng chỉ bắt được khoảng 30% tổng số. Đây là danh sách để rà, không tự ẩn hồ sơ. Mở hồ sơ, xem công trình rồi ghi "Một người" hoặc "Nhiều người". Quyết định được lưu ở đây để theo dõi; muốn tách hoặc ẩn hồ sơ thì đưa vào <code>corrections.json</code> (<code>suspect</code>, <code>notSuspect</code>, <code>setInstitutions</code>).</p>
      <p className="sprow2"><button type="button" className={view === "todo" ? "primary" : ""} onClick={() => { setView("todo"); setN(25); }}>Chưa rà ({list.length - cnt("one") - cnt("multi")})</button> <button type="button" className={view === "multi" ? "primary" : ""} onClick={() => { setView("multi"); setN(25); }}>Nhiều người ({cnt("multi")})</button> <button type="button" className={view === "one" ? "primary" : ""} onClick={() => { setView("one"); setN(25); }}>Một người ({cnt("one")})</button></p>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      {rows.length === 0 ? <p className="meta">Không có hồ sơ.</p> : <ul className="mxlist">{rows.slice(0, n).map((r) => <li key={r.id}><b>{r.name}</b> <span className="meta">{r.id} · {r.works} công trình · {r.units} đơn vị · {r.same} hồ sơ cùng tên · điểm rủi ro {r.risk}{r.rank ? ` · hạng ${r.rank}` : " · không xếp hạng"}{r.reviewed ? " · đã có đính chính" : ""}</span><br />
        <a href={`#/tac-gia/${r.id}`} target="_blank" rel="noopener">Xem hồ sơ</a> · <a href={`https://openalex.org/${r.id}`} target="_blank" rel="noopener">OpenAlex</a> <button type="button" onClick={() => void dec(r.id, "one")} disabled={map[r.id] === "one"}>Một người</button> <button type="button" onClick={() => void dec(r.id, "multi")} disabled={map[r.id] === "multi"}>Nhiều người</button>{map[r.id] && <> <button type="button" onClick={() => void dec(r.id, "clear")}>Bỏ quyết định</button></>}</li>)}</ul>}
      {rows.length > n && <p><button type="button" onClick={() => setN(n + 25)}>Hiện thêm 25</button></p>}
      {cnt("multi") > 0 && <p><button type="button" onClick={() => void navigator.clipboard.writeText(JSON.stringify(list.filter((r) => map[r.id] === "multi").map((r) => r.id), null, 1)).then(() => setMsg("Đã chép danh sách mã hồ sơ nhiều người."))}>Chép mã các hồ sơ "Nhiều người"</button></p>}
    </section>
  );
}
function AuthorUnits() {
  const [data, setData] = useState<{ authors: AU[]; units: UnitRow[] } | null>(null), [err, setErr] = useState(""), [q, setQ] = useState(""), [sel, setSel] = useState<AU | null>(null), [now, setNow] = useState<Set<string>>(new Set()), [past, setPast] = useState<Set<string>>(new Set()), [uq, setUq] = useState(""), [msg, setMsg] = useState(""), [rev, setRev] = useState<MRev[] | null>(null), [rv, setRv] = useState<"todo" | "done">("todo"), [rn, setRn] = useState(20), [ver, setVer] = useState(0);
  const { d: ov } = useGet<{ map: Record<string, { now: string[]; past: string[] }> }>("inst", `&v=${ver}`);
  useEffect(() => { fetch("/data/profind.json").then((r) => r.json()).then((j: { authors: AU[]; institutions: { id: string; name: string }[] }) => setData({ authors: j.authors, units: j.institutions.map((i) => ({ id: i.id, name: i.name })) })).catch(() => setErr("Không tải được dữ liệu tác giả.")); }, []);
  useEffect(() => { fetch("/data/_multi-review.json", { cache: "no-store" }).then((r) => r.json()).then((j: { profiles: MRev[] }) => setRev(j.profiles)).catch(() => setRev([])); }, []);
  if (err) return <p className="banner demo" role="alert">{err}</p>;
  if (!data) return <p className="empty" role="status">Đang tải…</p>;
  const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  const name = (id: string) => data.units.find((u) => u.id === id)?.name ?? id;
  const hits = q.trim().length >= 3 ? data.authors.filter((a) => fold(a.name).includes(fold(q.trim())) || a.id.toLowerCase() === q.trim().toLowerCase()).slice(0, 12) : [];
  const pick = (a: AU) => { const o = ov?.map?.[a.id]; setSel(a); setNow(new Set(o?.now ?? a.institutions.filter((u) => !(a.instPast ?? []).includes(u)))); setPast(new Set(o?.past ?? a.instPast ?? [])); setMsg(""); };
  const toggle = (u: string, which: "now" | "past") => { const [a, b, sa, sb] = which === "now" ? [now, past, setNow, setPast] : [past, now, setPast, setNow]; const n = new Set(a); if (n.has(u)) n.delete(u); else { n.add(u); const m = new Set(b); m.delete(u); sb(m); } sa(n); };
  const save = async () => { if (!sel) return; try { await api("admin-claim-inst", { authorId: sel.id, now: [...now], past: [...past] }); setMsg(`Đã lưu ${Date.now()}`); setVer((x) => x + 1); } catch (e) { setMsg((e as Error).message); } };
  const clear = async () => { if (!sel) return; try { await api("admin-claim-inst", { authorId: sel.id, clear: true }); setMsg(`Đã bỏ ghi đè ${Date.now()}`); setVer((x) => x + 1); } catch (e) { setMsg((e as Error).message); } };
  const shown = [...new Set([...now, ...past, ...(sel?.institutions ?? [])])];
  const cand = uq.trim().length >= 2 ? data.units.filter((u) => fold(u.name).includes(fold(uq.trim())) && !shown.includes(u.id)).slice(0, 8) : [];
  const all = ov?.map ?? {};
  const reviewed = (id: string) => !!all[id], todoList = (rev ?? []).filter((r) => !reviewed(r.id)), doneList = (rev ?? []).filter((r) => reviewed(r.id));
  const open = (id: string) => { const a = data.authors.find((x) => x.id === id); if (a) { pick(a); window.scrollTo({ top: document.getElementById("uedit-anchor")?.offsetTop ?? 0, behavior: "smooth" }); } };
  const after = (id: string) => { const nx = todoList.find((r) => r.id !== id); if (nx) open(nx.id); };
  const keepAsIs = async () => { if (!sel) return; try { await api("admin-claim-inst", { authorId: sel.id, now: sel.institutions.filter((u) => !(sel.instPast ?? []).includes(u)), past: sel.instPast ?? [] }); setMsg(`Đã giữ nguyên ${Date.now()}`); setVer((x) => x + 1); after(sel.id); } catch (e) { setMsg((e as Error).message); } };
  const saveNext = async () => { if (!sel) return; await save(); after(sel.id); };
  const rows = rv === "todo" ? todoList : doneList;
  return (
    <section className="card"><h2>Đơn vị tác giả</h2>
      <p className="meta">Dùng khi OpenAlex gộp nhiều người hoặc ghi sai nơi công tác. "Hiện tại" xếp trước; "trước đây" hiện mờ. Lưu xong website đổi ngay (không cần dựng lại); mục cuối trang cho chép JSON để đưa vào <code>corrections.setInstitutions</code> cho bản dựng sau.</p>
      {rev && rev.length > 0 && <div className="card"><h3>Hồ sơ nhiều đơn vị cần duyệt ({todoList.length} chưa duyệt / {rev.length})</h3>
        <p className="meta">Các hồ sơ đã xếp hạng có từ 3 đơn vị hiện tại độc lập mà ORCID chưa đủ để tự sửa. Bấm "Duyệt" để mở bộ chỉnh bên dưới: tick đơn vị đúng là "Hiện tại", đơn vị còn lại là "Trước đây", rồi "Lưu và sang hồ sơ tiếp". Nếu đơn vị đang hiển thị đã đúng, bấm "Giữ nguyên (đã xem)". Mỗi lần lưu có hiệu lực ngay, và cuối trang có nút chép JSON để đưa vào <code>corrections.setInstitutions</code>.</p>
        <p className="sprow2"><button type="button" className={rv === "todo" ? "primary" : ""} onClick={() => { setRv("todo"); setRn(20); }}>Chưa duyệt ({todoList.length})</button> <button type="button" className={rv === "done" ? "primary" : ""} onClick={() => { setRv("done"); setRn(20); }}>Đã duyệt ({doneList.length})</button></p>
        {rows.length === 0 ? <p className="meta">{rv === "todo" ? "Đã duyệt hết." : "Chưa có hồ sơ nào được duyệt."}</p> : <ul className="mxlist">{rows.slice(0, rn).map((r) => <li key={r.id}><b>{r.name}</b> <span className="meta">{r.id} · {r.works} công trình · {MCAT[r.cat] ?? r.cat}{r.rankable ? "" : " · không xếp hạng"}</span><br />
          <span className="meta">{r.orcid ? <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noopener">ORCID {r.orcid}</a> : "Không có ORCID"}{r.orcidCurrent.length ? <> · ORCID ghi hiện tại: {r.orcidCurrent.join("; ")}</> : null}</span><br />
          <span>{r.units.map((u) => <span key={u.id} className={u.now ? "" : "past"}>{name(u.id)}{u.w != null ? ` (${u.w})` : ""}{u.now ? "" : " [cũ]"}; </span>)}</span> <a href={`#/tac-gia/${r.id}`}>Xem hồ sơ</a> <button type="button" onClick={() => open(r.id)}>{rv === "todo" ? "Duyệt" : "Sửa lại"}</button><details><summary>Bằng chứng: mã định danh, công trình theo đơn vị</summary><Evidence r={r} name={name} /></details></li>)}</ul>}
        {rows.length > rn && <p><button type="button" onClick={() => setRn(rn + 20)}>Hiện thêm 20</button></p>}</div>}
      <label className="sel"><span>Tìm tác giả (tên từ 3 ký tự, hoặc mã A…)</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nguyen Van Dung" /></label>
      {hits.length > 0 && <ul className="mxlist">{hits.map((a) => <li key={a.id}><button type="button" className="linkbtn" onClick={() => pick(a)}>{a.name}</button> <span className="meta">{a.id} · {a.institutions.map(name).join(", ")}</span></li>)}</ul>}
      {sel && <div className="uedit" id="uedit-anchor"><h3>{sel.name} <span className="meta">{sel.id}</span></h3>
        <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg.replace(/ \d+$/, "")}</p>}</div>
        {(() => { const r = rev?.find((x) => x.id === sel.id); return r ? <Evidence r={r} name={name} /> : null; })()}
        <table className="adm-t"><thead><tr><th>Đơn vị</th><th>Hiện tại</th><th>Trước đây</th></tr></thead><tbody>{shown.map((u) => <tr key={u}><td>{name(u)}</td><td><input type="checkbox" checked={now.has(u)} onChange={() => toggle(u, "now")} aria-label={`${name(u)}: hiện tại`} /></td><td><input type="checkbox" checked={past.has(u)} onChange={() => toggle(u, "past")} aria-label={`${name(u)}: trước đây`} /></td></tr>)}</tbody></table>
        <label className="sel"><span>Thêm đơn vị (gõ tên)</span><input value={uq} onChange={(e) => setUq(e.target.value)} placeholder="Đại học Đồng Tháp" /></label>
        {cand.length > 0 && <ul className="mxlist">{cand.map((u) => <li key={u.id}><button type="button" className="linkbtn" onClick={() => { setNow(new Set([...now, u.id])); setUq(""); }}>{u.name}</button></li>)}</ul>}
        <p><button type="button" className="primary" disabled={!now.size} onClick={() => void save()}>Lưu</button> {rev?.some((r) => r.id === sel.id) && <><button type="button" className="primary" disabled={!now.size} onClick={() => void saveNext()}>Lưu và sang hồ sơ tiếp</button> <button type="button" onClick={() => void keepAsIs()}>Giữ nguyên (đã xem)</button> </>}<button type="button" onClick={() => void clear()}>Bỏ ghi đè (về dữ liệu dựng sẵn)</button></p></div>}
      <h3>Đã đặt tay ({Object.keys(all).length})</h3>
      {Object.keys(all).length === 0 ? <p className="meta">Chưa có.</p> : <><ul className="xwlist">{Object.entries(all).map(([id, o]) => <li key={id}><a href={`#/tac-gia/${id}`}>{data.authors.find((a) => a.id === id)?.name ?? id}</a> · {o.now.map(name).join(", ")}{o.past?.length ? <span className="past"> · trước đây: {o.past.map(name).join(", ")}</span> : null}</li>)}</ul>
        <p><button type="button" onClick={() => void navigator.clipboard.writeText(JSON.stringify({ setInstitutions: Object.fromEntries(Object.entries(all).map(([id, o]) => [id, o.past?.length ? { now: o.now, past: o.past } : o.now])) }, null, 1)).then(() => setMsg("Đã chép JSON setInstitutions."))}>Chép JSON setInstitutions</button></p></>}
    </section>
  );
}
