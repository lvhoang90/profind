import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useT } from "./i18n";

type Stats = { enabled: boolean; total: number; today: number; week: number; days: { d: string; n: number }[]; countries: { c: string; n: number }[] };

/** Mắt theo dõi lượt truy cập ẩn danh (giống EduFind và Mây): góc dưới bên phải, bấm để xem tổng, hôm nay, 7 ngày và top quốc gia. */
export function VisitChip() {
  const { t, lang, num } = useT();
  const [d, setD] = useState<Stats | null>(null), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  const load = () => fetch("/api/visit").then((r) => r.json()).then((j) => { if (j?.enabled) setD(j); }).catch(() => {});
  useEffect(() => { const h = setTimeout(load, 1500); return () => clearTimeout(h); }, []);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }, esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!d) return null;
  const max = Math.max(1, ...d.days.map((x) => x.n)), maxC = Math.max(1, ...d.countries.map((x) => x.n));
  let names: Intl.DisplayNames | null = null; try { names = new Intl.DisplayNames([lang], { type: "region" }); } catch { /* bỏ qua */ }
  const dl = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" });
  return (
    <div className="visits" ref={box}>
      {open && <div className="visit-pop" role="dialog" aria-label={t("visits")}>
        <div className="vp-top"><div><b>{num(d.total)}</b><span>{t("vTotal")}</span></div><div><b>{num(d.today)}</b><span>{t("vToday")}</span></div><div><b>{num(d.week)}</b><span>{t("vWeek")}</span></div></div>
        <p className="vp-h">{t("vDays")}</p>
        <div className="vp-bars" role="img" aria-label={t("vDays")}>{d.days.map((x) => <div key={x.d} title={`${dl(x.d)}: ${num(x.n)}`}><i style={{ height: `${Math.max(4, (x.n / max) * 100)}%` }} /><span>{dl(x.d)}</span></div>)}</div>
        {d.countries.length > 0 && <><p className="vp-h">{t("vCountries")}</p><ul className="vp-c">{d.countries.map((c) => <li key={c.c}><span>{names?.of(c.c) ?? c.c}</span><span className="b"><i style={{ width: `${(c.n / maxC) * 100}%` }} /></span><span>{num(c.n)}</span></li>)}</ul></>}
        <p className="meta">{t("vNote")}</p>
      </div>}
      <button type="button" className="visit-chip" aria-expanded={open} aria-label={t("visits")} title={t("visits")} onClick={() => { setOpen(!open); if (!open) void load(); }}><Icon n="eye" size={14} /><span>{num(d.total)}</span></button>
    </div>
  );
}
