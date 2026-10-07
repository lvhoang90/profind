import { useEffect, useMemo, useState } from "react";
import { Ctx, DICT, KEY, initialLang, useT, type Key, type Lang } from "./i18n";
import { dName } from "./disciplines";
import { Icon, type IconName } from "./icons";
import type { Author, Data, Work } from "./types";

type SortKey = "totalScore" | "worksCount" | "citations";
const EDUFIND = "https://edufind.isavn.edu.vn";
const hash = () => decodeURIComponent(location.hash.replace(/^#\/?/, ""));

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [route, setRoute] = useState(hash());
  const t = (k: Key, v?: Record<string, string | number>) => { let s: string = DICT[lang][k]; for (const [a, b] of Object.entries(v ?? {})) s = s.replace(`{${a}}`, String(b)); return s; };
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(KEY, lang); } catch { /* bỏ qua */ } }, [lang]);
  useEffect(() => { const f = () => setRoute(hash()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  useEffect(() => { fetch("./data/profind.json").then((r) => r.json()).then(setData, () => setErr(true)); }, []);
  const author = data && route.startsWith("tac-gia/") ? data.authors.find((a) => a.id === route.slice(8)) : null;
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
        {err ? <p className="empty">{t("err")}</p> : !data ? <p className="empty">{t("loading")}</p> : author ? <AuthorPage a={author} d={data} /> : <List d={data} />}
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
        <p className="meta"><Icon n="shield" size={14} /> {t("lic")} <a href="https://github.com/lvhoang90/profind/issues" target="_blank" rel="noopener">{t("fix")}</a></p>
      </footer>
    </Ctx.Provider>
  );
}

function List({ d }: { d: Data }) {
  const { lang, t } = useT();
  const [q, setQ] = useState(""), [disc, setDisc] = useState(""), [type, setType] = useState(""), [inst, setInst] = useState(""), [sort, setSort] = useState<SortKey>("totalScore");
  const instById = useMemo(() => new Map(d.institutions.map((i) => [i.id, i])), [d]);
  const worksBy = useMemo(() => { const m = new Map<string, Work[]>(); for (const w of d.works) { const l = m.get(w.authorId); if (l) l.push(w); else m.set(w.authorId, [w]); } return m; }, [d]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return d.authors.filter((a) => {
      if (disc && !a.disciplines.includes(disc)) return false;
      if (inst && !a.institutions.includes(inst)) return false;
      if (type && !a.institutions.some((i) => instById.get(i)?.type === type)) return false;
      if (!n) return true;
      return a.name.toLowerCase().includes(n) || !!a.orcid?.includes(n) || (worksBy.get(a.id) ?? []).some((w) => w.journal.toLowerCase().includes(n) || w.issn.includes(n));
    }).sort((a, b) => b[sort] - a[sort] || b.worksCount - a.worksCount);
  }, [d, q, disc, type, inst, sort, instById, worksBy]);
  return (
    <>
      <section className="filters">
        <label className="sel sbox"><span><Icon n="search" size={14} />{t("search")}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} /></label>
        <Sel icon="discipline" label={t("discipline")} v={disc} set={setDisc} all={t("all")} opts={d.disciplines.map((s) => [s, dName(s, lang)])} />
        <Sel icon="building" label={t("instType")} v={type} set={setType} all={t("all")} opts={Object.entries(d.types).map(([k, v]) => [k, v[lang]])} />
        <Sel icon="building" label={t("inst")} v={inst} set={setInst} all={t("all")} opts={d.institutions.filter((i) => d.authors.some((a) => a.institutions.includes(i.id))).sort((a, b) => a.name.localeCompare(b.name, "vi")).map((i) => [i.id, lang === "vi" ? i.name : i.en])} />
        <Sel icon="sort" label={t("sort")} v={sort} set={(s) => setSort(s as SortKey)} opts={[["totalScore", t("byScore")], ["worksCount", t("byWorks")], ["citations", t("byCit")]]} />
      </section>
      <p className="meta">{t("shown", { n: rows.length, t: d.authors.length })}</p>
      {rows.length === 0 ? <p className="empty">{t("none")}</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th className="num">{t("rank")}</th><th>{t("author")}</th><th>{t("unit")}</th><th className="num">{t("works")}</th><th className="num">{t("score")}</th><th className="num">{t("cit")}</th><th>{t("years")}</th></tr></thead>
          <tbody>{rows.slice(0, 200).map((a, i) => (
            <tr key={a.id}>
              <td className="num"><span className={`rk r${Math.min(i + 1, 4)}`}>{i + 1}</span></td>
              <td><a href={`#/tac-gia/${a.id}`}>{a.name}</a><div className="meta">{a.disciplines.map((s) => dName(s, lang)).join(" · ")}</div></td>
              <td>{a.institutions.map((i) => { const x = instById.get(i); return x ? (lang === "vi" ? x.name : x.en) : i; }).join(", ")}</td>
              <td className="num">{a.worksCount}</td><td className="num"><span className="score">{a.totalScore}</span></td><td className="num">{a.citations}</td>
              <td className="meta">{a.firstYear ?? "-"}–{a.lastYear ?? "-"}</td>
            </tr>))}</tbody>
        </table></div>)}
    </>
  );
}

