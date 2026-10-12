import { useEffect, useMemo, useState } from "react";
import { useT } from "./i18n";
import { dName } from "./disciplines";
import { EcoLink } from "./Footer";
import { Icon } from "./icons";
import { mayHas } from "./mayJournals";
import type { Work } from "./types";
import "./related.css";

type LG = "vi" | "en";
type RA = { t: string; y: number; j: string; d: string; c: number; q: string };
type RJ = { j: string; i: string; q: string; n: number };
type RD = { meta: { built: string; from: number }; f: Record<string, { a: RA[]; j: RJ[] }> };
const L = {
  vi: {
    title: "Gợi ý bài báo và tạp chí liên quan", open: "Xem gợi ý", close: "Thu gọn", load: "Đang tải gợi ý…", fail: "Chưa tải được gợi ý.", none: "Chưa có gợi ý cho ngành này.",
    how: "Gợi ý lấy từ các công trình của hồ sơ ProFind cùng ngành, sắp theo độ gần với tiêu đề công trình của bạn rồi theo trích dẫn mỗi năm. Đây là gợi ý tham khảo, không phải đánh giá chất lượng.",
    arts: "Bài báo nên đọc", jrs: "Tạp chí có thể cân nhắc", field: "Ngành", cites: (n: number) => `${n.toLocaleString("vi-VN")} trích dẫn`, used: "Đã đăng", inProfind: (n: number) => `${n} bài từ hồ sơ ProFind (2022 đến nay)`,
    copy: "Sao chép DOI", copied: "Đã chép", doi: "Mở bài báo", edu: "Tra trên EduFind", ami: "Phân tích tài liệu với Ami", amiHint: "Sao chép DOI hoặc tiêu đề rồi dán vào Ami để tóm tắt và đối chiếu nguồn.", may: (m: string) => `Chuẩn hóa bản thảo với ${m}`, mayHint: "Đã chọn tạp chí? Dùng để căn chỉnh bản thảo theo mẫu trình bày.", mayJ: (m: string) => `Chuẩn hóa theo tạp chí này (${m})`, amiJ: "Đọc và trích dẫn với Ami",
  },
  en: {
    title: "Related articles and journals", open: "Show suggestions", close: "Collapse", load: "Loading suggestions…", fail: "Could not load suggestions.", none: "No suggestions for this field yet.",
    how: "Suggestions come from works by ProFind profiles in the same field, ordered by closeness to your own titles and then by citations per year. They are a reference, not a quality rating.",
    arts: "Articles worth reading", jrs: "Journals to consider", field: "Field", cites: (n: number) => `${n.toLocaleString("en-US")} citations`, used: "Published", inProfind: (n: number) => `${n} works from ProFind profiles (2022 to date)`,
    copy: "Copy DOI", copied: "Copied", doi: "Open article", edu: "Look up on EduFind", ami: "Analyse sources with Ami", amiHint: "Copy a DOI or title and paste it into Ami to summarise and check sources.", may: (m: string) => `Format your manuscript with ${m}`, mayHint: "Picked a journal? Use it to align your manuscript with a template.", mayJ: (m: string) => `Format for this journal (${m})`, amiJ: "Read and cite with Ami",
  },
};
const STOP = new Set("the of and for in on to a an with by from using based study analysis approach new its are is as at or into via vietnam viet nam trong cua va cho cac nhung mot ve voi theo tai".split(" "));
const words = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
// Đường dẫn đích sang Ami: /?journal=<tên>. Mã hóa kín (cả ! ' ( ) *) để khớp biểu thức của cổng /go ([\w\-.~%=&]); Ami cắt tên ở 140 ký tự.
export const amiJournalPath = (name: string) => `/?journal=${encodeURIComponent(name.replace(/\s+/g, " ").trim().slice(0, 120)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
let cache: Promise<RD> | null = null;
const load = () => (cache ??= fetch("./data/related.json").then((r) => { if (!r.ok) throw new Error("related"); return r.json() as Promise<RD>; }).catch((e) => { cache = null; throw e; }));

/** Khối gợi ý bài báo và tạp chí liên quan trên trang hồ sơ: tải related.json (khoảng 270 KB) khi người dùng mở; chọn bài theo độ gần tiêu đề với công trình của chính hồ sơ. */
export function Related({ disciplines, works, edufind }: { disciplines: string[]; works: Work[] | null; edufind: string }) {
  const { lang, t } = useT(), l = L[lang as LG] ?? L.vi;
  const [openR, setOpenR] = useState(false), [d, setD] = useState<RD | null>(null), [err, setErr] = useState(false), [fld, setFld] = useState(disciplines[0] ?? ""), [copied, setCopied] = useState("");
  useEffect(() => { if (!openR || d) return; let live = true; setErr(false); load().then((x) => live && setD(x)).catch(() => live && setErr(true)); return () => { live = false; }; }, [openR, d]);
  useEffect(() => { if (!disciplines.includes(fld)) setFld(disciplines[0] ?? ""); }, [disciplines, fld]);
  const own = useMemo(() => { const dois = new Set((works ?? []).map((w) => (w.doi ?? "").toLowerCase()).filter(Boolean)), issns = new Set((works ?? []).map((w) => w.issn).filter(Boolean)); const bag = new Set<string>(); for (const w of (works ?? []).slice(0, 40)) for (const x of words(w.title)) bag.add(x); return { dois, issns, bag }; }, [works]);
  const R = useMemo(() => {
    const e = d?.f[fld]; if (!e) return null;
    const arts = e.a.filter((x) => !own.dois.has(x.d.toLowerCase())).map((x) => { let hit = 0; for (const w of words(x.t)) if (own.bag.has(w)) hit++; return { x, hit }; }).sort((p, q) => q.hit - p.hit || q.x.c - p.x.c).slice(0, 5).map((p) => p.x);
    const jrs = [...e.j.filter((x) => !own.issns.has(x.i)), ...e.j.filter((x) => own.issns.has(x.i))].slice(0, 8);
    return { arts, jrs };
  }, [d, fld, own]);
  if (!disciplines.length) return null;
  const copy = async (doi: string) => { try { await navigator.clipboard.writeText(doi); setCopied(doi); setTimeout(() => setCopied(""), 1500); } catch { /* bỏ qua */ } };
  return (
    <section className="rel" aria-labelledby="rel-h">
      <div className="rel-hd"><h2 id="rel-h">{l.title}</h2><button type="button" className="ghost sm" aria-expanded={openR} aria-controls="rel-body" onClick={() => setOpenR(!openR)}>{openR ? l.close : l.open}</button></div>
      {openR && <div id="rel-body" className="rel-body">
        {err ? <p className="meta" role="alert">{l.fail}</p> : !d ? <p className="meta" role="status">{l.load}</p> : <>
          {disciplines.length > 1 && <label className="sel rel-f"><span>{l.field}</span><select id="rel-field" value={fld} onChange={(e) => setFld(e.target.value)}>{disciplines.map((s) => <option key={s} value={s}>{dName(s, lang as LG)}</option>)}</select></label>}
          <p className="meta">{l.how}</p>
          {!R || (!R.arts.length && !R.jrs.length) ? <p className="empty">{l.none}</p> : <div className="rel-cols">
            <div><h3>{l.arts}</h3><ol className="rel-list">{R.arts.map((x) => <li key={x.d}>
              <b>{x.t}</b><small>{x.j} · {x.y} · {x.q} · {l.cites(x.c)}</small>
              <span className="rel-act"><a className="chip" href={`https://doi.org/${encodeURIComponent(x.d).replace(/%2F/g, "/")}`} target="_blank" rel="noopener">{l.doi} ↗<span className="sr"> {t("newTab")}</span></a><button type="button" className="chip" onClick={() => void copy(x.d)} aria-live="polite">{copied === x.d ? l.copied : l.copy}</button></span></li>)}</ol>
              <p className="rel-eco"><EcoLink app="ami" place="related-article" className="chip"><Icon n="link" size={14} /> {l.ami}<span className="sr"> {t("newTab")}</span></EcoLink> <span className="meta">{l.amiHint}</span></p></div>
            <div><h3>{l.jrs}</h3><ol className="rel-list">{R.jrs.map((x) => <li key={x.i}>
              <b>{x.j}</b><small>{x.q} · ISSN {x.i} · {l.inProfind(x.n)}{own.issns.has(x.i) ? ` · ${l.used}` : ""}</small>
              <span className="rel-act"><EcoLink app="ami" place="related-journal" to={amiJournalPath(x.j)} className="chip">{l.amiJ} ↗<span className="sr"> {t("newTab")}</span></EcoLink><a className="chip" href={`${edufind}/${fld}/?tab=international&q=${encodeURIComponent(x.i)}`} target="_blank" rel="noopener">{l.edu} ↗<span className="sr"> {t("newTab")}</span></a>{mayHas(x.i) && <EcoLink app="may" place="related-journal" to={`/?issn=${x.i}`} className="chip">{l.mayJ(t("appMay"))}<span className="sr"> {t("newTab")}</span></EcoLink>}</span></li>)}</ol>
              <p className="rel-eco"><EcoLink app="may" place="related-journal" className="chip"><Icon n="spark" size={14} /> {l.may(t("appMay"))}<span className="sr"> {t("newTab")}</span></EcoLink> <span className="meta">{l.mayHint}</span></p></div>
          </div>}
        </>}
      </div>}
    </section>
  );
}
