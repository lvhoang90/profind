import { useMemo } from "react";
import { useT } from "./i18n";
import { dName } from "./disciplines";
import { rankOf, useIntlRank } from "./intlPref";
import type { Author, Data, Institution } from "./types";

type LG = "vi" | "en";
const L = {
  vi: {
    title: "Năng lực nghiên cứu của nhà trường", lead: "Chọn một trường hoặc viện để xem đội ngũ nghiên cứu theo ngành, chuyên gia nổi bật và số liệu tổng hợp. Số liệu lấy từ hồ sơ công khai trên ProFind, tự động từ OpenAlex, ORCID và danh mục tạp chí.",
    pick: "Trường, viện", none: "Chọn một đơn vị để bắt đầu.", scopeNote: "Tính hồ sơ đang công tác tại đơn vị (theo cơ quan ghi trên bài gần đây), gồm cả đơn vị con. Chưa gồm hồ sơ chưa được ghép đơn vị.",
    people: "Nhà khoa học", ranked: "Có xếp hạng", top2: "Top 2% thế giới", cites: "Tổng trích dẫn", works: "Công trình", avg: "PRO-SCORE trung bình (10 người đầu)",
    byField: "Theo ngành", field: "Ngành", count: "Số người", best: "Người đứng đầu", all: "Tất cả ngành", experts: "Chuyên gia nổi bật", exFor: (f: string) => `Chuyên gia ngành ${f}`,
    rank: "Hạng", score: "PRO-SCORE", empty: "Đơn vị này chưa có hồ sơ có xếp hạng.", report: "Cần báo cáo riêng cho đơn vị này?", reportD: "ISA làm báo cáo năng lực nghiên cứu theo yêu cầu (có phí, báo giá trước). Xem hồ sơ công khai luôn miễn phí.",
    reportBtn: "Gửi yêu cầu tới ISA", unitPage: "Trang đơn vị đầy đủ", date: (s: string) => `Dữ liệu ngày ${s}`, ref: "PRO-SCORE1000™ là chỉ số tham khảo mô phỏng, không thay thế đánh giá chính thức.",
  },
  en: {
    title: "Research capacity of a school", lead: "Pick a university or institute to see its research staff by field, standout experts and summary figures. Figures come from public ProFind profiles, collected automatically from OpenAlex, ORCID and journal lists.",
    pick: "University or institute", none: "Pick a unit to begin.", scopeNote: "Counts profiles currently working at the unit (from affiliations on recent works), including child units. Profiles without a matched unit are not included.",
    people: "Researchers", ranked: "Ranked", top2: "World top 2%", cites: "Total citations", works: "Works", avg: "Average PRO-SCORE (top 10)",
    byField: "By field", field: "Field", count: "People", best: "Top researcher", all: "All fields", experts: "Standout experts", exFor: (f: string) => `Experts in ${f}`,
    rank: "Rank", score: "PRO-SCORE", empty: "This unit has no ranked profiles yet.", report: "Need a custom report for this unit?", reportD: "ISA prepares research capacity reports on request (paid; quote first). Viewing public profiles is always free.",
    reportBtn: "Send a request to ISA", unitPage: "Full unit page", date: (s: string) => `Data as of ${s}`, ref: "PRO-SCORE1000™ is a simulated reference index, not an official assessment.",
  },
};

