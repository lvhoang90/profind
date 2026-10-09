import { useEffect, useState, type FormEvent } from "react";
import { useT } from "./i18n";
import { Icon, type IconName } from "./icons";
import { useAccount, api, type User } from "./accountStore";
import { EcoLink } from "./Footer";
import { evt } from "./analytics";
import { ScholarConsole, useMine } from "./Verified";
import { Achievements, StarStrip, InviteCard } from "./Achievements";

const TABS: [string, string, IconName][] = [["", "tabProfile", "user"], ["thanh-tich", "Thành tích", "star"], ["tong-quan", "tabOverview", "grid"], ["da-luu", "tabSaved", "star"], ["tim-kiem", "tabSearches", "search"], ["da-xem", "tabViewed", "eye"]];
const initials = (n: string) => { const w = n.replace(/[^\p{L}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() || "P"; };
const ago = (iso: string | number, lang: string) => new Date(iso).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AccountPage({ tab }: { tab: string }) {
  const { t } = useT();
  const { cfg, user } = useAccount();
  if (cfg === null || user === undefined) return <p className="empty" role="status">{t("loading")}</p>;
  if (!cfg.enabled) return <article className="auth-off"><h1>{t("accTitle")}</h1><p className="empty" role="alert">{t("aOff")}</p></article>;
  return user ? <Dashboard user={user} tab={tab} /> : <AuthPanel />;
}

function AuthPanel() {
  const { t, lang } = useT();
  const { cfg, setUser, refresh } = useAccount();
  const [mode, setMode] = useState<"login" | "reg">("login"), [step, setStep] = useState<"form" | "code">("form"), [email, setEmail] = useState(""), [phone, setPhone] = useState(""), [name, setName] = useState(""), [consent, setConsent] = useState(false), [marketing, setMarketing] = useState(false), [code, setCode] = useState("");
  const [need, setNeed] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [wait, setWait] = useState(0);
  useEffect(() => { evt("reg_open"); }, []);
  useEffect(() => { if (wait <= 0) return; const id = window.setTimeout(() => setWait(wait - 1), 1000); return () => window.clearTimeout(id); }, [wait]);
  const send = async (e?: FormEvent) => {
    e?.preventDefault(); setBusy(true); setErr("");
    try {
      // Đăng nhập: chỉ gửi email. Đăng ký: kèm số điện thoại, tên và đồng ý.
      const r = await api<{ retry?: number }>("request", mode === "reg" ? { email, phone, name, consent, lang } : { email, lang });
      setStep("code"); setWait(r.retry ?? 45); evt("reg_start");
    } catch (x: any) { setErr(x.message || t("aErr")); if (x.retry) setWait(x.retry); } finally { setBusy(false); }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      let rv = 0; try { rv = Number(localStorage.getItem("profind.rv")) || 0; } catch { /* bỏ qua */ }
      let ref = ""; try { ref = localStorage.getItem("profind.ref") || ""; } catch { /* bỏ qua */ }
      const r = await api<{ user?: User; isNew?: boolean; need?: string }>("verify", { email, code, lang, rv, ref, reason: sessionStorage.getItem("profind.reason") || "reg", ...(need || mode === "reg" ? { phone, name, consent, marketing } : {}) });
      if (r.need === "profile") { setNeed(true); return; } // email chưa có tài khoản: xin bổ sung số điện thoại
      setUser(r.user!); await refresh(); evt(r.isNew ? "reg_done" : "login_done");
      const back = sessionStorage.getItem("profind.ret"); sessionStorage.removeItem("profind.ret"); sessionStorage.removeItem("profind.reason");
      location.hash = back && back.startsWith("#/") && !back.startsWith("#/tai-khoan") ? back : "#/tai-khoan";
    } catch (x: any) { setErr(x.message || t("aErr")); } finally { setBusy(false); }
  };
  const emailField = <label className="sel"><span><Icon n="mail" size={14} />{t("aEmail")}</span><input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>;
  const profileFields = <>
    <label className="sel"><span><Icon n="phone" size={14} />{t("aPhone")}</span><input type="tel" required autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="09xx xxx xxx" /><small className="meta">{t("aPhoneHint")}</small></label>
    <label className="sel"><span><Icon n="user" size={14} />{t("aName")}</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
    <label className="chk consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /><span>{t("aConsent")}</span></label>
    <label className="chk consent"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><span>{t("aMarket")}</span></label>
  </>;
  return (
    <article className="auth">
      <div className="auth-side">
        <span className="kic big"><Icon n="spark" size={26} /></span>
        <h1>{t("regTitle")}</h1>
        <p>{t("regLead")}</p>
        <ul className="perks">{(["perk1", "perk2", "perk3", "perk4"] as const).map((k) => <li key={k}><Icon n="check" size={18} />{t(k)}</li>)}</ul>
        <p className="pledge"><Icon n="shield" size={16} /> {cfg?.pledge?.[lang]}</p>
      </div>
      <div className="auth-box">
        {step === "form" && <div className="seg auth-tabs" role="tablist" aria-label={t("accTitle")}>{(["login", "reg"] as const).map((m) => <button key={m} role="tab" aria-selected={mode === m} aria-pressed={mode === m} onClick={() => { setMode(m); setErr(""); }}>{t(m === "login" ? "loginTab" : "regTab")}</button>)}</div>}
        {step === "form" ? (
          <form className="auth-form card" onSubmit={send}>
            {mode === "login" && <p className="meta">{t("loginLead")}</p>}
            {emailField}
            {mode === "reg" && profileFields}
            <div role="alert">{err && <p className="banner demo">{err}</p>}</div>
            <button className="primary" disabled={busy}>{busy ? t("aSending") : t("aSend")}</button>
            <p className="meta auth-sw">{mode === "login" ? <>{t("noAcc")} <button type="button" className="linkb" onClick={() => setMode("reg")}>{t("regTab")}</button></> : <>{t("haveAcc")} <button type="button" className="linkb" onClick={() => setMode("login")}>{t("loginTab")}</button></>}</p>
          </form>
        ) : (
          <form className="auth-form card" onSubmit={verify}>
            <p className="banner"><Icon n="mail" />{t("aCodeSent", { e: email })}</p>
            <label className="sel"><span>{t("aCode")}</span><input className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            {need && mode === "login" && <><p className="banner demo" role="note">{t("needProfile")}</p>{profileFields}</>}
            <div role="alert">{err && <p className="banner demo">{err}</p>}</div>
            <button className="primary" disabled={busy || code.length !== 6}>{busy ? t("aSending") : t("aVerify")}</button>
            <p className="auth-links"><button type="button" className="linkb" disabled={wait > 0 || busy} onClick={() => void send()}>{wait > 0 ? t("aResendIn", { s: wait }) : t("aResend")}</button><button type="button" className="linkb" onClick={() => { setStep("form"); setCode(""); setErr(""); setNeed(false); }}>{t("aChange")}</button></p>
          </form>
        )}
      </div>
    </article>
  );
}

function Dashboard({ user, tab }: { user: User; tab: string }) {
  const { t, lang, num } = useT();
  const { favs, searches, views, logout } = useAccount();
  const { list: mine, reload } = useMine();
  const cur = TABS.some((x) => x[0] === tab) ? tab : ""; // "ho-so" và "khoa-hoc" (liên kết cũ) rơi về tab Hồ sơ
  const hello = user.name ? t("welcomeBack", { n: user.name }) : t("welcomeNew");
  return (
    <article className="dash">
      <header className="dash-head">
        <div className="av" aria-hidden="true">{initials(user.name || user.email)}</div>
        <div className="dh-main"><h1>{hello}</h1><p className="meta">{user.email} · {t("memberSince", { d: ago(user.createdAt, lang) })}</p><StarStrip user={user} verified={mine?.length ?? 0} saved={favs.size + searches.length} />
          <div className="pct" role="img" aria-label={t("pDone", { n: user.profilePct })}><i><u style={{ width: `${user.profilePct}%` }} /></i><span>{t("pDone", { n: user.profilePct })}</span></div></div>
        <div className="dh-act">{user.isAdmin && <a className="btn-admin" href="#/quan-tri"><Icon n="grid" size={18} />Quản trị</a>}<button className="ghost light" onClick={() => void logout().then(() => { location.hash = "#/"; })}><Icon n="logout" size={16} />{t("logout")}</button></div>
      </header>
      <nav className="tabs" aria-label={t("accTitle")}>{TABS.map(([k, l, ic]) => <a key={k} href={`#/tai-khoan${k ? "/" + k : ""}`} aria-current={cur === k ? "page" : undefined}><Icon n={ic} size={16} />{l.startsWith("tab") ? t(l as "tabSaved") : l}{k === "da-luu" && favs.size > 0 && <em>{favs.size}</em>}</a>)}</nav>
      {cur === "" && <ProfileTab user={user} mine={mine} reload={reload} />}
      {cur === "thanh-tich" && <Achievements user={user} mine={mine} />}
      {cur === "tong-quan" && <Overview user={user} />}
      {cur === "da-luu" && <Saved />}
      {cur === "tim-kiem" && <Searches />}
      {cur === "da-xem" && <Viewed />}
      <span className="sr">{num(searches.length + views.length)}</span>
    </article>
  );
}

function Overview({ user }: { user: User }) {
  const { t, lang, num } = useT();
  const { favs, searches, views } = useAccount();
  const saved = [...favs.values()].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 5), seen = views.slice(0, 5);
  const stats: [IconName, string, number][] = [["star", "stSaved", favs.size], ["search", "stSearches", searches.length], ["eye", "stViewed", views.length], ["clock", "stDays", user.counts.days]];
  return (
    <>
      <div className="kpis four">{stats.map(([ic, l, n]) => <div className="kpi" key={l}><span className="kic"><Icon n={ic} size={20} /></span><b>{num(n)}</b><span>{t(l as "stSaved")}</span></div>)}</div>
      <div className="insights">
        <section className="card"><h2>{t("tabSaved")}</h2>{saved.length ? <ul className="mini">{saved.map((f) => <li key={f.k}><a href={f.k.startsWith("w|") ? f.u || "#" : `#/tac-gia/${f.k.slice(2)}`} {...(f.k.startsWith("w|") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{f.t}</a><span className="meta">{f.s}</span></li>)}</ul> : <p className="meta">{t("emptySaved")}</p>}{favs.size > 5 && <a href="#/tai-khoan/da-luu">→ {t("tabSaved")}</a>}</section>
        <section className="card"><h2>{t("tabViewed")}</h2>{seen.length ? <ul className="mini">{seen.map((v) => <li key={v.k}><ViewLink v={v} /><span className="meta">{ago(v.at, lang)}</span></li>)}</ul> : <p className="meta">{t("emptyViewed")}</p>}{views.length > 5 && <a href="#/tai-khoan/da-xem">→ {t("tabViewed")}</a>}</section>
      </div>
      <section className="next" aria-labelledby="nx"><h2 id="nx">{t("nextTitle")}</h2><p className="meta">{t("nextLead")}</p>
        <div className="next-grid">
          {([["edufind", "nEdu", "nEduD", "nEduB", "book"], ["ami", "nAmi", "nAmiD", "nAmiB", "link"], ["may", "nMay", "nMayD", "nMayB", "spark"]] as const).map(([a, h, d, b, ic]) => (
            <div className="ncard" key={a}><span className="kic"><Icon n={ic} size={20} /></span><h3>{t(h)}</h3><p>{t(d)}</p><EcoLink app={a} place="account" className="btn">{t(b)} <Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink></div>))}
        </div></section>
    </>
  );
}

function Saved() {
  const { t, lang, num } = useT();
  const { favs, toggleFav } = useAccount();
  const items = [...favs.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!items.length) return <p className="empty">{t("emptySaved")}</p>;
  const isW = (f: { k: string }) => f.k.startsWith("w|");
  return <ul className="rows">{items.map((f) => (
    <li key={f.k} className="row-card"><span className="kic"><Icon n={isW(f) ? "scroll" : "user"} size={18} /></span>
      <div className="rc-main">{isW(f) ? <a className="rc-t" href={f.u || "#"} target="_blank" rel="noopener noreferrer">{f.t}<span className="sr"> {t("newTab")}</span></a> : <a className="rc-t" href={`#/tac-gia/${f.k.slice(2)}`}>{f.t}</a>}<div className="meta">{isW(f) ? `${t("savedWork")} · ` : ""}{f.s}</div><div className="meta">{t("savedOn", { d: ago(f.at, lang) })}</div></div>
      <div className="rc-side">{f.sc != null && <span className="score">{num(f.sc, 2)}</span>}{f.rk ? <span className="meta">#{num(f.rk)}</span> : null}</div>
      <button className="ghost" onClick={() => void toggleFav(f.k, { t: f.t })}><Icon n="trash" size={16} /><span className="sr">{t("remove")}</span><span aria-hidden="true">{t("remove")}</span></button></li>))}</ul>;
}

function Searches() {
  const { t, lang } = useT();
  const { searches, removeSearch } = useAccount();
  if (!searches.length) return <p className="empty">{t("emptySearches")}</p>;
  const href = (s: (typeof searches)[number]) => `#/?${new URLSearchParams(Object.entries({ q: s.q, d: s.d, ty: s.ty, i: s.i, sc: s.sc === "all" ? "all" : "" }).filter(([, v]) => v)).toString()}`;
  return <ul className="rows">{searches.map((s) => (
    <li key={s.k} className="row-card"><span className="kic"><Icon n="search" size={18} /></span>
      <div className="rc-main"><a className="rc-t" href={href(s)}>{s.label || s.q || "—"}</a><div className="meta">{t("savedOn", { d: ago(s.at, lang) })}</div></div>
      <a className="ghost-link" href={href(s)}>{t("open")}</a>
      <button className="ghost" onClick={() => void removeSearch(s.k)}><Icon n="trash" size={16} />{t("remove")}</button></li>))}</ul>;
}

function ViewLink({ v }: { v: { k: string; t: string; u?: string } }) {
  return v.k.startsWith("a|") ? <a href={`#/tac-gia/${v.k.slice(2)}`}>{v.t}</a> : <a href={v.u || "#"} target="_blank" rel="noopener">{v.t}</a>;
}

function Viewed() {
  const { t, lang, num } = useT();
  const { views, clearViews } = useAccount();
  const [f, setF] = useState<"all" | "a" | "w">("all");
  const items = views.filter((v) => f === "all" || v.k.startsWith(f + "|"));
  return (
    <>
      <div className="wbar"><div className="seg" role="group" aria-label={t("tabViewed")}>{([["all", "tabViewed"], ["a", "viewedA"], ["w", "viewedW"]] as const).map(([k, l]) => <button key={k} aria-pressed={f === k} onClick={() => setF(k)}>{t(l)}</button>)}</div>
        {views.length > 0 && <button className="ghost" onClick={() => { if (confirm(t("clearConfirm"))) void clearViews(); }}><Icon n="trash" size={16} />{t("clearAll")}</button>}</div>
      {!items.length ? <p className="empty">{t("emptyViewed")}</p> : <ul className="rows">{items.map((v) => (
        <li key={v.k} className="row-card"><span className="kic"><Icon n={v.k.startsWith("a|") ? "user" : "book"} size={18} /></span>
          <div className="rc-main"><span className="rc-t"><ViewLink v={v} /></span><div className="meta">{v.s}</div><div className="meta">{ago(v.at, lang)}{v.n > 1 && <> · {t("viewedTimes", { n: num(v.n) })}</>}</div></div>
          <button className="ghost" onClick={() => void clearViews(v.k)}><Icon n="trash" size={16} />{t("remove")}</button></li>))}</ul>}
    </>
  );
}

/** Hồ sơ khoa học (nếu đã xác thực) đứng đầu, rồi thông tin tài khoản; chưa xác thực thì thông tin tài khoản trước, lời mời xác thực sau. */
function ProfileTab({ user, mine, reload }: { user: User; mine: import("./Verified").Mine[] | null; reload: () => void }) {
  const has = !!mine?.length;
  return has ? <><ScholarConsole list={mine} reload={reload} /><h2 className="prof-sci">Tài khoản của tôi</h2><Profile user={user} /><InviteCard user={user} compact /></>
    : <><Profile user={user} /><h2 className="prof-sci">Hồ sơ khoa học</h2><ScholarConsole list={mine} reload={reload} /><InviteCard user={user} compact /></>;
}
function Profile({ user }: { user: User }) {
  const { t } = useT();
  const { setUser, logout } = useAccount();
  const [f, setF] = useState({ name: user.name, phone: user.phone, job: user.job, org: user.org, address: user.address, noMail: !user.noMail }), [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const save = async (e: FormEvent) => { e.preventDefault(); setErr(""); setMsg(""); try { const r = await api<{ user: User }>("profile", { ...f, noMail: !f.noMail }); setUser(r.user); setMsg(t("pSaved")); } catch (x: any) { setErr(x.message); } };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="prof">
      <form className="card form" onSubmit={save}>
        <label className="sel"><span>{t("pName")}</span><input value={f.name} onChange={set("name")} maxLength={80} autoComplete="name" /></label>
        <label className="sel"><span>{t("pPhone")}</span><input type="tel" value={f.phone} onChange={set("phone")} maxLength={20} autoComplete="tel" /></label>
        <label className="sel"><span>{t("pJob")}</span><input value={f.job} onChange={set("job")} maxLength={80} /></label>
        <label className="sel"><span>{t("pOrg")}</span><input value={f.org} onChange={set("org")} maxLength={120} autoComplete="organization" /></label>
        <label className="sel"><span>{t("pAddr")}</span><input value={f.address} onChange={set("address")} maxLength={200} autoComplete="street-address" /></label>
        <label className="chk consent"><input type="checkbox" checked={f.noMail} onChange={(e) => setF({ ...f, noMail: e.target.checked })} /><span>{t("pMail")}</span></label>
        <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}{err && <p className="banner demo">{err}</p>}</div>
        <button className="primary">{t("pSave")}</button>
      </form>
      <aside className="card danger">
        <p className="meta">{user.email}</p>
        <a className="ghost-link" href="/api/account?op=export" download><Icon n="download" size={16} />{t("exportData")}</a>
        <button className="ghost" onClick={() => void logout().then(() => { location.hash = "#/"; })}><Icon n="logout" size={16} />{t("logout")}</button>
        <button className="ghost bad" onClick={() => { if (confirm(t("deleteConfirm"))) void api("delete", {}).then(() => logout()).then(() => { location.hash = "#/"; }); }}><Icon n="trash" size={16} />{t("deleteAcc")}</button>
      </aside>
    </div>
  );
}
