import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useT } from "./i18n";
import { DISC, dName } from "./disciplines";
import { rankOf, useIntlRank } from "./intlPref";
import { provName } from "./provinces";
import type { Author, Data, Institution } from "./types";
import "./business.css";

type LG = "vi" | "en";
const L = {
  vi: {
    title: "Tìm chuyên gia cho doanh nghiệp",
    lead: "Tìm chuyên gia tư vấn, nhóm nghiên cứu, đối tác chuyển giao công nghệ hoặc diễn giả theo lĩnh vực. Hồ sơ công khai trên ProFind luôn miễn phí; báo cáo riêng làm theo yêu cầu có phí, ISA báo giá trước.",
    privacy: "ISA đóng vai trò kết nối: yêu cầu của bạn chỉ gửi tới ISA và ISA không chuyển thông tin cho nhà khoa học khi chưa được bạn đồng ý. Trang này không hiển thị email hay số điện thoại cá nhân.",
    filters: "Bộ lọc", field: "Lĩnh vực", anyField: "Tất cả lĩnh vực", kw: "Tên hoặc đơn vị", kwPh: "Ví dụ: Nguyễn, Bách khoa", type: "Loại đơn vị", anyType: "Tất cả loại", prov: "Tỉnh, thành", anyProv: "Cả nước",
    top2: "Chỉ Top 2% thế giới", reset: "Xóa bộ lọc",
    tabE: "Chuyên gia tư vấn", tabT: "Nhóm nghiên cứu, đơn vị", found: (n: string) => `${n} kết quả`,
    score: "PRO-SCORE", rank: "Hạng", top2b: "Top 2%", invite: "Mời tư vấn", propose: "Đề nghị hợp tác", more: (n: string) => `Xem thêm (${n})`,
    people: "Số nhà khoa học", strong: "có xếp hạng", lead1: "Người đứng đầu", noExp: "Không có chuyên gia phù hợp với bộ lọc này.", noTeam: "Không có đơn vị phù hợp với bộ lọc này.",
    ref: "PRO-SCORE1000™ là chỉ số tham khảo mô phỏng, không thay thế đánh giá chính thức.", date: (s: string) => `Dữ liệu ngày ${s}.`,
    teamNote: "Đơn vị tính gồm cả đơn vị cha; xếp theo số nhà khoa học có xếp hạng trong lĩnh vực đã chọn.", main: "Đơn vị",
  },
  en: {
    title: "Find experts for business",
    lead: "Find consultants, research groups, technology transfer partners or speakers by field. Public profiles on ProFind are always free; custom reports prepared on request are paid and ISA quotes a price first.",
    privacy: "ISA acts as a go-between: your request goes to ISA only, and ISA never passes your details to a scientist without your consent. This page shows no personal email or phone numbers.",
    filters: "Filters", field: "Field", anyField: "All fields", kw: "Name or institution", kwPh: "E.g. Nguyen, Polytechnic", type: "Type of unit", anyType: "All types", prov: "Province or city", anyProv: "Nationwide",
    top2: "World top 2% only", reset: "Clear filters",
    tabE: "Consultants", tabT: "Research groups, units", found: (n: string) => `${n} results`,
    score: "PRO-SCORE", rank: "Rank", top2b: "Top 2%", invite: "Invite to consult", propose: "Propose collaboration", more: (n: string) => `Show more (${n})`,
    people: "Scientists", strong: "ranked", lead1: "Top researcher", noExp: "No experts match these filters.", noTeam: "No units match these filters.",
    ref: "PRO-SCORE1000™ is a simulated reference index, not an official assessment.", date: (s: string) => `Data as of ${s}.`,
    teamNote: "Units include their parent units; sorted by the number of ranked scientists in the chosen field.", main: "Unit",
  },
};
const PAGE = 30;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export function BusinessPage({ d, query }: { d: Data; query: string }) {
  const { lang, num } = useT(), l = L[lang as LG] ?? L.vi, lg = lang as LG, [intl] = useIntlRank();
  const q = new URLSearchParams(query);
  const u = q.get("u") ?? "", t = q.get("t") ?? "", p = q.get("p") ?? "", top = q.get("top") === "1", tab = q.get("tab") === "team" ? "team" : "exp", qq = q.get("q") ?? "";
  const [kw, setKw] = useState(qq), dkw = useDeferredValue(kw), [lim, setLim] = useState(PAGE);
  const set = (patch: Record<string, string>, replace = false) => {
    const n = new URLSearchParams(query); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    const s = n.toString(), h = `#/doanh-nghiep${s ? "?" + s : ""}`;
    if (replace) location.replace(h); else location.hash = h;
  };
  useEffect(() => { setLim(PAGE); }, [u, t, p, top, dkw, tab]);
  useEffect(() => { if (kw === qq) return; const id = setTimeout(() => set({ q: kw.trim() }, true), 600); return () => clearTimeout(id); }, [kw]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(d.institutions.map((i) => [i.id, i] as [string, Institution])), [d]);
  const label = (i: Institution | undefined) => (i ? (lg === "vi" ? i.name : i.en || i.name) : "");
  const chain = (x: string) => { const r: string[] = []; for (let c: string | undefined = x, n = 0; c && n < 4; c = byId.get(c)?.parent, n++) r.push(c); return r; };
  const cityOf = (x: string) => { for (const c of chain(x)) { const v = byId.get(c)?.city; if (v) return v; } return null; };
  // Chuẩn bị một lần: đơn vị đang công tác, chuỗi đơn vị cha, chuỗi tìm kiếm.
  const base = useMemo(() => d.authors.filter((a) => !a.suspect && a.pro != null).map((a) => {
    const cur = a.institutions.filter((x) => !a.instPast?.includes(x)), all = new Set<string>(); cur.forEach((x) => chain(x).forEach((y) => all.add(y)));
    const types = new Set<string>(), provs = new Set<string>(); all.forEach((y) => { const i = byId.get(y); if (i) types.add(i.type); }); cur.forEach((x) => { const c = cityOf(x); if (c) provs.add(c); });
    const hay = norm(a.name + " " + [...all].map((y) => { const i = byId.get(y); return i ? `${i.name} ${i.en} ${i.abbr ?? ""}` : ""; }).join(" "));
    return { a, cur, all: [...all], types, provs, hay };
  }), [d, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  const typeOpts = useMemo(() => { const s = new Set<string>(); base.forEach((b) => b.types.forEach((x) => s.add(x))); return [...s].filter((x) => x !== "other").map((x) => [x, d.types[x]?.[lg] ?? x] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], lang)); }, [base, d, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const provOpts = useMemo(() => { const s = new Set<string>(); base.forEach((b) => b.provs.forEach((x) => s.add(x))); return [...s].map((x) => [x, provName(x, lg)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], lang)); }, [base, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const discOpts = useMemo(() => Object.keys(DISC).map((k) => [k, dName(k, lg)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], lang)), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const res = useMemo(() => {
    const k = norm(dkw.trim()), words = k ? k.split(/\s+/) : [];
    const rows = base.filter((b) => (!u || b.a.disciplines.includes(u)) && (!top || b.a.top2) && (!t || b.types.has(t)) && (!p || b.provs.has(p)) && words.every((w) => b.hay.includes(w)));
    const rk = (a: Author) => rankOf(a, intl);
    const ranked = rows.filter((b) => rk(b.a) != null).sort((x, y) => (y.a.pro ?? 0) - (x.a.pro ?? 0));
    const g = new Map<string, { n: number; ranked: number; top2: number; best: Author | null }>();
    for (const b of rows) {
      const has = rk(b.a) != null;
      for (const y of b.all) { const e = g.get(y) ?? { n: 0, ranked: 0, top2: 0, best: null }; e.n++; if (has) e.ranked++; if (b.a.top2) e.top2++; if (has && (!e.best || (b.a.pro ?? 0) > (e.best.pro ?? 0))) e.best = b.a; g.set(y, e); }
    }
    const teams = [...g].map(([id, e]) => ({ id, ...e })).filter((e) => e.ranked >= 2 && byId.get(e.id)?.type !== "other").sort((x, y) => y.ranked - x.ranked || y.top2 - x.top2 || y.n - x.n);
    return { ranked, teams, rk };
  }, [base, u, top, t, p, dkw, intl, byId]);

  const list = tab === "exp" ? res.ranked : res.teams, total = list.length;
  const filtered = !!(u || t || p || top || qq || kw);
  const tabLink = (v: string) => { set({ tab: v === "team" ? "team" : "" }); };
  const fieldLabel = (a: Author) => a.disciplines.slice(0, 3).map((s) => dName(s, lg)).join(" · ");
  const main = (a: Author) => { const c = a.institutions.find((x) => !a.instPast?.includes(x)); return label(byId.get(c ?? "")); };

  return (
    <section className="business" aria-labelledby="biz-h">
      <h1 id="biz-h">{l.title}</h1>
      <p className="meta">{l.lead}</p>
      <div className="banner" role="note"><p>{l.privacy}</p></div>
      <form className="biz-f" role="search" aria-label={l.filters} onSubmit={(e) => { e.preventDefault(); set({ q: kw.trim() }, true); }}>
        <label><span>{l.field}</span><select value={u} onChange={(e) => set({ u: e.target.value })}><option value="">{l.anyField}</option>{discOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label><span>{l.kw}</span><input type="search" value={kw} placeholder={l.kwPh} onChange={(e) => setKw(e.target.value)} autoComplete="off" /></label>
        <label><span>{l.type}</span><select value={t} onChange={(e) => set({ t: e.target.value })}><option value="">{l.anyType}</option>{typeOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label><span>{l.prov}</span><select value={p} onChange={(e) => set({ p: e.target.value })}><option value="">{l.anyProv}</option>{provOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label className="chk"><input type="checkbox" checked={top} onChange={(e) => set({ top: e.target.checked ? "1" : "" })} /><span>{l.top2}</span></label>
        {filtered && <button type="button" className="ghost" onClick={() => { setKw(""); location.replace(`#/doanh-nghiep${tab === "team" ? "?tab=team" : ""}`); }}>{l.reset}</button>}
      </form>
      <div className="biz-tabs" role="tablist">
        <button role="tab" id="biz-t1" aria-selected={tab === "exp"} aria-controls="biz-p" onClick={() => tabLink("exp")}>{l.tabE} <em>{num(res.ranked.length)}</em></button>
        <button role="tab" id="biz-t2" aria-selected={tab === "team"} aria-controls="biz-p" onClick={() => tabLink("team")}>{l.tabT} <em>{num(res.teams.length)}</em></button>
      </div>
      <div id="biz-p" role="tabpanel" aria-labelledby={tab === "exp" ? "biz-t1" : "biz-t2"} aria-live="polite">
        {tab === "team" && <p className="meta">{l.teamNote}</p>}
        {total === 0 && <p className="empty">{tab === "exp" ? l.noExp : l.noTeam}</p>}
        {tab === "exp" && <ul className="biz-list">{res.ranked.slice(0, lim).map(({ a }) => (
          <li key={a.id} className="biz-card">
            <div className="biz-main">
              <h3><a href={`#/tac-gia/${encodeURIComponent(a.id)}`}>{a.name}</a></h3>
              <p className="biz-org">{main(a) || "-"}</p>
              <p className="biz-fld">{fieldLabel(a)}</p>
            </div>
            <div className="biz-side">
              <span className="biz-sc" title={l.score}><b>{num(a.pro ?? 0, 1)}</b><small>{l.rank} #{num(res.rk(a) ?? 0)}</small></span>
              {a.top2 && <span className="biz-top">{l.top2b}</span>}
              <a className="btn" href={`#/hop-tac?a=${encodeURIComponent(a.id)}&n=${encodeURIComponent(a.name)}&need=expert`}>{l.invite}</a>
            </div>
          </li>))}</ul>}
        {tab === "team" && <ul className="biz-list">{res.teams.slice(0, lim).map((e) => { const i = byId.get(e.id), nm = label(i); return (
          <li key={e.id} className="biz-card">
            <div className="biz-main">
              <h3>{nm}</h3>
              <p className="biz-org">{[i && d.types[i.type]?.[lg], provName(i?.city, lg)].filter(Boolean).join(" · ")}</p>
              <p className="biz-fld">{l.people}: <b>{num(e.n)}</b> ({num(e.ranked)} {l.strong}) · {l.top2b}: <b>{num(e.top2)}</b></p>
              {e.best && <p className="biz-fld">{l.lead1}: <a href={`#/tac-gia/${encodeURIComponent(e.best.id)}`}>{e.best.name}</a></p>}
            </div>
            <div className="biz-side"><a className="btn" href={`#/hop-tac?org=${encodeURIComponent(nm)}&need=team`}>{l.propose}</a></div>
          </li>); })}</ul>}
        {total > lim && <p className="biz-more"><button type="button" className="ghost" onClick={() => setLim(lim + PAGE)}>{l.more(num(total - lim))}</button></p>}
      </div>
      <p className="meta">{l.ref} {l.date(d.meta.built)}</p>
    </section>
  );
}
