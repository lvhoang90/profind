import { useMemo, useState } from "react";
import type { Author, Data } from "./types";
import type { Lang } from "./i18n";
import { dName } from "./disciplines";

// Bảng xếp hạng ĐƠN VỊ và NGÀNH. Một nhóm được xếp theo điểm trung bình của tối đa 10 nhà khoa học có PRO-SCORE cao nhất trong nhóm
// (không thiên vị nhóm đông người), kèm số người thuộc PRO-SCORE1000™, số người có điểm, tổng trích dẫn và 3 người đứng đầu.
// Chỉ tính hồ sơ có điểm và không bị đánh dấu nghi gộp nhầm; nhóm có dưới MIN người có điểm không được xếp hạng.
const MIN = 5, TOPN = 10;
type Row = { id: string; name: string; sub: string; n: number; avg: number; p1000: number; cit: number; top: Author[] };
type SortK = "avg" | "p1000" | "n" | "cit";
const L = {
  vi: { title: "Bảng xếp hạng", lead: "Xếp hạng đơn vị và ngành theo điểm trung bình của tối đa 10 nhà khoa học có PRO-SCORE cao nhất trong nhóm. Đây là chỉ số tham khảo mô phỏng, không phải xếp hạng chính thức.", units: "Đơn vị", fields: "Ngành", type: "Loại đơn vị", all: "Tất cả", rank: "Hạng", name: "Tên", avg: "Điểm TB top 10", p1000: "Trong PRO-SCORE1000™", n: "Nhà khoa học có điểm", cit: "Tổng trích dẫn", top: "Đứng đầu", note: `Chỉ xét nhóm có từ ${MIN} nhà khoa học có điểm trở lên; hồ sơ nghi gộp nhầm nhiều người không được tính; chỉ tính đơn vị hiện tại của tác giả; không xếp hạng cơ sở tôn giáo.`, view: "Xem danh sách", sort: "Sắp xếp theo", none: "Chưa có nhóm đủ điều kiện." },
  en: { title: "Leaderboard", lead: "Institutions and fields ranked by the average PRO-SCORE of their top 10 scientists. A simulated reference index, not an official ranking.", units: "Institutions", fields: "Fields", type: "Institution type", all: "All", rank: "Rank", name: "Name", avg: "Top-10 avg score", p1000: "In PRO-SCORE1000™", n: "Scored scientists", cit: "Total citations", top: "Top scientists", note: `Only groups with at least ${MIN} scored scientists are ranked; profiles suspected of merging several people are excluded; only each author's current institution counts; religious institutions are not ranked.`, view: "View list", sort: "Sort by", none: "No eligible groups yet." },
};
export function LeaderboardPage({ data, lang, num }: { data: Data; lang: Lang; num: (n: number, d?: number) => string }) {
  const t = L[lang], [tab, setTab] = useState<"u" | "f">("u"), [type, setType] = useState(""), [sort, setSort] = useState<SortK>("avg");
  const unitBy = useMemo(() => new Map(data.institutions.map((i) => [i.id, i])), [data]);
  const rows = useMemo(() => {
    const g = new Map<string, Author[]>();
    for (const a of data.authors) {
      if (a.suspect || a.pro == null) continue;
      const keys = tab === "u" ? a.institutions.filter((i) => !a.instPast?.includes(i)) : a.disciplines;
      for (const k of keys) { if (tab === "u" && (unitBy.get(k)?.type === "other" || (type && unitBy.get(k)?.type !== type))) continue; /* bỏ cơ sở tôn giáo */ (g.get(k) ?? g.set(k, []).get(k)!).push(a); }
    }
    const out: Row[] = [];
    for (const [k, list] of g) {
      if (list.length < MIN) continue;
      const top = [...list].sort((x, y) => (y.pro ?? 0) - (x.pro ?? 0)), t10 = top.slice(0, TOPN);
      const u = unitBy.get(k);
      out.push({ id: k, name: tab === "u" ? (lang === "vi" ? u?.name : u?.en || u?.name) ?? k : dName(k, lang), sub: tab === "u" ? (u?.city ?? "") : "", n: list.length, avg: t10.reduce((s, a) => s + (a.pro ?? 0), 0) / t10.length, p1000: list.filter((a) => (a.proRank ?? 1e9) <= 1000).length, cit: list.reduce((s, a) => s + (a.citations ?? 0), 0), top: top.slice(0, 3) });
    }
    return out.sort((a, b) => b[sort] - a[sort] || b.avg - a.avg);
  }, [data, tab, type, sort, lang, unitBy]);
  const types = Object.entries(data.types ?? {}).filter(([k]) => k !== "other");
  const SORTS: [SortK, string][] = [["avg", t.avg], ["p1000", t.p1000], ["n", t.n], ["cit", t.cit]];
  return (
    <article className="lb">
      <h1>{t.title}</h1><p className="meta">{t.lead}</p>
      <div className="seg" role="tablist"><button type="button" role="tab" aria-pressed={tab === "u"} aria-selected={tab === "u"} onClick={() => setTab("u")}>{t.units}</button><button type="button" role="tab" aria-pressed={tab === "f"} aria-selected={tab === "f"} onClick={() => setTab("f")}>{t.fields}</button></div>
      <div className="lb-ctl">
        {tab === "u" && <label className="sel"><span>{t.type}</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">{t.all}</option>{types.map(([k, v]) => <option key={k} value={k}>{lang === "vi" ? v.vi : v.en}</option>)}</select></label>}
        <label className="sel"><span>{t.sort}</span><select value={sort} onChange={(e) => setSort(e.target.value as SortK)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      {rows.length === 0 ? <p className="empty">{t.none}</p> : (
        <ol className="lb-list">{rows.map((r, i) => (
          <li key={r.id} className={i < 3 ? `lb-top t${i + 1}` : undefined}>
            <span className="lb-rk" aria-label={`${t.rank} ${i + 1}`}>{i + 1}</span>
            <div className="lb-main">
              <h2><a href={`#/?${tab === "u" ? "i" : "d"}=${encodeURIComponent(r.id)}&b=1`} title={t.view}>{r.name}</a></h2>
              {r.sub && <small className="meta">{r.sub}</small>}
              <p className="lb-tops">{r.top.map((a, k) => <a key={a.id} href={`#/tac-gia/${encodeURIComponent(a.id)}`}>{k > 0 ? " · " : ""}{a.name} <em>{num(a.pro ?? 0, 1)}</em></a>)}</p>
            </div>
            <dl className="lb-nums">
              <div className="lb-avg"><dt>{t.avg}</dt><dd><span className="score">{num(r.avg, 1)}</span></dd></div>
              <div><dt>{t.p1000}</dt><dd>{num(r.p1000)}</dd></div>
              <div><dt>{t.n}</dt><dd>{num(r.n)}</dd></div>
              <div><dt>{t.cit}</dt><dd>{num(r.cit)}</dd></div>
            </dl>
          </li>))}</ol>
      )}
      <p className="meta">{t.note}</p>
    </article>
  );
}
