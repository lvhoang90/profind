import { createPortal } from "react-dom";
import { Component, Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Ctx, DICT, KEY, initialLang, useT, type Key, type Lang } from "./i18n";
import { dName, fieldName } from "./disciplines";
import { Icon, type IconName } from "./icons";
import type { Author, Data, Institution, Work } from "./types";
import { AccountProvider, useAccount } from "./accountStore";
// Trang tài khoản và quản trị tách thành các tệp nạp riêng: người chỉ tra cứu không tải mã của chúng.
const AccountPage = lazy(() => import("./Account").then((m) => ({ default: m.AccountPage })));
const AboutPage = lazy(() => import("./About").then((m) => ({ default: m.AboutPage })));
const AdminPage = lazy(() => import("./Admin").then((m) => ({ default: m.AdminPage })));
import { HeroArt } from "./HeroArt";
import { useWorks } from "./wsearch";
import { StarBtn } from "./StarBtn";
import { VisitChip } from "./VisitChip";
import { Footer, EcoLink } from "./Footer";
import { evt, startSession } from "./analytics";
import { getTheme, setTheme, type Theme } from "./theme";

type SortKey = "totalScore" | "worksCount" | "citations" | "name" | "unit" | "lastYear" | "rank";
const TEXT_KEYS: SortKey[] = ["name", "unit"], RANK_ASC: SortKey[] = [], RANKED: SortKey[] = ["totalScore", "worksCount", "citations"]; // huy chương chỉ khi xếp giảm dần theo một chỉ số
const RANK_KEY = { totalScore: "rankScore", worksCount: "rankWorks", citations: "rankCit", name: "rankScore", unit: "rankScore", lastYear: "rankScore", rank: "rankScore" } as const;
const EDUFIND = "https://edufind.isavn.edu.vn";
const CONTACT = "luongviethoang.hcm@gmail.com";
const PAGE = 25; // mỗi trang tối đa 25 kết quả
const TOP2_DOI = "https://doi.org/10.17632/btchxktzyw.8";
const TOP2_LIC = "https://creativecommons.org/licenses/by-nc/3.0/";

/** Giải mã đường dẫn băm an toàn: chuỗi % sai (vd. %E0%A4%A) không được làm sập trang. */
function parseRoute(): { kind: string; id: string; query: string } {
  const full = location.hash.replace(/^#\/?/, ""), qi = full.indexOf("?"), raw = qi < 0 ? full : full.slice(0, qi);
  let dec = raw;
  try { dec = decodeURIComponent(raw); } catch { /* giữ nguyên chuỗi gốc */ }
  const [kind = "", ...rest] = dec.split("/");
  return { kind, id: rest.join("/"), query: qi < 0 ? "" : full.slice(qi + 1) };
}
/** Chuẩn hóa để so khớp: bỏ dấu, thường hóa, gộp mọi loại gạch nối/dấu cách (kể cả U+2010, U+2013, NBSP) về một dấu cách. */
const norm = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[‐-―−_.,;:()/\\-]+/g, " ").replace(/[  -​ ]/g, " ").replace(/\s+/g, " ").trim();
const idPlain = (s: string) => s.toLowerCase().replace(/[^0-9x]/g, "");
const slug = (s: string) => norm(s).replace(/ /g, "-").slice(0, 40) || "tac-gia";

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (!this.state.err) return this.props.children;
    return <div className="banner demo" role="alert"><p>Đã xảy ra lỗi hiển thị. / Something went wrong. <button className="ghost" onClick={() => { location.hash = "#/"; location.reload(); }}>Tải lại / Reload</button></p></div>;
  }
}

export function App() { return <AccountProvider><AppInner /></AccountProvider>; }