/** Trang #/nha-truong?u=<mã đơn vị>&f=<ngành>: tổng hợp năng lực nghiên cứu của một trường, viện từ dữ liệu hồ sơ công khai (không tải thêm dữ liệu). */
export function SchoolPage({ d, query }: { d: Data; query: string }) {
  const { lang, num } = useT(), l = L[lang as LG] ?? L.vi, q = new URLSearchParams(query), [intl] = useIntlRank();
  const u = q.get("u") ?? "", f = q.get("f") ?? "";
  const byId = useMemo(() => new Map(d.institutions.map((i) => [i.id, i] as [string, Institution])), [d]);
  const label = (i: Institution | undefined) => (i ? (lang === "vi" ? i.name : i.en || i.name) : "");
  const inUnit = (x: string, root: string) => { for (let c: string | undefined = x, n = 0; c && n < 4; c = byId.get(c)?.parent, n++) if (c === root) return true; return false; };
  const go = (nu: string, nf = "") => { location.hash = `#/nha-truong?u=${encodeURIComponent(nu)}${nf ? `&f=${encodeURIComponent(nf)}` : ""}`; };
  const units = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of d.authors) { if (a.suspect) continue; const seen = new Set<string>(); for (const x of a.institutions) { if (a.instPast?.includes(x)) continue; for (let y: string | undefined = x, n = 0; y && n < 4; y = byId.get(y)?.parent, n++) if (!seen.has(y)) { seen.add(y); c.set(y, (c.get(y) ?? 0) + 1); } } }
    return d.institutions.filter((i) => (c.get(i.id) ?? 0) >= 3 && i.type !== "other").sort((a, b) => label(a).localeCompare(label(b), lang)).map((i) => [i.id, `${label(i)} (${num(c.get(i.id)!)})`] as [string, string]);
  }, [d, byId, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const S = useMemo(() => {
    if (!u) return null;
    const ppl = d.authors.filter((a) => !a.suspect && a.institutions.some((x) => !a.instPast?.includes(x) && inUnit(x, u)));
    const rk = (a: Author) => rankOf(a, intl), scored = ppl.filter((a) => a.pro != null && rk(a) != null).sort((x, y) => (y.pro ?? 0) - (x.pro ?? 0));
    const fields = new Map<string, Author[]>();
    for (const a of ppl) for (const s of a.disciplines) { const arr = fields.get(s) ?? []; arr.push(a); fields.set(s, arr); }
    const rows = [...fields].map(([s, arr]) => { const sc = arr.filter((a) => a.pro != null && rk(a) != null).sort((x, y) => (y.pro ?? 0) - (x.pro ?? 0)); return { s, n: arr.length, best: sc[0] ?? null, top2: arr.filter((a) => a.top2).length }; }).sort((a, b) => b.n - a.n);
    const top10 = scored.slice(0, 10), avg = top10.length ? top10.reduce((t, a) => t + (a.pro ?? 0), 0) / top10.length : null;
    return { n: ppl.length, ranked: scored.length, top2: ppl.filter((a) => a.top2).length, cites: ppl.reduce((t, a) => t + (a.citations || 0), 0), works: ppl.reduce((t, a) => t + (a.worksCount || 0), 0), avg, rows, scored, rk };
  }, [d, u, intl]); // eslint-disable-line react-hooks/exhaustive-deps
  const unit = byId.get(u), shown = S ? (f ? S.scored.filter((a) => a.disciplines.includes(f)) : S.scored).slice(0, 15) : [];
  return (
    <section className="school" aria-labelledby="sch-h">
      <h1 id="sch-h">{l.title}</h1>
      <p className="meta">{l.lead}</p>
      <label className="sel"><span>{l.pick}</span>
        <select id="sch-unit" value={u} onChange={(e) => go(e.target.value)}><option value="">{l.none}</option>{units.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
      {S && unit && <>
        <h2 className="sch-name">{label(unit)}</h2>
        <p className="meta">{l.scopeNote} {l.date(d.meta.built)}</p>
        <div className="sch-kpis">
          {([[l.people, num(S.n)], [l.ranked, num(S.ranked)], [l.top2, num(S.top2)], [l.cites, num(S.cites)], [l.works, num(S.works)], [l.avg, S.avg == null ? "-" : num(S.avg, 1)]] as [string, string][]).map(([k, v]) => <div key={k} className="kpi"><b>{v}</b><span>{k}</span></div>)}
        </div>
        <h2>{l.byField}</h2>
        <div className="sch-tw"><table className="sch-t"><thead><tr><th>{l.field}</th><th className="num">{l.count}</th><th className="num">{l.top2}</th><th>{l.best}</th></tr></thead><tbody>
          <tr className={f === "" ? "on" : ""}><td><a href={`#/nha-truong?u=${encodeURIComponent(u)}`}>{l.all}</a></td><td className="num">{num(S.n)}</td><td className="num">{num(S.top2)}</td><td>{S.scored[0] ? <a href={`#/tac-gia/${encodeURIComponent(S.scored[0].id)}`}>{S.scored[0].name}</a> : "-"}</td></tr>
          {S.rows.map((r) => <tr key={r.s} className={f === r.s ? "on" : ""}><td><a href={`#/nha-truong?u=${encodeURIComponent(u)}&f=${encodeURIComponent(r.s)}`}>{dName(r.s, lang as LG)}</a></td><td className="num">{num(r.n)}</td><td className="num">{num(r.top2)}</td><td>{r.best ? <a href={`#/tac-gia/${encodeURIComponent(r.best.id)}`}>{r.best.name}</a> : "-"}</td></tr>)}
        </tbody></table></div>
        <h2>{f ? l.exFor(dName(f, lang as LG)) : l.experts}</h2>
        {shown.length === 0 ? <p className="empty">{l.empty}</p> : <ol className="sch-ex">{shown.map((a) => <li key={a.id}><a href={`#/tac-gia/${encodeURIComponent(a.id)}`}><b>{a.name}</b><small>{a.disciplines.map((s) => dName(s, lang as LG)).join(" · ")}</small></a><span className="hs">{num(a.pro ?? 0, 1)}<small>#{num(S.rk(a) ?? 0)}</small></span></li>)}</ol>}
        <div className="banner" role="note"><p><b>{l.report}</b> {l.reportD}</p>
          <p><a className="btn" href={`#/hop-tac?org=${encodeURIComponent(label(unit))}&need=report`}>{l.reportBtn}</a> <a className="ghost-link" href={`/don-vi/${encodeURIComponent(u)}/`}>{l.unitPage}</a></p></div>
        <p className="meta">{l.ref}</p>
      </>}
      {!u && <p className="empty">{l.none}</p>}
    </section>
  );
}
