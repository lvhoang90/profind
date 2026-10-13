import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { Icon } from "./icons";
import { Pager, PAGE } from "./Pager";

/** Đơn vị thí điểm công bố trong nước theo hồ sơ (nguồn STI.gov.vn). Phải trùng meta.unit của public/data/sti-pilot.json (có test kiểm). */
export const STI_PILOT_UNIT = "hmu";

type Row = [id: number, title: string, year: number, issn: string, journal: string, cites: number, why: string];
type Pilot = { meta: { unit: string; unitName: { vi: string; en: string }; fetched: string }; by: Record<string, Row[]> };
let cache: Promise<Pilot> | null = null;
const load = () => (cache ??= fetch("./data/sti-pilot.json").then((r) => { if (!r.ok) throw new Error("sti"); return r.json() as Promise<Pilot>; }).catch((e) => { cache = null; throw e; }));

/** Liên kết tìm theo họ tên công khai trên cổng STI.gov.vn (tham số q của trang /publication tìm trên mọi trường). */
export const stiSearchUrl = (name: string) => `https://sti.gov.vn/publication?q=${encodeURIComponent(name.replace(/\s+/g, " ").trim())}`;
/** Liên kết tới bản ghi công bố trên STI (cổng nhận mã số thập phân trần ở cuối đường dẫn). */
export const stiRecordUrl = (id: number) => `https://sti.gov.vn/publication/${encodeURIComponent(String(id))}`;
/** Tên có ký tự ngoài ASCII (tức có dấu tiếng Việt) thì STI mới khớp được. */
export const hasDiacritics = (s: string) => /[^\u0000-\u007F]/.test(s);

/** Mục "Công bố trong nước (nguồn STI)" của hồ sơ thuộc đơn vị thí điểm: chưa xác thực, không tính vào PRO-SCORE1000™; tối đa 25 mục mỗi trang. Không có kết quả thì không hiện gì. */
export function StiPilot({ id, institutions }: { id: string; institutions: string[] }) {
  const { lang, t, num } = useT(), on = institutions.includes(STI_PILOT_UNIT);
  const [d, setD] = useState<Pilot | null>(null), [err, setErr] = useState(false), [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [id]);
  useEffect(() => { if (!on) return; let live = true; setErr(false); load().then((x) => live && setD(x)).catch(() => live && setErr(true)); return () => { live = false; }; }, [on]);
  if (!on) return null;
  const rows = d?.by[id] ?? [];
  if (d && !rows.length) return null;
  const why = (w: string) => (w === "d" ? t("stiWhyDoi") : w === "t" ? t("stiWhyTitle") : w === "ni" ? t("stiWhyNameIssn") : t("stiWhyName"));
  return (
    <section className="card sti-pilot" aria-labelledby="sti-h">
      <h2 id="sti-h">{t("stiH")} {d && <small>({num(rows.length)})</small>}</h2>
      <p className="banner" role="note"><Icon n="info" /><span><b>{t("stiBadge")}.</b> {t("stiNote", { u: d ? (lang === "vi" ? d.meta.unitName.vi : d.meta.unitName.en) : "" })}</span></p>
      {err ? <p className="meta" role="alert">{t("stiFail")}</p> : !d ? <p className="meta" role="status">{t("stiLoad")}</p> : <>
        <ol className="wk-list">{rows.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
          <li key={r[0]} className="wk"><span className="wy">{r[2] || "–"}</span>
            <div className="wm"><a className="wt2" href={stiRecordUrl(r[0])} target="_blank" rel="noopener noreferrer">{r[1]}<span className="sr"> {t("newTab")}</span></a>
              <div className="wsrc">{r[4] && <span>{r[4]}</span>}{r[3] && <span className="issn">ISSN {r[3]}</span>}<span className="issn">{why(r[6])}</span></div>
              <div className="wlinks"><a className="chip" href={stiRecordUrl(r[0])} target="_blank" rel="noopener noreferrer">{t("stiOpen")} ↗<span className="sr"> {t("newTab")}</span></a></div></div>
            <div className="wr"><span className="wc"><Icon n="chart" size={14} />{t("stiCites", { n: num(r[5]) })}</span></div></li>))}</ol>
        <Pager page={page} total={rows.length} set={setPage} />
      </>}
    </section>
  );
}
