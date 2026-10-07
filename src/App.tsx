import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Ctx, DICT, KEY, initialLang, useT, type Key, type Lang } from "./i18n";
import { dName } from "./disciplines";
import { Icon, type IconName } from "./icons";
import type { Author, Data, Work } from "./types";

type SortKey = "totalScore" | "worksCount" | "citations";
const EDUFIND = "https://edufind.isavn.edu.vn";
const CONTACT = "luongviethoang.hcm@gmail.com";
const PAGE = 100;
const hash = () => decodeURIComponent(location.hash.replace(/^#\/?/, ""));
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [route, setRoute] = useState(hash());
  const t = (k: Key, v?: Record<string, string | number>) => { let s: string = DICT[lang][k]; for (const [a, b] of Object.entries(v ?? {})) s = s.replace(`{${a}}`, String(b)); return s; };
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(KEY, lang); } catch { /* bỏ qua */ } }, [lang]);
  useEffect(() => { const f = () => { setRoute(hash()); scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  useEffect(() => { fetch("./data/profind.json").then((r) => r.json()).then(setData, () => setErr(true)); }, []);
  const [kind, id] = route.split("/");
  const author = data && id ? data.authors.find((a) => a.id === id) : null;
  return (
    <Ctx.Provider value={{ lang, t }}>
      <header className="top">
        <div className="wrap hd">
          <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
          <div className="lang" role="group" aria-label="Language">
            {(["vi", "en"] as const).map((l) => <button key={l} className={`lang-${l}`} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
          </div>
        </div>
        <div className="wrap"><h1>{t("sub")}</h1><p className="tag">{t("tagline")}</p></div>
      </header>
      <main className="wrap">
        {data?.meta.demo && <p className="banner demo" role="note"><Icon n="info" />{t("demo")}</p>}
        <p className="banner" role="note"><Icon n="shield" />{t("notRank")}</p>
        {err ? <p className="empty">{t("err")}</p> : !data ? <p className="empty">{t("loading")}</p>
          : kind === "dinh-chinh" ? <Correction a={author ?? null} /> : kind === "tac-gia" && author ? <AuthorPage a={author} d={data} /> : <List d={data} />}
      </main>
      <footer className="foot wrap">
        <section className="eco" aria-label={t("eco")}>
          <h2>{t("eco")}</h2>
          <ol>
            <li className="self"><a href="#/" aria-current="page"><small>1 · {t("here")}</small><b>{t("e1")}</b></a></li>
            <li><a href={`${EDUFIND}/`} target="_blank" rel="noopener"><small>2</small><b>{t("e2")}</b></a></li>
            <li><a href="https://isavn.edu.vn/go/ami?from=profind" target="_blank" rel="noopener"><small>3</small><b>{t("e3")}</b></a></li>
          </ol>
        </section>
        {data && !data.meta.demo && data.meta.fetched && <p className="meta">{t("source")}: {t("srcLine", { d: data.meta.fetched })}</p>}
        <p className="meta"><Icon n="shield" size={14} /> {t("lic")} <a href="#/dinh-chinh">{t("fix")}</a></p>
      </footer>
    </Ctx.Provider>
  );
}

function List({ d }: { d: Data }) {
  const { lang, t } = useT();
  const [q, setQ] = useState(""), [disc, setDisc] = useState(""), [type, setType] = useState(""), [sort, setSort] = useState<SortKey>("totalScore");
  const [scope, setScope] = useState("vn"), [instText, setInstText] = useState(""), [limit, setLimit] = useState(PAGE);
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  const instName = (i: Data["institutions"][number]) => (lang === "vi" ? i.name : i.en);
  const inst = d.institutions.find((i) => instName(i) === instText)?.id ?? "";
  const rows = useMemo(() => {
    const n = fold(q.trim());
    return d.authors.filter((a) => {
      if (scope === "vn" && (a.foreign !== false || a.suspect)) return false;
      if (disc && !a.disciplines.includes(disc)) return false;
      if (inst && !a.institutions.includes(inst)) return false;
      if (type && !a.institutions.some((i) => instById.get(i)?.type === type)) return false;
      if (!n) return true;
      return fold(a.name).includes(n) || !!a.orcid?.includes(n) || a.jn.includes(n);
    }).sort((a, b) => b[sort] - a[sort] || b.worksCount - a.worksCount);
  }, [d, q, disc, type, inst, sort, scope, instById]);
  useEffect(() => setLimit(PAGE), [q, disc, type, inst, sort, scope]);
  return (
    <>
      <section className="filters">
        <label className="sel sbox"><span><Icon n="search" size={14} />{t("search")}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} /></label>
        <Sel icon="discipline" label={t("discipline")} v={disc} set={setDisc} all={t("all")} opts={d.disciplines.map((s) => [s, dName(s, lang)])} />
        <Sel icon="building" label={t("instType")} v={type} set={setType} all={t("all")} opts={Object.entries(d.types).map(([k, v]) => [k, v[lang]])} />
        <label className="sel"><span><Icon n="building" size={14} />{t("inst")}</span>
          <input list="inst-list" value={instText} onChange={(e) => setInstText(e.target.value)} placeholder={t("instPh")} />
          <datalist id="inst-list">{d.institutions.map((i) => <option key={i.id} value={instName(i)} />)}</datalist></label>
        <Sel icon="shield" label={t("scope")} v={scope} set={setScope} opts={[["vn", t("scopeVn")], ["all", t("scopeAll")]]} />
        <Sel icon="sort" label={t("sort")} v={sort} set={(s) => setSort(s as SortKey)} opts={[["totalScore", t("byScore")], ["worksCount", t("byWorks")], ["citations", t("byCit")]]} />
      </section>
      <p className="meta">{t("shown", { n: Math.min(limit, rows.length), t: rows.length })}</p>
      {rows.length === 0 ? <p className="empty">{t("none")}</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th className="num">{t("rank")}</th><th>{t("author")}</th><th>{t("unit")}</th><th className="num">{t("works")}</th><th className="num">{t("score")}</th><th className="num">{t("cit")}</th><th>{t("years")}</th></tr></thead>
          <tbody>{rows.slice(0, limit).map((a, i) => (
            <tr key={a.id}>
              <td className="num"><span className={`rk r${Math.min(i + 1, 4)}`}>{i + 1}</span></td>
              <td><a href={`#/tac-gia/${a.id}`}>{a.name}</a>{a.claimed && <Icon n="check" size={14} className="ok" />}{a.foreign && <span className="tagf">{t("foreignTag")}</span>}{a.suspect && <span className="tagf">{t("suspectTag")}</span>}<div className="meta">{a.disciplines.map((s) => dName(s, lang)).join(" · ")}</div></td>
              <td>{a.institutions.map((i) => { const x = instById.get(i); return x ? instName(x) : i; }).join(", ")}</td>
              <td className="num">{a.worksCount}</td><td className="num"><span className="score">{a.totalScore}</span></td><td className="num">{a.citations}</td>
              <td className="meta">{a.firstYear ?? "-"}–{a.lastYear ?? "-"}</td>
            </tr>))}</tbody>
        </table></div>)}
      {rows.length > limit && <p><button className="ghost" onClick={() => setLimit(limit + PAGE)}>{t("moreRows")}</button></p>}
    </>
  );
}

function AuthorPage({ a, d }: { a: Author; d: Data }) {
  const { lang, t } = useT();
  const [works, setWorks] = useState<Work[] | null>(null);
  const [wlimit, setWlimit] = useState(PAGE);
  useEffect(() => { setWorks(null); setWlimit(PAGE); fetch(`./data/works/${a.id}.json`).then((r) => r.json()).then((w: Work[]) => setWorks(w.sort((x, y) => y.year - x.year)), () => setWorks([])); }, [a.id]);
  const inst = a.institutions.map((i) => d.institutions.find((x) => x.id === i)).filter((x): x is NonNullable<typeof x> => !!x);
  const csv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const body = [["year", "title", "journal", "issn", "score", "citations", "role"], ...(works ?? []).map((w) => [w.year, w.title, w.journal, w.issn, w.score ?? "", w.citations, w.role])].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${a.id}.csv` }).click(); URL.revokeObjectURL(url);
  };
  return (
    <article>
      <p><a href="#/">{t("back")}</a></p>
      <h2 className="au">{a.name}{a.foreign && <span className="badge warnb">{t("foreignTag")}</span>}{a.suspect && <span className="badge warnb">{t("suspectTag")}</span>}{a.claimed && <span className="badge" title={t("claimedBadge")}><Icon n="check" size={16} />{t("claimedBadge")}</span>}</h2>
      <p className="meta">{inst.map((i) => (lang === "vi" ? i.name : i.en)).join(", ")}{a.orcid && <> · <a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener">ORCID {a.orcid}</a></>}</p>
      <div className="stats">
        <div><Icon n="trophy" size={22} /><b>#{a.rankScore}</b><span>{t("rank")} · {t("score")}</span></div><div><Icon n="chart" size={22} /><b>#{a.rankWorks}</b><span>{t("rank")} · {t("works")}</span></div>
        <div><Icon n="check" size={22} /><b>{a.totalScore}</b><span>{t("cite")}</span></div><div><Icon n="book" size={22} /><b>{a.countedWorks}/{a.worksCount}</b><span>{t("counted")}</span></div>
        <div><Icon n="link" size={22} /><b>{Math.round(a.matchedRate * 100)}%</b><span>{t("matched")}</span></div>
      </div>
      {a.suspect && <p className="banner demo" role="note"><Icon n="info" />{t("suspectNote")}</p>}
      <p className="actions-row"><button className="ghost" onClick={csv} disabled={!works?.length}><Icon n="download" size={16} />{t("csv")}</button> <a className="ghost-link" href={`#/dinh-chinh/${a.id}`}><Icon n="user" size={16} />{t("corrLink")}</a></p>
      {works === null ? <p className="empty">{t("loading")}</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th className="num">{t("year")}</th><th>{t("paper")}</th><th>{t("journal")}</th><th>{t("issn")}</th><th className="num">{t("pts")}</th><th className="num">{t("cit")}</th><th>{t("role")}</th></tr></thead>
          <tbody>{works.slice(0, wlimit).map((w) => (
            <tr key={w.id}><td className="num">{w.year}</td><td>{w.title}</td>
              <td>{w.journal}{w.scoreDiscipline && <div><a className="meta" target="_blank" rel="noopener" href={`${EDUFIND}/${w.scoreDiscipline}/?${w.scoreKind === "scopus" ? "tab=international&" : ""}q=${encodeURIComponent(w.issn)}`}>{t("lookup")} ↗</a></div>}</td>
              <td className="issn">{w.issn}</td>
              <td className="num">{w.score === null ? <span className="meta">{w.role === "co" ? t("notLead") : t("unmatched")}</span> : <span className="score" title={w.scoreKind === "scopus" ? `Scopus ${w.quartile ?? ""}` : t("kDom")}>{w.score}</span>}{w.scoreKind === "scopus" && <div className="meta">Scopus {w.quartile ?? ""}</div>}</td>
              <td className="num">{w.citations}</td><td>{w.role === "lead" ? t("lead") : t("co")}</td></tr>))}</tbody>
        </table></div>)}
      {works && works.length > wlimit && <p><button className="ghost" onClick={() => setWlimit(wlimit + PAGE)}>{t("moreRows")} ({wlimit}/{works.length})</button></p>}
    </article>
  );
}

