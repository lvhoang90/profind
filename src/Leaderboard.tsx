import { provName } from "./provinces";
import { useEffect, useMemo, useState } from "react";
import type { Author } from "./types";
import type { Lang } from "./i18n";
import { dName } from "./disciplines";

// Bảng xếp hạng ĐƠN VỊ và NGÀNH. Một nhóm được xếp theo điểm trung bình của tối đa 10 nhà khoa học có PRO-SCORE cao nhất trong nhóm
// (không thiên vị nhóm đông người), kèm số người thuộc PRO-SCORE1000™, số người có điểm, tổng trích dẫn và 3 người đứng đầu.
// Chỉ tính hồ sơ có điểm và không bị đánh dấu nghi gộp nhầm; nhóm có dưới MIN người có điểm không được xếp hạng.
const MIN = 5;
type Row = { id: string; name: string; sub: string; n: number; avg: number; p1000: number; cit: number; top: Author[] };
const DICT_INTL: Record<Lang, string> = { vi: "Gồm cả hồ sơ liên kết quốc tế", en: "Include international-link profiles" };
type SortK = "avg" | "p1000" | "n" | "cit";
const L = {
  vi: { title: "Bảng xếp hạng", lead: "Xếp hạng đơn vị và ngành theo điểm trung bình của tối đa 10 nhà khoa học có PRO-SCORE cao nhất trong nhóm. Đây là chỉ số tham khảo mô phỏng, không phải xếp hạng chính thức.", units: "Đơn vị", fields: "Ngành", type: "Loại đơn vị", all: "Tất cả", rank: "Hạng", name: "Tên", avg: "Điểm TB top 10", p1000: "Trong PRO-SCORE1000™", n: "Nhà khoa học có điểm", cit: "Tổng trích dẫn", top: "Đứng đầu", note: `Chỉ xét nhóm có từ ${MIN} nhà khoa học đủ điều kiện xếp hạng (từ 10 công trình, hoạt động từ 3 năm); điểm trung bình top 10 chỉ tính các hồ sơ đủ điều kiện; cột "Nhà khoa học có điểm" đếm mọi hồ sơ có điểm, và người có nhiều đơn vị hiện tại được đếm ở từng đơn vị; hồ sơ nghi gộp nhầm nhiều người không được tính; hồ sơ liên kết quốc tế được tính khi ô “Gồm cả hồ sơ liên kết quốc tế” đang bật (mặc định bật; xếp theo hạng gồm cả nhóm này); chỉ tính đơn vị hiện tại của tác giả; không xếp hạng cơ sở tôn giáo.`, view: "Xem danh sách", sort: "Sắp xếp theo", none: "Chưa có nhóm đủ điều kiện." },
  en: { title: "Leaderboard", lead: "Institutions and fields ranked by the average PRO-SCORE of their top 10 scientists. A simulated reference index, not an official ranking.", units: "Institutions", fields: "Fields", type: "Institution type", all: "All", rank: "Rank", name: "Name", avg: "Top-10 avg score", p1000: "In PRO-SCORE1000™", n: "Scored scientists", cit: "Total citations", top: "Top scientists", note: `Only groups with at least ${MIN} rank-eligible scientists (10+ works, active 3+ years) are ranked; the top-10 average counts eligible profiles only; the "Scored scientists" column counts every scored profile, and a person with several current institutions is counted at each one; profiles suspected of merging several people are excluded; international-link profiles count when “Include international-link profiles” is ticked (on by default; ranked by the rank that includes them); only each author's current institution counts; religious institutions are not ranked.`, view: "View list", sort: "Sort by", none: "No eligible groups yet." },
};
type LB = { types: Record<string, { vi: string; en: string }>; units: LRow[]; fields: LRow[]; unitsAll: LRow[]; fieldsAll: LRow[] };
type LRow = { id: string; n: number; avg: number; p1000: number; cit: number; top: [string, string, number][]; name?: string; en?: string; city?: string; type?: string };
export function LeaderboardPage({ lang, num }: { lang: Lang; num: (n: number, d?: number) => string }) {
  const t = L[lang], [tab, setTab] = useState<"u" | "f">("u"), [type, setType] = useState(""), [sort, setSort] = useState<SortK>("avg");
  // Bảng đã tính sẵn lúc dựng (scripts/build-lite.mjs → data/leaderboard.json, ~80 KB): không cần tải cả bộ hồ sơ.
  const [lb, setLb] = useState<LB | null>(null), [err, setErr] = useState(false), [intl, setIntl] = useState(true); // intl: gồm cả hồ sơ liên kết quốc tế (xếp theo proRankAll)
  useEffect(() => { fetch("./data/leaderboard.json").then((r) => { if (!r.ok) throw new Error("http"); return r.json(); }).then(setLb).catch(() => setErr(true)); }, []);
  const rows = useMemo(() => {
    if (!lb) return [] as Row[];
    const us = intl ? lb.unitsAll : lb.units, fs = intl ? lb.fieldsAll : lb.fields, src = tab === "u" ? us.filter((r) => !type || r.type === type) : fs;
    return src.map((r): Row => ({ id: r.id, name: tab === "u" ? (lang === "vi" ? r.name : r.en || r.name) ?? r.id : dName(r.id, lang), sub: tab === "u" ? provName(r.city, lang) : "", n: r.n, avg: r.avg, p1000: r.p1000, cit: r.cit, top: r.top.map(([id, name, pro]) => ({ id, name, pro }) as unknown as Author) })).sort((a, b) => b[sort] - a[sort] || b.avg - a.avg);
  }, [lb, tab, type, sort, lang, intl]);
  if (err) return <p className="empty" role="alert">{t.none}</p>;
  if (!lb) return <p className="empty" role="status">…</p>;
  const types = Object.entries(lb.types ?? {}).filter(([k]) => k !== "other");
  const SORTS: [SortK, string][] = [["avg", t.avg], ["p1000", t.p1000], ["n", t.n], ["cit", t.cit]];
  return (
    <article className="lb">
      <h1>{t.title}</h1><p className="meta">{t.lead}</p>
      <div className="seg" role="tablist"><button type="button" role="tab" aria-pressed={tab === "u"} aria-selected={tab === "u"} onClick={() => setTab("u")}>{t.units}</button><button type="button" role="tab" aria-pressed={tab === "f"} aria-selected={tab === "f"} onClick={() => setTab("f")}>{t.fields}</button></div>
      <div className="lb-ctl">
        {tab === "u" && <label className="sel"><span>{t.type}</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">{t.all}</option>{types.map(([k, v]) => <option key={k} value={k}>{lang === "vi" ? v.vi : v.en}</option>)}</select></label>}
        <label className="chk"><input type="checkbox" checked={intl} onChange={(e) => setIntl(e.target.checked)} /> {DICT_INTL[lang]}</label>
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