function AuthorPage({ a, d }: { a: Author; d: Data }) {
  const { lang, t } = useT();
  const works = useMemo(() => d.works.filter((w) => w.authorId === a.id).sort((x, y) => y.year - x.year), [d, a]);
  const inst = a.institutions.map((i) => d.institutions.find((x) => x.id === i)).filter((x): x is NonNullable<typeof x> => !!x);
  const csv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const body = [["year", "title", "journal", "issn", "score", "citations", "role"], ...works.map((w) => [w.year, w.title, w.journal, w.issn, w.score ?? "", w.citations, w.role])].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${a.id}.csv` }).click(); URL.revokeObjectURL(url);
  };
  return (
    <article>
      <p><a href="#/">{t("back")}</a></p>
      <h2 className="au">{a.name}</h2>
      <p className="meta">{inst.map((i) => (lang === "vi" ? i.name : i.en)).join(", ")}{a.orcid && <> · <a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener">ORCID {a.orcid}</a></>}</p>
      <div className="stats">
        <div><Icon n="trophy" size={22} /><b>#{a.rankScore}</b><span>{t("rank")} · {t("score")}</span></div><div><Icon n="chart" size={22} /><b>#{a.rankWorks}</b><span>{t("rank")} · {t("works")}</span></div>
        <div><Icon n="check" size={22} /><b>{a.totalScore}</b><span>{t("cite")}</span></div><div><Icon n="book" size={22} /><b>{a.countedWorks}/{a.worksCount}</b><span>{t("counted")}</span></div>
        <div><Icon n="link" size={22} /><b>{Math.round(a.matchedRate * 100)}%</b><span>{t("matched")}</span></div>
      </div>
      <p><button className="ghost" onClick={csv}><Icon n="download" size={16} />{t("csv")}</button></p>
      <div className="table-wrap"><table>
        <thead><tr><th className="num">{t("year")}</th><th>{t("paper")}</th><th>{t("journal")}</th><th>{t("issn")}</th><th className="num">{t("pts")}</th><th className="num">{t("cit")}</th><th>{t("role")}</th></tr></thead>
        <tbody>{works.map((w) => (
          <tr key={w.id}><td className="num">{w.year}</td><td>{w.title}</td>
            <td>{w.journal}{w.scoreDiscipline && <div><a className="meta" target="_blank" rel="noopener" href={`${EDUFIND}/${w.scoreDiscipline}/?${w.scoreKind === "scopus" ? "tab=international&" : ""}q=${encodeURIComponent(w.issn)}`}>{t("lookup")} ↗</a></div>}</td>
            <td className="issn">{w.issn}</td>
            <td className="num">{w.score === null ? <span className="meta">{!w.matched ? t("unmatched") : w.role === "co" ? t("notLead") : t("unmatched")}</span> : <span className="score" title={w.scoreKind === "scopus" ? `Scopus ${w.quartile ?? ""}` : t("kDom")}>{w.score}</span>}{w.scoreKind === "scopus" && <div className="meta">Scopus {w.quartile ?? ""}</div>}</td>
            <td className="num">{w.citations}</td><td>{w.role === "lead" ? t("lead") : t("co")}</td></tr>))}</tbody>
      </table></div>
    </article>
  );
}

function Sel({ icon, label, v, set, opts, all }: { icon: IconName; label: string; v: string; set: (s: string) => void; opts: string[][]; all?: string }) {
  return <label className="sel"><span><Icon n={icon} size={14} />{label}</span><select value={v} onChange={(e) => set(e.target.value)}>{all !== undefined && <option value="">{all}</option>}{opts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>;
}