function Correction({ a }: { a: Author | null }) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [kind, setKind] = useState("claim");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState("sending");
    const f = new FormData(e.currentTarget); f.set("author", a?.id ?? ""); f.set("authorName", a?.name ?? "");
    try { const r = await fetch("/api/correction", { method: "POST", body: f }); setState(r.ok ? "ok" : "err"); } catch { setState("err"); }
  };
  return (
    <article className="corr">
      <p><a href={a ? `#/tac-gia/${a.id}` : "#/"}>{t("back")}</a></p>
      <h2>{t("corrTitle")}{a && <>: {a.name}</>}</h2>
      <p className="meta">{t("corrLead")}</p>
      {state === "ok" ? <p className="banner"><Icon n="check" />{t("sent")}</p> : (
        <form onSubmit={submit} className="form">
          <fieldset><legend className="sr">{t("corrTitle")}</legend>
            {([["claim", "kClaim"], ["correct", "kCorrect"], ["remove", "kRemove"]] as const).map(([k, l]) => <label key={k} className="radio"><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />{t(l)}</label>)}
          </fieldset>
          <label className="sel"><span>{t("fName")}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
          <label className="sel"><span>{t("fEmail")}</span><input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
          <label className="sel"><span>{t("fOrcid")}</span><input name="orcid" maxLength={40} defaultValue={a?.orcid ?? ""} placeholder="0000-0000-0000-0000" /></label>
          <label className="sel"><span>{t("fMsg")}</span><textarea name="msg" rows={5} maxLength={4000} required={kind === "correct"} /></label>
          <input name="_honey" className="honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p><button className="primary" disabled={state === "sending"}>{state === "sending" ? t("sending") : t("send")}</button></p>
          {state === "err" && <p className="banner demo">{t("sendErr")} <a href={`mailto:${CONTACT}?subject=${encodeURIComponent("[ProFind] " + (a?.name ?? ""))}`}>{CONTACT}</a></p>}
        </form>)}
    </article>
  );
}

function Sel({ icon, label, v, set, opts, all }: { icon: IconName; label: string; v: string; set: (s: string) => void; opts: string[][]; all?: string }) {
  return <label className="sel"><span><Icon n={icon} size={14} />{label}</span><select value={v} onChange={(e) => set(e.target.value)}>{all !== undefined && <option value="">{all}</option>}{opts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>;
}
