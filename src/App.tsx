import { Component, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Ctx, DICT, KEY, initialLang, useT, type Key, type Lang } from "./i18n";
import { dName, fieldName } from "./disciplines";
import { Icon, type IconName } from "./icons";
import type { Author, Data, Institution, Work } from "./types";

type SortKey = "totalScore" | "worksCount" | "citations";
const RANK_KEY = { totalScore: "rankScore", worksCount: "rankWorks", citations: "rankCit" } as const;
const EDUFIND = "https://edufind.isavn.edu.vn";
const CONTACT = "luongviethoang.hcm@gmail.com";
const PAGE = 100, CAP = 1000; // tối đa 1.000 hàng cùng lúc để giữ trang nhanh; hãy lọc thêm nếu cần xem tiếp
const TOP2_DOI = "https://doi.org/10.17632/btchxktzyw.8";
const TOP2_LIC = "https://creativecommons.org/licenses/by-nc/3.0/";

/** Giải mã đường dẫn băm an toàn: chuỗi % sai (vd. %E0%A4%A) không được làm sập trang. */
function parseRoute(): { kind: string; id: string } {
  const raw = location.hash.replace(/^#\/?/, "");
  let dec = raw;
  try { dec = decodeURIComponent(raw); } catch { /* giữ nguyên chuỗi gốc */ }
  const [kind = "", ...rest] = dec.split("/");
  return { kind, id: rest.join("/") };
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

export function App() {
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
  useEffect(load, []);
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(KEY, lang); } catch { /* bỏ qua */ } }, [lang]);
  useEffect(() => { const f = () => setRoute(parseRoute()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  const { kind, id } = route;
  const author = data && id ? data.authors.find((a) => a.id === id) ?? null : null;
  const view: "list" | "author" | "corr" | "nf" = kind === "dinh-chinh" ? "corr" : kind === "tac-gia" ? (data && !author ? "nf" : "author") : "list";

  // Tiêu đề tab, mô tả và đưa tiêu điểm về nội dung chính khi đổi trang (trình đọc màn hình biết đã chuyển trang).
  useEffect(() => {
    document.title = view === "author" && author ? `${author.name} | ProFind` : view === "corr" ? `${t("corrTitle")} | ProFind` : view === "nf" ? `${t("notFound").split(".")[0]} | ProFind` : t("docTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDesc"));
    if (first.current) { first.current = false; return; }
    scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true });
  }, [view, author?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const HTitle = (view === "list" ? "h1" : "p") as "h1" | "p";
  return (
    <Ctx.Provider value={{ lang, t, num }}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>{t("skip")}</a>
      <header className="top">
        <div className="wrap hd">
          <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
          <div className="lang" role="group" aria-label={t("langLabel")}>
            {(["vi", "en"] as const).map((l) => <button key={l} lang={l} className={`lang-${l}`} aria-pressed={lang === l} aria-label={l === "vi" ? "Tiếng Việt" : "English"} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
          </div>
        </div>
        <div className="wrap"><HTitle className="ht">{t("sub")}</HTitle><p className="tag">{t("tagline")}</p></div>
      </header>
      <main className="wrap" id="main" tabIndex={-1} ref={mainRef}>
        {data?.meta.demo && <p className="banner demo" role="note"><Icon n="info" />{t("demo")}</p>}
        <details className="banner note"><summary><Icon n="shield" /><span>{t("notRankShort")} <span className="more">{t("details")}</span></span></summary><p>{t("notRank")}</p></details>
        <Boundary key={`${view}/${author?.id ?? ""}`}>
          {err ? <div className="empty" role="alert"><p>{t("err")}</p><button className="ghost" onClick={load}>{t("retry")}</button></div>
            : !data ? <p className="empty" role="status">{t("loading")}</p>
            : view === "corr" ? <Correction key={author?.id ?? "none"} a={author} />
            : view === "nf" ? <div className="empty" role="alert"><p>{t("notFound")}</p><p><a href="#/">{t("back")}</a></p></div>
            : view === "author" && author ? <AuthorPage a={author} d={data} />
            : <List d={data} />}
        </Boundary>
      </main>
      <footer className="foot wrap">
        <section className="eco" aria-label={t("eco")}>
          <h2>{t("eco")}</h2>
          <ol>
            <li className="self"><a href="#/" aria-current="page"><small>1 · {t("here")}</small><b>{t("e1")}</b></a></li>
            <li><a href={`${EDUFIND}/`} target="_blank" rel="noopener"><small>2</small><b>{t("e2")}</b><span className="sr"> {t("newTab")}</span></a></li>
            <li><a href="https://isavn.edu.vn/go/ami?from=profind" target="_blank" rel="noopener"><small>3</small><b>{t("e3")}</b><span className="sr"> {t("newTab")}</span></a></li>
          </ol>
        </section>
        {data && !data.meta.demo && data.meta.fetched && <p className="meta">{t("source")}: {t("srcLine", { d: data.meta.fetched })}</p>}
        {data?.authors.some((a) => a.top2) && <p className="meta">{t("top2Credit")} <a href={TOP2_DOI} target="_blank" rel="noopener">DOI 10.17632/btchxktzyw.8</a> · <a href={TOP2_LIC} target="_blank" rel="noopener">{t("top2Lic")}</a> · <a href="./LICENSE-NC.md" target="_blank" rel="noopener">LICENSE-NC</a></p>}
        <p className="meta"><Icon n="shield" size={14} /> <span>{t("lic")} <a href="#/dinh-chinh">{t("fix")}</a></span></p>
      </footer>
    </Ctx.Provider>
  );
}

const instLabel = (i: Institution | undefined, lang: Lang, fallback = "") => (i ? (lang === "vi" ? i.name : i.en || i.name) : fallback);

function Top2Tag({ a, cls }: { a: Author; cls: string }) {
  const { lang, t, num } = useT();
  if (!a.top2) return null;
  const tip = t("top2Tip", { r: num(a.top2.rank), f: fieldName(a.top2.field, lang) });
  return <a className={cls} href={TOP2_DOI} target="_blank" rel="noopener" title={tip} aria-label={`${t("top2Tag")}. ${tip} ${t("newTab")}`}>★ {t("top2Tag")}</a>;
}

function List({ d }: { d: Data }) {
  const { lang, t, num } = useT();
  const [q, setQ] = useState(""), [disc, setDisc] = useState(""), [type, setType] = useState(""), [sort, setSort] = useState<SortKey>("totalScore");
  const [scope, setScope] = useState("vn"), [instText, setInstText] = useState(""), [limit, setLimit] = useState(PAGE);
  const [jn, setJn] = useState<Record<string, { t: string; p: string }> | null>(null);
  const dq = useDeferredValue(q), dinst = useDeferredValue(instText);
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  const sortedInst = useMemo(() => [...d.institutions].sort((a, b) => a.name.localeCompare(b.name, "vi")), [d]);
  // Chuỗi tìm theo tên tạp chí/ISSN nằm ở tệp riêng, chỉ tải khi người dùng bắt đầu gõ.
  useEffect(() => {
    if (jn || q.trim().length < 2) return;
    fetch("./data/jn.json").then((r) => (r.ok ? r.json() : Promise.reject())).then((m: Record<string, string>) => {
      const o: Record<string, { t: string; p: string }> = {}; for (const k in m) o[k] = { t: m[k], p: m[k].replace(/-/g, "") }; setJn(o);
    }).catch(() => setJn({}));
  }, [q, jn]);
  const instIds = useMemo(() => {
    const n = norm(dinst); if (!n) return null;
    const s = new Set<string>(); for (const i of d.institutions) if (norm(i.name).includes(n) || norm(i.en || "").includes(n) || norm(i.abbr || "") === n) s.add(i.id);
    return s;
  }, [d, dinst]);
  const rankKey = RANK_KEY[sort];
  const rows = useMemo(() => {
    const toks = norm(dq).split(" ").filter(Boolean);
    const rawId = dq.replace(/[\s-]/g, "").toLowerCase(), isId = /^[0-9x]{6,}$/.test(rawId);
    return d.authors.filter((a) => {
      if (scope === "vn" && (a.foreign !== false || a.suspect)) return false;
      if (disc && !a.disciplines.includes(disc)) return false;
      if (instIds && !a.institutions.some((i) => instIds.has(i))) return false;
      if (type && !a.institutions.some((i) => instById.get(i)?.type === type)) return false;
      if (!toks.length) return true;
      if (isId) return idPlain(a.orcid ?? "").includes(rawId) || (jn?.[a.id]?.p.includes(rawId) ?? false);
      const nm = norm(a.name);
      if (toks.every((x) => nm.includes(x))) return true;
      const j = jn?.[a.id]?.t; return !!j && toks.every((x) => j.includes(x));
    }).sort((a, b) => b[sort] - a[sort] || b.worksCount - a.worksCount || a.name.localeCompare(b.name));
  }, [d, dq, disc, type, instIds, sort, scope, instById, jn]);
  useEffect(() => setLimit(PAGE), [dq, disc, type, instIds, sort, scope]);
  return (
    <>
      <section className="filters" aria-label={t("search")}>
        <label className="sel sbox"><span><Icon n="search" size={14} />{t("search")}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} autoComplete="off" /></label>
        <Sel icon="discipline" label={t("discipline")} v={disc} set={setDisc} all={t("all")} opts={d.disciplines.map((s) => [s, dName(s, lang)])} />
        <Sel icon="building" label={t("instType")} v={type} set={setType} all={t("all")} opts={Object.entries(d.types).filter(([k]) => d.institutions.some((i) => i.type === k)).map(([k, v]) => [k, v[lang]])} />
        <label className="sel wide"><span><Icon n="building" size={14} />{t("inst")}</span>
          <input list="inst-list" value={instText} onChange={(e) => setInstText(e.target.value)} placeholder={t("instPh")} autoComplete="off" />
          <datalist id="inst-list">{sortedInst.map((i) => <option key={i.id} value={instLabel(i, lang)} />)}</datalist></label>
        <Sel icon="shield" label={t("scope")} v={scope} set={setScope} opts={[["vn", t("scopeVn")], ["all", t("scopeAll")]]} />
        <Sel icon="sort" label={t("sort")} v={sort} set={(s) => setSort(s as SortKey)} opts={[["totalScore", t("byScore")], ["worksCount", t("byWorks")], ["citations", t("byCit")]]} />
      </section>
      <p className="meta" role="status" aria-live="polite">{t("shown", { n: num(Math.min(limit, rows.length)), t: num(rows.length) })}{instIds && ` · ${t("instOpt")} “${instText.trim()}”: ${num(instIds.size)}`}</p>
      {rows.length === 0 ? <p className="empty">{t("none")}</p> : (
        <div className="table-wrap"><table className="cards">
          <caption className="sr">{t("title")}: {t("shown", { n: num(Math.min(limit, rows.length)), t: num(rows.length) })}</caption>
          <thead><tr><th scope="col" className="num" title={t("rankTip")}>{t("rank")}</th><th scope="col">{t("author")}</th><th scope="col">{t("unit")}</th><th scope="col" className="num">{t("works")}</th><th scope="col" className="num">{t("score")}</th><th scope="col" className="num">{t("cit")}</th><th scope="col">{t("years")}</th></tr></thead>
          <tbody>{rows.slice(0, Math.min(limit, CAP)).map((a) => { const rv = a[rankKey]; return (
            <tr key={a.id}>
              <td className="num rankc" data-l={t("rank")}>{rv ? <span className={`rk r${Math.min(rv, 4)}`}>{num(rv)}</span> : <span className="meta" title={t("rankNoneTip")}>–<span className="sr"> {t("rankNone")}</span></span>}</td>
              <td className="who"><a href={`#/tac-gia/${encodeURIComponent(a.id)}`}>{a.name}</a>{a.claimed && <><Icon n="check" size={14} className="ok" /><span className="sr"> {t("claimedSr")}</span></>}{a.foreign && <span className="tagf">{t("foreignTag")}</span>}{a.suspect && <span className="tagf">{t("suspectTag")}</span>}<Top2Tag a={a} cls="top2" /><div className="meta">{a.disciplines.map((s) => dName(s, lang)).join(" · ")}</div></td>
              <td data-l={t("unit")}>{a.institutions.map((i) => instLabel(instById.get(i), lang, i)).join(", ")}</td>
              <td className="num" data-l={t("works")}>{num(a.worksCount)}</td><td className="num" data-l={t("score")}><span className="score">{num(a.totalScore, 2)}</span></td><td className="num" data-l={t("cit")}>{num(a.citations)}</td>
              <td className="meta yrs" data-l={t("years")}>{a.firstYear ?? "-"}–{a.lastYear ?? "-"}</td>
            </tr>); })}</tbody>
        </table></div>)}
      {rows.length > Math.min(limit, CAP) && (limit < CAP ? <p><button className="ghost" onClick={() => setLimit(limit + PAGE)}>{t("moreRows")} ({num(Math.min(limit, rows.length))}/{num(rows.length)})</button></p> : <p className="meta">{t("capNote", { n: num(CAP) })}</p>)}
    </>
  );
}

function AuthorPage({ a, d }: { a: Author; d: Data }) {
  const { lang, t, num } = useT();
  const [works, setWorks] = useState<Work[] | null>(null);
  const [werr, setWerr] = useState(false), [tick, setTick] = useState(0), [wlimit, setWlimit] = useState(PAGE);
  // Hủy yêu cầu cũ khi đổi hồ sơ: không để công trình của hồ sơ trước hiện (và xuất CSV) ở hồ sơ sau.
  useEffect(() => {
    setWorks(null); setWerr(false); setWlimit(PAGE);
    if (a.worksCount === 0) { setWorks([]); return; }
    const ac = new AbortController();
    fetch(`./data/works/${encodeURIComponent(a.id)}.json`, { signal: ac.signal }).then((r) => { if (!r.ok) throw new Error("http"); return r.json(); }).then((w) => {
      if (!Array.isArray(w)) throw new Error("shape");
      setWorks([...(w as Work[])].sort((x, y) => y.year - x.year));
    }).catch(() => { if (ac.signal.aborted) return; setWerr(true); setWorks([]); });
    return () => ac.abort();
  }, [a.id, a.worksCount, tick]);
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  const inst = a.institutions.map((i) => instById.get(i)).filter((x): x is Institution => !!x);
  const csv = () => {
    // Chống chèn công thức (CSV injection): ô văn bản bắt đầu bằng = + - @ hoặc tab/xuống dòng được thêm dấu nháy đơn.
    const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const body = [["year", "title", "journal", "issn", "score", "citations", "role"], ...(works ?? []).map((w) => [w.year, w.title, w.journal, w.issn, w.score ?? "", w.citations, w.role])].map((r) => r.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${slug(a.name)}-${a.id}.csv` }).click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const pool = d.meta.rankPool ?? 0;
  const rk = (v: number | null) => (v ? <>#{num(v)} <small className="of">{t("rankOf", { n: num(pool) })}</small></> : <span title={t("rankNoneTip")}>–</span>);
  const roleCell = (w: Work) => (w.role === "lead" ? t("lead") : t("co"));
  return (
    <article>
      <p><a href="#/">{t("back")}</a></p>
      <h1 className="au">{a.name}</h1>
      <p className="badges">{a.foreign && <span className="badge warnb">{t("foreignTag")}</span>}{a.suspect && <span className="badge warnb">{t("suspectTag")}</span>}<Top2Tag a={a} cls="badge top2b" />{a.claimed && <span className="badge"><Icon n="check" size={16} />{t("claimedBadge")}</span>}</p>
      <p className="meta">{inst.map((i) => instLabel(i, lang)).join(", ")}{a.orcid && <> · <a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener">ORCID {a.orcid}<span className="sr"> {t("newTab")}</span></a></>}</p>
      <div className="stats">
        <div><Icon n="trophy" size={22} /><b>{rk(a.rankScore)}</b><span>{t("rank")} · {t("score")}</span></div><div><Icon n="chart" size={22} /><b>{rk(a.rankWorks)}</b><span>{t("rank")} · {t("works")}</span></div>
        <div><Icon n="check" size={22} /><b>{num(a.totalScore, 2)}</b><span>{t("cite")}</span></div><div><Icon n="book" size={22} /><b>{num(a.countedWorks)}/{num(a.worksCount)}</b><span>{t("counted")}</span></div>
        <div><Icon n="link" size={22} /><b>{Math.round(a.matchedRate * 100)}%</b><span>{t("matched")}</span></div>
      </div>
      {a.suspect && <p className="banner demo" role="note"><Icon n="info" />{t("suspectNote")}</p>}
      <p className="actions-row"><button className="ghost" onClick={csv} disabled={!works?.length}><Icon n="download" size={16} />{t("csv")}</button> <a className="ghost-link" href={`#/dinh-chinh/${encodeURIComponent(a.id)}`}><Icon n="user" size={16} />{t("corrLink")}</a></p>
      {works === null ? <p className="empty" role="status">{t("loading")}</p>
        : werr ? <div className="empty" role="alert"><p>{t("workErr")}</p><button className="ghost" onClick={() => setTick(tick + 1)}>{t("retry")}</button></div>
        : works.length === 0 ? <p className="empty">{t("noWorks")}</p> : (
        <div className="table-wrap"><table className="cards">
          <caption className="sr">{t("paper")} · {a.name}</caption>
          <thead><tr><th scope="col" className="num">{t("year")}</th><th scope="col">{t("paper")}</th><th scope="col">{t("journal")}</th><th scope="col">{t("issn")}</th><th scope="col" className="num">{t("pts")}</th><th scope="col" className="num">{t("cit")}</th><th scope="col">{t("role")}</th></tr></thead>
          <tbody>{works.slice(0, wlimit).map((w) => (
            <tr key={w.id}><td className="num" data-l={t("year")}>{w.year}</td><td className="wt">{w.title}</td>
              <td data-l={t("journal")} className="wj">{w.journal}{w.scoreDiscipline && <div><a className="meta" target="_blank" rel="noopener" href={`${EDUFIND}/${w.scoreDiscipline}/?${w.scoreKind === "scopus" ? "tab=international&" : ""}q=${encodeURIComponent(w.issn)}`}>{t("lookup")} ↗<span className="sr"> {t("newTab")}</span></a></div>}</td>
              <td className="issn" data-l={t("issn")}>{w.issn}</td>
              <td className="num" data-l={t("pts")}>{w.score === null ? <span className="meta">{w.role === "lead" ? t("unmatched") : w.ru ? t("roleUnknown") : t("notLead")}</span> : <span className="score" title={w.scoreKind === "scopus" ? `Scopus ${w.quartile ?? ""}` : t("kDom")}>{num(w.score, 2)}</span>}{w.scoreKind === "scopus" && <div className="meta">Scopus {w.quartile ?? ""}</div>}</td>
              <td className="num" data-l={t("cit")}>{num(w.citations)}</td><td data-l={t("role")}>{roleCell(w)}</td></tr>))}</tbody>
        </table></div>)}
      {works && works.length > wlimit && <p><button className="ghost" onClick={() => setWlimit(wlimit + PAGE)}>{t("moreRows")} ({num(wlimit)}/{num(works.length)})</button></p>}
    </article>
  );
}

function Correction({ a }: { a: Author | null }) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [code, setCode] = useState("send");
  const [kind, setKind] = useState("claim");
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
  const msg = { rate: t("eRate"), "not-configured": t("eConf"), net: t("eNet"), kind: t("eBad"), email: t("eBad"), empty: t("eBad") }[code as "rate"] ?? t("sendErr");
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
            {([["claim", "kClaim"], ["correct", "kCorrect"], ["remove", "kRemove"]] as const).map(([k, l]) => <label key={k} className="radio"><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />{t(l)}</label>)}
          </fieldset>
          {!a && <label className="sel"><span>{t("fRef")}</span><input name="ref" required maxLength={160} /></label>}
          <label className="sel"><span>{t("fName")}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
          <label className="sel"><span>{t("fEmail")}</span><input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
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
