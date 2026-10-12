import { useEffect, useState } from "react";
import { useT } from "./i18n";
import "./trend.css";

type Y = { meta: { built: string; from: number; to: number }; units: Record<string, { t: number[]; s: number[] }> };
const T = {
  vi: { h: "Công bố theo năm", alt: (u: string, a: number, b: number) => `Biểu đồ cột số công trình khác nhau của ${u} theo năm xuất bản, ${a}-${b}.`, sc: "Bài được tính điểm", ot: "Bài còn lại", tr: "Xu hướng (3 năm, không gồm năm chưa đủ)", yr: "Năm", tot: "Tổng", load: "Đang tải biểu đồ...", none: "Chưa đủ dữ liệu để vẽ biểu đồ cho đơn vị này (cần ít nhất 20 công trình xuất bản từ 2010).", fail: "Không tải được dữ liệu biểu đồ.", note: (y: number) => `Năm ${y} chưa đủ năm (cột mờ); công trình có thể được cập nhật muộn. Mỗi công trình chỉ đếm một lần dù có nhiều đồng tác giả cùng đơn vị. Gồm hồ sơ đang công tác và đơn vị con.`, peak: (y: number, n: string) => `Đỉnh ${y}: ${n}` },
  en: { h: "Publications per year", alt: (u: string, a: number, b: number) => `Bar chart of distinct works by ${u} per publication year, ${a}-${b}.`, sc: "Scored articles", ot: "Other works", tr: "Trend (3-year, excl. incomplete year)", yr: "Year", tot: "Total", load: "Loading chart...", none: "Not enough data to chart this unit (needs at least 20 works published since 2010).", fail: "Could not load chart data.", note: (y: number) => `${y} is not a complete year (faded bar); works may be indexed late. Each work counts once even with several co-authors from the unit. Includes current staff and child units.`, peak: (y: number, n: string) => `Peak ${y}: ${n}` },
};
let cache: Promise<Y> | null = null;
const load = () => (cache ??= fetch("./data/unit-years.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Y>; }).catch((e) => { cache = null; throw e; }));
const nice = (m: number) => { const p = 10 ** Math.floor(Math.log10(Math.max(m, 1))), r = m / p, s = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10; return s * p; };

export function UnitTrend({ unit, name = "" }: { unit: string; name?: string }) {
  const { lang, num } = useT(), l = T[lang as "vi" | "en"] ?? T.vi;
  const [y, setY] = useState<Y | null>(null), [err, setErr] = useState(false);
  useEffect(() => { if (!unit) return; let off = false; setErr(false); load().then((v) => { if (!off) setY(v); }, () => { if (!off) setErr(true); }); return () => { off = true; }; }, [unit]);
  if (!unit) return null;
  const v = y?.units[unit];
  const head = <h2>{l.h}</h2>;
  if (err) return <section className="ut">{head}<p className="meta">{l.fail}</p></section>;
  if (!y) return <section className="ut">{head}<p className="meta">{l.load}</p></section>;
  if (!v) return <section className="ut">{head}<p className="empty">{l.none}</p></section>;
  const { from, to } = y.meta, n = v.t.length, W = 400, H = 210, L0 = 38, R0 = 8, T0 = 22, B0 = 28, pw = W - L0 - R0, ph = H - T0 - B0;
  const top = nice(Math.max(...v.t)), step = top / 4, bw = pw / n, X = (i: number) => L0 + i * bw, Yp = (k: number) => T0 + ph - (k / top) * ph;
  const pi = v.t.indexOf(Math.max(...v.t)), cur = n - 1;
  const tl: string[] = []; for (let i = 0; i < cur; i++) { const w = v.t.slice(Math.max(0, i - 1), Math.min(i + 1, cur - 1) + 1); tl.push(`${i ? "L" : "M"}${(X(i) + bw / 2).toFixed(1)} ${Yp(w.reduce((p, q) => p + q, 0) / w.length).toFixed(1)}`); }
  const yrs = Array.from({ length: n }, (_, i) => from + i), every = bw < 22 ? 2 : 1;
  return (
    <section className="ut" aria-labelledby="ut-h">
      <h2 id="ut-h">{l.h}</h2>
      <div className="ut-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={l.alt(name || unit, from, to)} focusable="false">
          {[0, 1, 2, 3, 4].map((k) => <g key={k}><line className={k ? "gl" : "ax"} x1={L0} x2={W - R0} y1={Yp(k * step)} y2={Yp(k * step)} /><text x={L0 - 5} y={Yp(k * step) + 4} textAnchor="end">{num(k * step)}</text></g>)}
          {v.t.map((t, i) => { const s = Math.min(v.s[i], t), x = X(i) + bw * 0.14, w = bw * 0.72, hs = (s / top) * ph, ho = ((t - s) / top) * ph; return (
            <g key={i} className={i === cur ? "cur" : ""}><rect className="b-s" x={x} y={T0 + ph - hs} width={w} height={hs} /><rect className="b-o" x={x} y={T0 + ph - hs - ho} width={w} height={ho} /></g>); })}
          {tl.length > 1 && <path className="tl" d={tl.join("")} />}
          <text className="pk" x={Math.min(Math.max(X(pi) + bw / 2, 24), W - 24)} y={Yp(v.t[pi]) - 5} textAnchor="middle">{num(v.t[pi])}</text>
          {yrs.map((yr, i) => (i % every === 0 ? <text key={yr} x={X(i) + bw / 2} y={H - 10} textAnchor="middle">{yr}</text> : null))}
        </svg>
        <div className="ut-lg"><span><i className="s" />{l.sc}</span><span><i className="o" />{l.ot}</span><span><i className="l" />{l.tr}</span></div>
        <p className="meta note">{l.peak(from + pi, num(v.t[pi]))}. {l.note(to)}</p>
      </div>
      <table className="ut-sr"><caption>{l.alt(name || unit, from, to)}</caption><thead><tr><th>{l.yr}</th><th>{l.tot}</th><th>{l.sc}</th><th>{l.ot}</th></tr></thead>
        <tbody>{yrs.map((yr, i) => <tr key={yr}><td>{yr}</td><td>{v.t[i]}</td><td>{v.s[i]}</td><td>{v.t[i] - v.s[i]}</td></tr>)}</tbody></table>
    </section>
  );
}