function AppInner() {
  const { user } = useAccount();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [sysDark, setSysDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { const m = matchMedia("(prefers-color-scheme: dark)"), f = () => setSysDark(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const dark = theme === "dark" || (theme === "auto" && sysDark); // chỉ hai trạng thái trên nút: sáng hoặc tối (mặc định theo hệ thống cho tới khi người dùng chọn)
  const [lang, setLang] = useState<Lang>(initialLang);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [route, setRoute] = useState(parseRoute);
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const num = (n: number, d = 0) => n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const t = (k: Key, v?: Record<string, string | number>) => { let s: string = DICT[lang][k]; for (const [a, b] of Object.entries(v ?? {})) s = s.replace(`{${a}}`, String(b)); return s; };

  const load = () => {
    setErr(false);
    fetch("./data/profind.json").then((r) => { if (!r.ok) throw new Error("http"); return r.json(); }).then((d: Data) => {
      if (!d || !Array.isArray(d.authors) || !Array.isArray(d.institutions)) throw new Error("shape");
      setData({ ...d, types: d.types ?? {}, disciplines: d.disciplines ?? [], meta: d.meta ?? ({} as Data["meta"]), authors: d.authors.map((a) => ({ ...a, institutions: a.institutions ?? [], disciplines: a.disciplines ?? [] })) });
    }).catch(() => setErr(true));
  };
  // Bộ dữ liệu tác giả (~5 MB) chỉ tải khi cần: trang tài khoản và quản trị không dùng nên mở nhanh hơn.
  const needData = !/^(tai-khoan|quan-tri|gioi-thieu)/.test(location.hash.replace(/^#\/?/, ""));
  useEffect(() => { if (needData && !data) load(); }, [needData, route.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { startSession(); }, []);
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(KEY, lang); } catch { /* bỏ qua */ } }, [lang]);
  useEffect(() => { const f = () => setRoute(parseRoute()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  const { kind, id } = route;
  const author = data && id ? data.authors.find((a) => a.id === id) ?? null : null;
  const view: "list" | "author" | "corr" | "nf" | "acc" | "adm" | "about" = kind === "gioi-thieu" ? "about" : kind === "tai-khoan" ? "acc" : kind === "quan-tri" ? "adm" : kind === "dinh-chinh" ? "corr" : kind === "tac-gia" ? (data && !author ? "nf" : "author") : "list";

  // Tiêu đề tab, mô tả và đưa tiêu điểm về nội dung chính khi đổi trang (trình đọc màn hình biết đã chuyển trang).
  useEffect(() => {
    document.title = view === "about" ? `${t("fAbout2")} | ProFind` : view === "acc" ? `${t("accTitle")} | ProFind` : view === "adm" ? "Quản trị | ProFind" : view === "author" && author ? `${author.name} | ProFind` : view === "corr" ? `${t("corrTitle")} | ProFind` : view === "nf" ? `${t("notFound").split(".")[0]} | ProFind` : t("docTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDesc"));
    if (first.current) { first.current = false; return; }
    scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true });
  }, [view, author?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const HTitle = (view === "list" ? "h1" : "p") as "h1" | "p";
  return (
    <Ctx.Provider value={{ lang, t, num }}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>{t("skip")}</a>
      <header className="top">
        <HeroArt />
        <div className="wrap hd">
          <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
          <div className="hd-tools">
            <button className="icon-btn" onClick={() => { const n: Theme = dark ? "light" : "dark"; setTheme(n); setThemeState(n); evt("theme"); }} aria-label={dark ? t("themeToLight") : t("themeToDark")} title={dark ? t("themeToLight") : t("themeToDark")}><Icon n={dark ? "moon" : "sun"} size={20} /></button>
          <div className="lang" role="group" aria-label={t("langLabel")}>
            {(["vi", "en"] as const).map((l) => <button key={l} lang={l} className={`lang-${l}`} aria-pressed={lang === l} aria-label={l === "vi" ? "Tiếng Việt" : "English"} onClick={() => { setLang(l); evt("lang"); }}>{l.toUpperCase()}</button>)}
          </div>
            {user?.isAdmin && <a className="admin-chip" href="#/quan-tri" aria-label="Quản trị"><Icon n="grid" size={18} /><span>Quản trị</span></a>}
            <a className={`acct-btn${user ? " in" : ""}`} href="#/tai-khoan" aria-label={user ? t("mySpace") : t("login")} title={user ? user.email : t("login")}><Icon n="user" size={18} /><span>{user ? (user.name || user.email).split(/[\s@]/)[0] : t("login")}</span></a>
          </div>
        </div>
        {view === "list" && data ? <div className="wrap" id="hero-slot" /> : <div className="wrap"><HTitle className="ht">{t("sub")}</HTitle>{view === "list" && <p className="tag">{t("tagline")}</p>}</div>}
      </header>
      <main className="wrap" id="main" tabIndex={-1} ref={mainRef}>
        {data?.meta.demo && <p className="banner demo" role="note"><Icon n="info" />{t("demo")}</p>}
        <Boundary key={`${view}/${author?.id ?? ""}`}>
          {view === "about" ? <Suspense fallback={<p className="empty" role="status">{t("loading")}</p>}><AboutPage section={new URLSearchParams(route.query).get("m") ?? ""} /></Suspense>
            : view === "acc" ? <Suspense fallback={<p className="empty" role="status">{t("loading")}</p>}><AccountPage tab={id} /></Suspense>
            : view === "adm" ? <Suspense fallback={<p className="empty" role="status">Đang tải…</p>}><AdminPage tab={id} /></Suspense>
            : err ? <div className="empty" role="alert"><p>{t("err")}</p><button className="ghost" onClick={load}>{t("retry")}</button></div>
            : !data ? <p className="empty" role="status">{t("loading")}</p>
            : view === "corr" ? <Correction key={author?.id ?? "none"} a={author} />
            : view === "nf" ? <div className="empty" role="alert"><p>{t("notFound")}</p><p><a href="#/">{t("back")}</a></p></div>
            : view === "author" && author ? <AuthorPage a={author} d={data} />
            : <List d={data} query={route.query} />}
        </Boundary>
      </main>
      <Footer data={data} />
      <VisitChip />
    </Ctx.Provider>
  );
}

const workLink = (w: Work, t: (k: any) => string) => {
  const doi = w.doi, href = doi ? `https://doi.org/${doi}` : `https://openalex.org/${w.id.split("-").pop()}`;
  return <><a href={href} target="_blank" rel="noopener">{w.title}<span className="sr"> {t("newTab")}</span></a><div className="meta">{doi ? <>DOI: {doi}</> : t("noDoi")}</div></>;
};

const range = (page: number, total: number, num: (n: number) => string) => total === 0 ? "0" : `${num(Math.min(page * PAGE + 1, total))}–${num(Math.min((page + 1) * PAGE, total))}`;

function Th({ k, label, cls, title, sort, dir, pick }: { k: SortKey; label: string; cls?: string; title?: string; sort: SortKey; dir: 1 | -1; pick: (k: SortKey) => void }) {
  const on = sort === k;
  return <th scope="col" className={cls} title={title} aria-sort={on ? (dir === 1 ? "ascending" : "descending") : "none"}><button type="button" className={`thb${on ? " on" : ""}`} onClick={() => pick(k)}>{label}<span aria-hidden="true" className="ar">{on ? (dir === 1 ? "▲" : "▼") : "↕"}</span></button></th>;
}

function Pager({ page, total, set }: { page: number; total: number; set: (p: number) => void }) {
  const { t, num } = useT();
  const pages = Math.ceil(total / PAGE); if (pages <= 1) return null;
  const nums = [...new Set([0, 1, page - 1, page, page + 1, pages - 2, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label={t("pages")}>
      <button className="ghost" disabled={page === 0} onClick={() => set(page - 1)}>‹ {t("prev")}</button>
      {nums.map((p, i) => <span key={p}>{i > 0 && p - nums[i - 1] > 1 && <span className="gap" aria-hidden="true">…</span>}<button className={p === page ? "ghost cur" : "ghost"} aria-current={p === page ? "page" : undefined} aria-label={`${t("page")} ${p + 1}`} onClick={() => set(p)}>{num(p + 1)}</button></span>)}
      <button className="ghost" disabled={page >= pages - 1} onClick={() => set(page + 1)}>{t("next")} ›</button>
    </nav>
  );
}

const instLabel = (i: Institution | undefined, lang: Lang, fallback = "") => (i ? (lang === "vi" ? i.name : i.en || i.name) : fallback);

function Top2Tag({ a, cls }: { a: Author; cls: string }) {
  const { lang, t, num } = useT();
  if (!a.top2) return null;
  const tip = t("top2Tip", { r: num(a.top2.rank), f: fieldName(a.top2.field, lang) });
  return <a className={cls} href={TOP2_DOI} target="_blank" rel="noopener" title={tip} aria-label={`${t("top2Tag")}. ${tip} ${t("newTab")}`}>★ {t("top2Tag")}</a>;
}

function List({ d, query }: { d: Data; query: string }) {
  const { lang, t, num } = useT();
  const { user, cfg, saveSearch } = useAccount();
  const qp = useMemo(() => new URLSearchParams(query), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState(qp.get("q") ?? ""), [disc, setDisc] = useState(qp.get("d") ?? ""), [type, setType] = useState(qp.get("ty") ?? ""), [sort, setSort] = useState<SortKey>("totalScore"), [dir, setDir] = useState<1 | -1>(-1);
  const pick2 = (k: SortKey) => { setSort(k); setDir(TEXT_KEYS.includes(k) ? 1 : -1); };
  const pick = (k: SortKey) => { if (k === sort) setDir((dir * -1) as 1 | -1); else { setSort(k); setDir(TEXT_KEYS.includes(k) || RANK_ASC.includes(k) ? 1 : -1); } };
  const [scope, setScope] = useState(qp.get("sc") === "all" ? "all" : "vn"), [instSel, setInstSel] = useState(qp.get("i") ?? ""), [page, setPage] = useState(0), [ssMsg, setSsMsg] = useState(""), [browse, setBrowse] = useState(qp.get("b") === "1"), [top2only, setTop2only] = useState(qp.get("t2") === "1"), [slot, setSlot] = useState<HTMLElement | null>(null), [showF, setShowF] = useState(() => matchMedia("(min-width: 900px)").matches);
  useEffect(() => { setSlot(document.getElementById("hero-slot")); }, []);
  const [jn, setJn] = useState<Record<string, { t: string; p: string }> | null>(null);
  const dq = useDeferredValue(q);
  const works = useWorks(dq);
  const [tab, setTab] = useState<"a" | "w">("a");
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  // Chỉ liệt kê đơn vị đang có tác giả (trong phạm vi đã chọn), kèm số tác giả; chọn từ danh sách, không gõ tự do.
  const instOpts = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of d.authors) { if (scope === "vn" && (a.foreign !== false || a.suspect)) continue; for (const i of a.institutions) c.set(i, (c.get(i) ?? 0) + 1); }
    return d.institutions.filter((i) => c.has(i.id)).sort((a, b) => a.name.localeCompare(b.name, "vi")).map((i) => [i.id, `${instLabel(i, lang)} (${num(c.get(i.id)!)})`] as string[]);
  }, [d, scope, lang, num]);
  // Chuỗi tìm theo tên tạp chí/ISSN nằm ở tệp riêng, chỉ tải khi người dùng bắt đầu gõ.
  useEffect(() => {
    if (jn || q.trim().length < 2) return;
    fetch("./data/jn.json").then((r) => (r.ok ? r.json() : Promise.reject())).then((m: Record<string, string>) => {
      const o: Record<string, { t: string; p: string }> = {}; for (const k in m) o[k] = { t: m[k], p: m[k].replace(/-/g, "") }; setJn(o);
    }).catch(() => setJn({}));
  }, [q, jn]);
  // Từ để tìm kiếm của mỗi tác giả: từ trong tên cộng từ trong tên đơn vị (tiếng Việt, tiếng Anh, tên viết tắt), đã bỏ dấu.
  const hay = useMemo(() => new Map(d.authors.map((a) => [a.id, { n: norm(a.name).split(" "), i: [...new Set(a.institutions.flatMap((i) => { const x = instById.get(i); return x ? norm(`${x.name} ${x.en ?? ""} ${x.abbr ?? ""}`).split(" ") : []; }))] }])), [d, instById]);
  // Bộ lọc nằm trong đường dẫn (#/?q=…&d=…) để chia sẻ, mở lại và dùng nút Quay lại của trình duyệt.
  useEffect(() => {
    const u = new URLSearchParams(Object.entries({ q: q.trim(), d: disc, ty: type, i: instSel, sc: scope === "all" ? "all" : "", t2: top2only ? "1" : "", b: browse ? "1" : "" }).filter(([, v]) => v));
    const h = `#/${u.toString() ? "?" + u : ""}`; if (h !== (location.hash || "#/")) history.replaceState(null, "", h);
  }, [q, disc, type, instSel, scope, top2only, browse]);
  useEffect(() => { const id = window.setTimeout(() => { if (q.trim().length >= 3) evt("search", undefined, q.trim()); }, 1200); return () => window.clearTimeout(id); }, [q]);
  const hasFilter = !!(q.trim() || disc || type || instSel || top2only), home = !hasFilter && !browse;
  const clearAll = () => { setQ(""); setDisc(""); setType(""); setInstSel(""); setTop2only(false); setBrowse(false); };
  const doSave = async () => {
    if (!user) { try { sessionStorage.setItem("profind.ret", location.hash || "#/"); sessionStorage.setItem("profind.reason", "ss"); } catch { /* bỏ qua */ } evt("save_gate"); location.hash = "#/tai-khoan"; return; }
    const label = [q.trim(), disc && dName(disc, lang), instSel && instLabel(instById.get(instSel), lang)].filter(Boolean).join(" · ");
    try { await saveSearch({ q: q.trim(), d: disc, ty: type, i: instSel, sc: scope === "all" ? "all" : "vn", label }); setSsMsg(t("searchSaved")); } catch (e: any) { setSsMsg(e?.message || t("saveFail")); }
    window.setTimeout(() => setSsMsg(""), 4000);
  };
  const rows = useMemo(() => {
    const toks = norm(dq).split(" ").filter(Boolean);
    const rawId = dq.replace(/[\s-]/g, "").toLowerCase(), isId = /^[0-9x]{6,}$/.test(rawId);
    return d.authors.filter((a) => {
      if (scope === "vn" && (a.foreign !== false || a.suspect)) return false;
      if (disc && !a.disciplines.includes(disc)) return false;
      if (instSel && !a.institutions.includes(instSel)) return false;
      if (type && !a.institutions.some((i) => instById.get(i)?.type === type)) return false;
      if (top2only && !a.top2) return false;
      if (!toks.length) return true;
      if (isId) return idPlain(a.orcid ?? "").includes(rawId) || (jn?.[a.id]?.p.includes(rawId) ?? false);
      // Tên và đơn vị: mỗi từ khóa phải trùng trọn một từ trong tên hoặc tên đơn vị (từ cuối gõ dở được khớp theo tiền tố), không khớp chuỗi con ("dat" không ra "Datta", "Sinh Cong Lam" không ra "trần văn đạt").
      // Tên: mọi từ khóa trùng trọn một từ trong tên (từ cuối gõ dở khớp theo tiền tố). Đơn vị: mọi từ khóa nằm trong tên đơn vị, hoặc tên + cụm từ đơn vị từ 2 từ trở lên
      // (ví dụ "le thanh ha kinh te"). Một từ lẻ không đủ để khớp đơn vị, tránh "tran van dat" ra người tên Tran ở "Viện … Trái đất".
      const h = hay.get(a.id) ?? { n: norm(a.name).split(" "), i: [] as string[] };
      const hit = (ws: string[], x: string, i: number) => ws.some((w) => (i === toks.length - 1 ? w.startsWith(x) : w === x));
      const rest = toks.map((x, i) => [x, i] as const).filter(([x, i]) => !hit(h.n, x, i));
      if (rest.length === 0 || (rest.every(([x, i]) => hit(h.i, x, i)) && (rest.length === toks.length || rest.length >= 2))) return true;
      // Tạp chí/ISSN: khớp cả cụm từ, không khớp từng từ rời (tránh "tran van dat" khớp "Transactions ... data").
      const j = jn?.[a.id]?.t; return !!j && j.includes(toks.join(" "));
    }).sort((a, b) => {
      let c = 0;
      if (sort === "name") c = a.name.localeCompare(b.name, "vi");
      else if (sort === "unit") { const u = (x: Author) => x.institutions.map((i) => instLabel(instById.get(i), lang, i)).join(", "); c = u(a).localeCompare(u(b), "vi"); }
      else if (sort === "rank") c = (a.rankScore ?? Infinity) === (b.rankScore ?? Infinity) ? 0 : (a.rankScore ?? Infinity) < (b.rankScore ?? Infinity) ? -1 : 1;
      else c = ((a[sort] ?? 0) as number) - ((b[sort] ?? 0) as number);
      return c * dir || b.totalScore - a.totalScore || b.worksCount - a.worksCount || a.name.localeCompare(b.name, "vi");
    });
  }, [d, dq, disc, type, instSel, sort, dir, scope, instById, jn, lang, hay, top2only]);
  useEffect(() => setPage(0), [dq, disc, type, instSel, sort, dir, scope, top2only]);
  // Số liệu cho trang chủ (phạm vi Việt Nam): ngành và đơn vị nổi bật.
  const home$ = useMemo(() => {
    const vn = d.authors.filter((a) => a.foreign === false && !a.suspect), dc = new Map<string, number>(), ic = new Map<string, number>();
    for (const a of vn) { for (const x of a.disciplines) dc.set(x, (dc.get(x) ?? 0) + 1); for (const x of a.institutions) ic.set(x, (ic.get(x) ?? 0) + 1); }
    return { n: vn.length, top2: vn.filter((a) => a.top2).length, fields: [...dc].sort((a, b) => b[1] - a[1]).slice(0, 10), insts: [...ic].sort((a, b) => b[1] - a[1]).slice(0, 10), nInst: ic.size };
  }, [d]);
  const [topWorks, setTopWorks] = useState<{ t: string; y: number; j: string; c: number; a: string; n: string; w: string }[]>([]);
  useEffect(() => { if (!home || topWorks.length) return; fetch("data/top-works.json").then((r) => r.json()).then((j) => setTopWorks(j.works ?? [])).catch(() => {}); }, [home]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!q.trim()) setTab("a"); else if (dq === q && works.forQ === q.trim() && rows.length === 0 && works.total > 0) setTab("w"); }, [q, dq, rows.length, works.total, works.forQ]);
  const quick = (fn: () => void) => () => { fn(); setBrowse(false); };
  const hero = (
    <div className={`hero-home${home ? " big" : ""}`}>
      {home && <p className="hero-kicker"><Icon n="spark" size={16} />{t("heroKicker")}</p>}
      <h1 className="ht">{t("sub")}</h1>
      {home && <p className="tag">{t("heroLead")}</p>}
      <label className="bigsearch"><Icon n="search" size={22} /><span className="sr">{t("search")}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} autoComplete="off" enterKeyHint="search" /></label>
      {home && <p className="trys"><span>{t("tryLabel")}</span>{[["Đồng Tháp", () => setQ("Đồng Tháp")], ["Quản lý Giáo dục", () => setDisc("giao-duc")], ["Bách khoa", () => setQ("Bách khoa")], ["ISSN 1859-1531", () => setQ("1859-1531")]].map(([l, fn]) => <button key={l as string} type="button" onClick={fn as () => void}>{l as string}</button>)}</p>}
    </div>
  );
  return (
    <>
      {slot && createPortal(hero, slot)}
      {home ? (
        <section className="home" aria-label={t("title")}>
          <div className="hstats">
            <div><Icon n="scholar" size={26} /><b>{num(home$.n)}</b><span>{t("stResearchers")}</span></div>
            <div><Icon n="scroll" size={26} /><b>{num(d.meta.works)}</b><span>{t("stWorks")}</span></div>
            <div><Icon n="building" size={26} /><b>{num(home$.nInst)}</b><span>{t("stInst")}</span></div>
          </div>
          <div className="hcols">
            <div className="hgroup"><h2><Icon n="discipline" size={18} />{t("topFields")}<small>{t("byAuthors")}</small></h2>
              <ol className="rank">{home$.fields.slice(0, 8).map(([f, n]) => <li key={f}><button type="button" onClick={quick(() => setDisc(f))} style={{ "--w": `${Math.round((n / home$.fields[0][1]) * 100)}%` } as React.CSSProperties}><span>{dName(f, lang)}</span><em>{num(n)}</em></button></li>)}</ol></div>
            <div className="hgroup"><h2><Icon n="building" size={18} />{t("topInst")}<small>{t("byAuthors")}</small></h2>
              <ol className="rank">{home$.insts.slice(0, 8).map(([i, n]) => <li key={i}><button type="button" onClick={quick(() => setInstSel(i))} style={{ "--w": `${Math.round((n / home$.insts[0][1]) * 100)}%` } as React.CSSProperties}><span>{instLabel(instById.get(i), lang, i)}</span><em>{num(n)}</em></button></li>)}</ol></div>
          </div>
          {topWorks.length > 0 && <div className="hgroup"><h2><Icon n="book" size={18} />{t("topWorks")}</h2>
            <ol className="tw">{topWorks.slice(0, 6).map((w) => <li key={w.a + w.w}><a href={`#/tac-gia/${w.a}`}><b>{num(w.c)}<small>{t("cites")}</small></b><span className="tt">{w.t}</span><span className="tm">{w.n} · {w.j ? `${w.j} · ` : ""}{w.y}</span></a></li>)}</ol></div>}
          <div className="hgroup"><h2><Icon n="star" size={18} />{t("featured")}</h2>
            <p className="hchips">{home$.top2 > 0 && <button type="button" className="gold" onClick={quick(() => setTop2only(true))}>★ {t("top2Tag")}<em>{num(home$.top2)}</em></button>}<button type="button" className="all" onClick={() => setBrowse(true)}>{t("browseAll")} →</button></p></div>
        </section>
      ) : (
      <>
      <div className="fbar">
        <button type="button" className="ghost sm" aria-expanded={showF} onClick={() => setShowF(!showF)}><Icon n="filter" size={16} />{t("filters")}{(disc ? 1 : 0) + (type ? 1 : 0) + (instSel ? 1 : 0) + (top2only ? 1 : 0) + (scope === "all" ? 1 : 0) > 0 && <em className="cnt">{(disc ? 1 : 0) + (type ? 1 : 0) + (instSel ? 1 : 0) + (top2only ? 1 : 0) + (scope === "all" ? 1 : 0)}</em>}</button>
        <button type="button" className="ghost sm" onClick={clearAll}>{t("backHome")}</button>
      </div>
      {showF && <section className="filters" aria-label={t("filters")}>
        <Sel icon="discipline" label={t("discipline")} v={disc} set={setDisc} all={t("all")} opts={d.disciplines.map((s) => [s, dName(s, lang)])} />
        <Sel icon="building" label={t("instType")} v={type} set={setType} all={t("all")} opts={Object.entries(d.types).filter(([k]) => d.institutions.some((i) => i.type === k)).map(([k, v]) => [k, v[lang]])} />
        <Sel icon="building" label={t("inst")} v={instSel} set={setInstSel} all={t("all")} opts={instOpts} />
        <Sel icon="shield" label={t("scope")} v={scope} set={(v) => { setScope(v); setInstSel(""); }} opts={[["vn", t("scopeVn")], ["all", t("scopeAll")]]} />
        <div className="sel sortg"><span><Icon n="sort" size={14} />{t("sort")}</span>
          <div className="sortrow">
            <select aria-label={t("sort")} value={sort} onChange={(e) => pick2(e.target.value as SortKey)}>{([["totalScore", "byScore"], ["worksCount", "byWorks"], ["citations", "byCit"], ["name", "byName"], ["unit", "byUnit"], ["lastYear", "byYear"]] as const).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
            <button type="button" className="dirbtn" onClick={() => setDir((dir * -1) as 1 | -1)} aria-label={dir === 1 ? t("dirAsc") : t("dirDesc")} title={dir === 1 ? t("dirAsc") : t("dirDesc")}><span aria-hidden="true">{dir === 1 ? "↑" : "↓"}</span></button>
          </div>
        </div>
        <label className="chk top2f"><input type="checkbox" checked={top2only} onChange={(e) => setTop2only(e.target.checked)} />★ {t("top2Only")}</label>
      </section>}
      {q.trim() && <div className="rtabs" role="tablist" aria-label={t("title")}>
        <button type="button" role="tab" aria-selected={tab === "a"} onClick={() => setTab("a")}><Icon n="scholar" size={16} />{t("tabAuthors")}<em>{num(rows.length)}</em></button>
        <button type="button" role="tab" aria-selected={tab === "w"} onClick={() => setTab("w")}><Icon n="scroll" size={16} />{t("tabWorks")}<em>{works.busy ? "…" : num(works.total)}</em></button>
      </div>}
      {q.trim() && tab === "w" ? (
        <section className="wlist" aria-live="polite">
          {works.err ? <p className="empty">{t("wErr")}</p> : works.items.length === 0 ? <p className="empty">{works.busy ? t("loading") : t("wNone")}</p> : <>
            <p className="meta">{t("wHint")}</p>
            <ol>{works.items.map((w, i) => <li key={`${w.authorId}${i}${w.title}`}>
              <b className="wc">{num(w.cit)}<small>{t("cites")}</small></b>
              <div><a className="wt" href={w.doi ? `https://doi.org/${w.doi}` : `#/tac-gia/${encodeURIComponent(w.authorId)}`} {...(w.doi ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{w.title}</a>
                <p className="meta"><a href={`#/tac-gia/${encodeURIComponent(w.authorId)}`}>{w.author}</a>{w.journal ? ` · ${w.journal}` : ""} · {w.year}</p></div>
              <StarBtn k={`w|${w.id}`} meta={{ t: w.title, s: [w.author, w.journal, w.year].filter(Boolean).join(" · "), u: w.doi ? `https://doi.org/${w.doi}` : `https://openalex.org/${String(w.id).split("-").pop()}` }} />
            </li>)}</ol>
            {works.items.length < works.total && <button type="button" className="ghost" onClick={() => void works.more()}>{t("moreWorks", { n: num(works.total - works.items.length) })}</button>}
          </>}
        </section>
      ) : (
      <>
      <div className="statusrow">
        <p className="meta" role="status" aria-live="polite">{t("shown", { n: range(page, rows.length, num), t: num(rows.length) })}</p>
        {cfg?.enabled !== false && hasFilter && <button type="button" className="ghost sm" onClick={() => void doSave()}><Icon n="star" size={16} />{user ? t("saveSearchBtn") : t("saveGate")}</button>}<span className="meta" role="status">{ssMsg}</span>
      </div>
      {rows.length === 0 ? <p className="empty">{t("none")} <a href="#/dinh-chinh">{t("suggestAdd")}</a><br /><span className="meta">{t("ecoEmpty")} <EcoLink app="edufind" place="empty">{t("ecoEmptyB")}<span className="sr"> {t("newTab")}</span></EcoLink></span></p> : (
        <div className="table-wrap"><table className="cards tlist">
          <caption className="sr">{t("title")}: {t("shown", { n: range(page, rows.length, num), t: num(rows.length) })}</caption>
          <thead><tr>
            <th scope="col" className="num" title={t("sttTip")}>{t("stt")}</th>
            <Th k="name" label={t("author")} sort={sort} dir={dir} pick={pick} />
            <Th k="unit" label={t("unit")} sort={sort} dir={dir} pick={pick} />
            <Th k="worksCount" cls="num" label={t("works")} sort={sort} dir={dir} pick={pick} />
            <Th k="totalScore" cls="num" label={t("score")} sort={sort} dir={dir} pick={pick} />
            <Th k="citations" cls="num" title={t("citTip")} label={t("cit")} sort={sort} dir={dir} pick={pick} />
            <Th k="lastYear" label={t("years")} sort={sort} dir={dir} pick={pick} />
          </tr></thead>
          <tbody>{rows.slice(page * PAGE, (page + 1) * PAGE).map((a, idx) => { const pos = page * PAGE + idx + 1, medal = RANKED.includes(sort) && dir === -1; return (
            <tr key={a.id}>
              <td className="num rankc" data-l={t("stt")}><span className={`rk r${medal ? Math.min(pos, 4) : 4}`}>{num(pos)}</span></td>
              <td className="who"><StarBtn className="inrow" k={`a|${a.id}`} meta={{ t: a.name, s: a.institutions.slice(0, 2).map((i) => instLabel(instById.get(i), lang, i)).join(", "), sc: a.totalScore, rk: a.rankScore ?? undefined }} /><a href={`#/tac-gia/${encodeURIComponent(a.id)}`}>{a.name}</a>{a.claimed && <><Icon n="check" size={14} className="ok" /><span className="sr"> {t("claimedSr")}</span></>}{a.foreign && <span className="tagf">{t("foreignTag")}</span>}{a.suspect && <span className="tagf">{t("suspectTag")}</span>}<Top2Tag a={a} cls="top2" /><div className="meta">{a.disciplines.map((s) => dName(s, lang)).join(" · ")}</div></td>
              <td data-l={t("unit")}>{a.institutions.map((i) => instLabel(instById.get(i), lang, i)).join(", ")}</td>
              <td className="num" data-l={t("works")}>{num(a.worksCount)}</td><td className="num" data-l={t("score")}><span className="score">{num(a.totalScore, 2)}</span></td><td className="num" data-l={t("cit")}>{num(a.citations)}</td>
              <td className="meta yrs" data-l={t("years")}>{a.firstYear ?? "-"}–{a.lastYear ?? "-"}</td>
            </tr>); })}</tbody>
        </table></div>)}
      <Pager page={page} total={rows.length} set={(p) => { setPage(p); window.scrollTo({ top: 0 }); }} />
      </>
      )}
      </>
      )}
    </>
  );
}

type WSort = "year" | "cit" | "score";
const initials = (n: string) => { const w = n.replace(/[^\p{L}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
const hueOf = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

function AuthorPage({ a, d }: { a: Author; d: Data }) {
  const { lang, t, num } = useT();
  const { user, cfg, favs, toggleFav, recordView } = useAccount();
  const [works, setWorks] = useState<Work[] | null>(null);
  const [werr, setWerr] = useState(false), [tick, setTick] = useState(0), [wpage, setWpage] = useState(0);
  const [wsort, setWsort] = useState<WSort>("year"), [onlyLead, setOnlyLead] = useState(false), [allInst, setAllInst] = useState(false);
  // Hủy yêu cầu cũ khi đổi hồ sơ: không để công trình của hồ sơ trước hiện (và xuất CSV) ở hồ sơ sau.
  useEffect(() => {
    setWorks(null); setWerr(false); setWpage(0); setWsort("year"); setOnlyLead(false); setAllInst(false);
    if (a.worksCount === 0) { setWorks([]); return; }
    const ac = new AbortController();
    fetch(`./data/works/${encodeURIComponent(a.id)}.json`, { signal: ac.signal }).then((r) => { if (!r.ok) throw new Error("http"); return r.json(); }).then((w) => {
      if (!Array.isArray(w)) throw new Error("shape");
      setWorks([...(w as Work[])].sort((x, y) => y.year - x.year));
    }).catch(() => { if (ac.signal.aborted) return; setWerr(true); setWorks([]); });
    return () => ac.abort();
  }, [a.id, a.worksCount, tick]);
  useEffect(() => setWpage(0), [wsort, onlyLead]);
  useEffect(() => { recordView({ k: `a|${a.id}`, t: a.name, s: a.institutions.map((i) => instByIdRef.get(i)?.name).filter(Boolean).slice(0, 2).join(", ") }); evt("author_view", a.id, a.name); }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  const instByIdRef = instById;
  const inst = a.institutions.map((i) => instById.get(i)).filter((x): x is Institution => !!x);
  const csv = () => {
    evt("csv");
    // Chống chèn công thức (CSV injection): ô văn bản bắt đầu bằng = + - @ hoặc tab/xuống dòng được thêm dấu nháy đơn.
    const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const body = [["year", "title", "doi", "journal", "issn", "score", "citations", "role"], ...(works ?? []).map((w) => [w.year, w.title, w.doi ?? "", w.journal, w.issn, w.score ?? "", w.citations, w.role])].map((r) => r.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${slug(a.name)}-${a.id}.csv` }).click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const saveAuthor = async () => {
    if (!user) { try { sessionStorage.setItem("profind.ret", location.hash); sessionStorage.setItem("profind.reason", "fav"); } catch { /* bỏ qua */ } evt("save_gate"); location.hash = "#/tai-khoan"; return; }
    try { await toggleFav(`a|${a.id}`, { t: a.name, s: inst.slice(0, 2).map((i) => instLabel(i, lang)).join(", "), sc: a.totalScore, rk: a.rankScore ?? undefined }); } catch (e: any) { alert(e?.message || t("saveFail")); }
  };
  const openWork = (w: Work) => { recordView({ k: `w|${w.id}`, t: w.title, s: [w.journal, w.year].filter(Boolean).join(" · "), u: w.doi ? `https://doi.org/${w.doi}` : `https://openalex.org/${w.id.split("-").pop()}` }); evt("work_open", w.id, w.title); };
  const pool = d.meta.rankPool ?? 0;
  const rk = (v: number | null) => (v ? <>#{num(v)}</> : <span title={t("rankNoneTip")}>–</span>);
  const roleCell = (w: Work) => (w.role === "lead" ? t("lead") : t("co"));
  // Thống kê cho hai biểu đồ, tính từ danh sách công trình đã tải.
  const stat = useMemo(() => {
    const ws = works ?? [], byYear = new Map<number, { lead: number; co: number }>();
    const cat = { q1: 0, q2: 0, q3: 0, q4: 0, dom: 0, unm: 0, not: 0 };
    for (const w of ws) {
      const y = byYear.get(w.year) ?? { lead: 0, co: 0 }; y[w.role === "lead" ? "lead" : "co"]++; byYear.set(w.year, y);
      if (w.role !== "lead") cat.not++;
      else if (w.score === null) cat.unm++;
      else if (w.scoreKind === "domestic") cat.dom++;
      else { const q = (w.quartile ?? "").toUpperCase(); if (q === "Q1") cat.q1++; else if (q === "Q2") cat.q2++; else if (q === "Q3") cat.q3++; else cat.q4++; }
    }
    const ys = [...byYear.keys()]; const y0 = ys.length ? Math.max(Math.min(...ys), new Date().getFullYear() - 10) : 0, y1 = ys.length ? Math.max(...ys) : -1;
    const bars: { y: number; lead: number; co: number }[] = []; for (let y = y0; y <= y1; y++) bars.push({ y, ...(byYear.get(y) ?? { lead: 0, co: 0 }) });
    return { bars, max: Math.max(1, ...bars.map((b) => b.lead + b.co)), cat };
  }, [works]);
  const shown = useMemo(() => {
    const l = (works ?? []).filter((w) => !onlyLead || w.role === "lead");
    return wsort === "year" ? l : [...l].sort((x, y) => (wsort === "cit" ? y.citations - x.citations : (y.score ?? -1) - (x.score ?? -1)) || y.year - x.year);
  }, [works, wsort, onlyLead]);
  const pct = a.worksCount ? Math.round((a.countedWorks / a.worksCount) * 100) : 0, hue = hueOf(a.id);
  const cats: [string, number, string][] = [["Scopus Q1", stat.cat.q1, "c1"], ["Scopus Q2", stat.cat.q2, "c2"], ["Scopus Q3", stat.cat.q3, "c3"], ["Scopus Q4", stat.cat.q4, "c4"], [t("kDomShort"), stat.cat.dom, "cd"], [t("unmatched"), stat.cat.unm, "cu"], [t("notLeadShort"), stat.cat.not, "cn"]];
  const cmax = Math.max(1, ...cats.map((c) => c[1]));
  return (
    <article className="ap">
      <p><a className="backl" href="#/">{t("back")}</a></p>
      <header className="hero">
        <div className="av" style={{ background: `linear-gradient(135deg,hsl(${hue} 75% 52%),hsl(${(hue + 55) % 360} 80% 42%))` }} aria-hidden="true">{initials(a.name)}</div>
        <div className="hero-main">
          <h1 className="au">{a.name}</h1>
          <p className="badges">{a.foreign && <span className="badge warnb">{t("foreignTag")}</span>}{a.suspect && <span className="badge warnb">{t("suspectTag")}</span>}<Top2Tag a={a} cls="badge top2b" />{a.claimed && <span className="badge"><Icon n="check" size={16} />{t("claimedBadge")}</span>}</p>
          <ul className="chips">{(allInst ? inst : inst.slice(0, 4)).map((i) => <li key={i.id}><Icon n="building" size={14} />{instLabel(i, lang)}</li>)}{inst.length > 4 && <li className="more"><button type="button" onClick={() => setAllInst(!allInst)} aria-expanded={allInst}>{allInst ? t("instLess") : t("instMore", { n: num(inst.length - 4) })}</button></li>}{a.scholar && <li className="scholar"><a href={`https://scholar.google.com/citations?user=${a.scholar}&hl=${lang === "vi" ? "vi" : "en"}`} target="_blank" rel="noopener">Google Scholar<span className="sr"> {t("newTab")}</span></a></li>}{a.orcid && <li className="orcid"><a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener">ORCID {a.orcid}<span className="sr"> {t("newTab")}</span></a></li>}</ul>
          {a.disciplines.length > 0 && <p className="hdisc">{a.disciplines.map((s) => dName(s, lang)).join(" · ")}</p>}
          <p className="actions-row">{cfg?.enabled !== false && <button className={`ghost light${favs.has(`a|${a.id}`) ? " on" : ""}`} aria-pressed={favs.has(`a|${a.id}`)} onClick={() => void saveAuthor()}><Icon n="star" size={16} />{!user ? t("saveGate") : favs.has(`a|${a.id}`) ? t("savedA") : t("saveA")}</button>}<button className="ghost light" onClick={csv} disabled={!works?.length}><Icon n="download" size={16} />{t("csv")}</button><a className="ghost-link light" href={`#/dinh-chinh/${encodeURIComponent(a.id)}`}><Icon n="user" size={16} />{t("corrLink")}</a></p>
        </div>
      </header>
      <div className="kpis">
        <div className="kpi k-rank"><span className="kic"><Icon n="trophy" size={20} /></span><b>{rk(a.rankScore)}</b><span>{t("rank")} · {t("score")}</span><small>{a.rankScore ? t("rankOf", { n: num(pool) }) : t("rankNone")}</small></div>
        <div className="kpi k-score"><span className="kic"><Icon n="check" size={20} /></span><b>{num(a.totalScore, 2)}</b><span>{t("cite")}</span></div>
        <div className="kpi"><span className="kic"><Icon n="book" size={20} /></span><b>{num(a.countedWorks)}<em>/{num(a.worksCount)}</em></b><span>{t("counted")}</span><i className="bar" role="presentation"><u style={{ width: `${pct}%` }} /></i></div>
        <div className="kpi"><span className="kic"><Icon n="chart" size={20} /></span><b>{num(a.citations)}</b><span title={t("citTip")}>{t("cit")}</span><small title={t("citTip")}>{a.scholarCit ? `Google Scholar ${num(a.scholarCit)} (${t("selfDecl")}) · ` : ""}{t("citNote")}{a.hIndex ? ` · ${t("hIdx")} ${a.hIndex}` : ""} · {t("rank")} {rk(a.rankCit)}</small></div>
        <div className="kpi"><span className="kic"><Icon n="link" size={20} /></span><b>{Math.round(a.matchedRate * 100)}%</b><span>{t("matched")}</span><i className="bar" role="presentation"><u style={{ width: `${Math.round(a.matchedRate * 100)}%` }} /></i></div>
      </div>
      {a.suspect && <p className="banner demo" role="note"><Icon n="info" />{t("suspectNote")}</p>}
      {works && works.length > 0 && (
        <div className="insights">
          <section className="card" aria-label={t("chartYear")}>
            <h2>{t("chartYear")}</h2>
            <div className="ybars" role="img" aria-label={stat.bars.map((b) => `${b.y}: ${b.lead + b.co}`).join(", ")}>
              {stat.bars.map((b) => <div key={b.y} className="yb" title={`${b.y}: ${b.lead + b.co} (${t("lead")}: ${b.lead})`}><span className="yn">{b.lead + b.co || ""}</span><div className="yc" style={{ height: `${((b.lead + b.co) / stat.max) * 100}%` }}><i className="yco" style={{ flex: b.co }} /><i className="yle" style={{ flex: b.lead }} /></div><span className="yl">{String(b.y).slice(2)}</span></div>)}
            </div>
            <p className="legend"><span><i className="sw yle" />{t("lead")}</span><span><i className="sw yco" />{t("co")}</span></p>
          </section>
          <section className="card" aria-label={t("chartScore")}>
            <h2>{t("chartScore")}</h2>
            <ul className="hbars">{cats.filter((c) => c[1] > 0).map(([l, n, k]) => <li key={l}><span>{l}</span><i className="hb"><u className={k} style={{ width: `${(n / cmax) * 100}%` }} /></i><b>{num(n)}</b></li>)}</ul>
          </section>
        </div>)}
      <section className="wlist" aria-label={t("paper")}>
        <div className="wbar">
          <h2>{t("paper")} <small>{num(shown.length)}</small></h2>
          <div className="wtools">
            <label className="sel inl"><span>{t("sortWorks")}</span><select value={wsort} onChange={(e) => setWsort(e.target.value as WSort)}><option value="year">{t("sNewest")}</option><option value="cit">{t("sCited")}</option><option value="score">{t("sScore")}</option></select></label>
            <label className="chk"><input type="checkbox" checked={onlyLead} onChange={(e) => setOnlyLead(e.target.checked)} />{t("onlyLead")}</label>
          </div>
        </div>
        {works === null ? <p className="empty" role="status">{t("loading")}</p>
          : werr ? <div className="empty" role="alert"><p>{t("workErr")}</p><button className="ghost" onClick={() => setTick(tick + 1)}>{t("retry")}</button></div>
          : works.length === 0 ? <p className="empty">{t("noWorks")}</p>
          : shown.length === 0 ? <p className="empty">{t("none")}</p> : (
          <ol className="wk-list">{shown.slice(wpage * PAGE, (wpage + 1) * PAGE).map((w) => (
            <li key={w.id} className="wk">
              <span className="wy">{w.year}</span>
              <div className="wm">
                <a className="wt2" onClick={() => openWork(w)} href={w.doi ? `https://doi.org/${w.doi}` : `https://openalex.org/${w.id.split("-").pop()}`} target="_blank" rel="noopener">{w.title}<span className="sr"> {t("newTab")}</span></a>
                <div className="wsrc">{w.journal && <span>{w.journal}</span>}{w.issn ? <span className="issn">ISSN {w.issn}</span> : <span className="issn noissn">{t("noIssn")}</span>}</div>
                <div className="wlinks">{w.doi ? <a className="chip" onClick={() => openWork(w)} href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">DOI ↗<span className="sr"> {t("newTab")}</span></a> : <span className="chip mute">{t("noDoi")}</span>}{w.scoreDiscipline && <a className="chip" target="_blank" rel="noopener" href={`${EDUFIND}/${w.scoreDiscipline}/?${w.scoreKind === "scopus" ? "tab=international&" : ""}q=${encodeURIComponent(w.issn)}`}>{t("lookup")} ↗<span className="sr"> {t("newTab")}</span></a>}</div>
              </div>
              <div className="wr">
                <StarBtn k={`w|${w.id}`} meta={{ t: w.title, s: [a.name, w.journal, w.year].filter(Boolean).join(" · "), u: w.doi ? `https://doi.org/${w.doi}` : `https://openalex.org/${w.id.split("-").pop()}` }} />
                {w.score === null ? <span className="pill none" title={w.role === "lead" ? t("unmatched") : w.ru ? t("roleUnknown") : t("notLead")}>{w.role === "lead" ? t("unmatched") : w.ru ? t("roleUnknownShort") : t("notLeadShort")}</span>
                  : <span className={`pill sc ${w.scoreKind === "scopus" ? (w.quartile ?? "").toLowerCase() : "dom"}`} title={w.scoreKind === "scopus" ? `Scopus ${w.quartile ?? ""}` : t("kDom")}>{num(w.score, 2)}<small>{w.scoreKind === "scopus" ? `Scopus ${w.quartile ?? ""}` : t("kDomShort")}</small></span>}
                <span className="wc"><Icon n="chart" size={14} />{num(w.citations)}<span className="sr"> {t("cit")}</span></span>
                <span className={`role ${w.role}`}>{roleCell(w)}</span>
              </div>
            </li>))}</ol>)}
        {works && <Pager page={wpage} total={shown.length} set={(p) => setWpage(p)} />}
      </section>
      <section className="next compact" aria-labelledby="ecoa"><h2 id="ecoa">{t("ecoHeadAuthor")}</h2>
        <div className="next-grid">
          {([["edufind", "ecoAuthorEdu", "book"], ["ami", "ecoAuthorAmi", "link"], ["may", "ecoAuthorMay", "spark"]] as const).map(([app, k, ic]) => <EcoLink key={app} app={app} place="author" className="ncard link"><span className="kic"><Icon n={ic} size={20} /></span><span>{t(k)}</span><Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink>)}
        </div>
      </section>
    </article>
  );
}

function Correction({ a }: { a: Author | null }) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [code, setCode] = useState("send");
  const [kind, setKind] = useState(a ? "claim" : "add");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState("sending");
    const f = new FormData(e.currentTarget);
    f.set("author", a?.id ?? ""); f.set("authorName", a?.name ?? String(f.get("ref") ?? ""));
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch("/api/correction", { method: "POST", body: f, signal: ac.signal });
      const j = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      // Chỉ coi là thành công khi máy chủ trả {ok:true}; mọi phản hồi 2xx khác (HTML, {ok:false}) là lỗi.
      if (r.ok && j && j.ok === true) setState("ok"); else { setCode(j?.error ?? (r.status === 429 ? "rate" : "send")); setState("err"); }
    } catch { setCode("net"); setState("err"); } finally { clearTimeout(to); }
  };
  const msg = { rate: t("eRate"), "not-configured": t("eConf"), net: t("eNet"), kind: t("eBad"), email: t("eBad"), empty: t("eBad"), scholar: t("eBad") }[code as "rate"] ?? t("sendErr");
  return (
    <article className="corr">
      <p><a href={a ? `#/tac-gia/${encodeURIComponent(a.id)}` : "#/"}>{t("back")}</a></p>
      <h1>{t("corrTitle")}{a && <>: {a.name}</>}</h1>
      <p className="meta">{t("corrLead")}</p>
      <p className="meta">{t("corrPrivacy")}</p>
      <div role="status" aria-live="polite">{state === "ok" && <p className="banner"><Icon n="check" />{t("sent")}</p>}</div>
      {state !== "ok" && (
        <form onSubmit={submit} className="form">
          <fieldset><legend className="sr">{t("corrTitle")}</legend>
            {([...(a ? [] : [["add", "kAdd"]]), ["claim", "kClaim"], ["correct", "kCorrect"], ["remove", "kRemove"]] as [string, string][]).map(([k, l]) => <label key={k} className="radio"><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />{t(l as "kClaim")}</label>)}
          </fieldset>
          {!a && <label className="sel"><span>{t("fRef")}</span><input name="ref" required maxLength={160} /></label>}
          <label className="sel"><span>{t("fName")}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
          <label className="sel"><span>{t("fEmail")}</span><input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
          <label className="sel"><span>{t("fScholar")}</span><input name="scholar" type="url" maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
          <label className="sel"><span>{t("fOrcid")}</span><input name="orcid" maxLength={40} defaultValue={a?.orcid ?? ""} placeholder="0000-0000-0000-0000" pattern="\d{4}-?\d{4}-?\d{4}-?\d{3}[\dXx]|" title="0000-0000-0000-0000" /></label>
          <label className="sel"><span>{t("fMsg")}</span><textarea name="msg" rows={5} maxLength={4000} required={kind === "correct"} /></label>
          <input name="_honey" className="honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p><button className="primary" disabled={state === "sending"}>{state === "sending" ? t("sending") : t("send")}</button></p>
          <div role="alert">{state === "err" && <p className="banner demo">{msg} <a href={`mailto:${CONTACT}?subject=${encodeURIComponent("[ProFind] " + (a?.name ?? ""))}`}>{CONTACT}</a></p>}</div>
        </form>)}
    </article>
  );
}

function Sel({ icon, label, v, set, opts, all }: { icon: IconName; label: string; v: string; set: (s: string) => void; opts: string[][]; all?: string }) {
  return <label className="sel"><span><Icon n={icon} size={14} />{label}</span><select value={v} onChange={(e) => set(e.target.value)}>{all !== undefined && <option value="">{all}</option>}{opts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>;
}
