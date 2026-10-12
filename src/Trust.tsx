import { useId, useState } from "react";
import { useT } from "./i18n";
import { Icon } from "./icons";
import type { Author } from "./types";

// Khối "Độ tin cậy hồ sơ": một dòng tóm tắt luôn hiện, chi tiết mở bằng nút. Chạy tốt khi a.prov vắng mặt.
export function TrustBlock({ a, verified, built }: { a: Author; verified: boolean; built?: string }) {
  const { t, num } = useT();
  const [open, setOpen] = useState(false), id = useId();
  const fix = a.prov?.fix, ev = a.prov?.instEv;
  const status = verified ? "Ok" : a.claimed ? "Claimed" : "No";
  const day = (built ?? "").slice(0, 10);
  const warns: string[] = [];
  if (a.suspect) warns.push(t("trWSuspect"));
  if (a.abroadMain && !a.intl) warns.push(t("trWAbroad"));
  if (a.intl) warns.push(t("trWIntl"));
  if (ev === "weak" || ev === "none") warns.push(t("trWInst"));
  const fixes: string[] = [];
  if (fix?.excl) fixes.push(t("trFixExcl", { n: num(fix.excl) }));
  if (fix?.merged) fixes.push(t("trFixMerged", { n: num(fix.merged) }));
  if (fix?.assign) fixes.push(t("trFixAssign", { n: num(fix.assign) }));
  if (fix?.units) fixes.push(t("trFixUnits"));
  const srcs = [t("trSrcOA"), a.orcid ? t("trSrcOrcid") : "", a.top2 ? t("trSrcTop2") : "", t("trSrcJn")].filter(Boolean);
  return (
    <section className={`trust${warns.length ? " has-warn" : ""}`} aria-label={t("trH")}>
      <div className="trust-sum">
        <Icon n={warns.length ? "info" : "shield"} size={20} />
        <p><b>{t("trH")}</b>
          <span className={`tchip st-${status.toLowerCase()}`}>{t(`trSum${status}` as "trSumOk")}</span>
          {day && <span className="tchip">{t("trData", { d: day })}</span>}
          <span className={`tchip${warns.length ? " warn" : ""}`}>{warns.length ? t("trWarnN", { n: warns.length }) : t("trNoWarn")}</span></p>
        <button type="button" className="ghost sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? t("trClose") : t("trOpen")}</button>
      </div>
      {open && <div className="trust-body" id={id}>
        <dl>
          <dt>{t("trStatus")}</dt><dd>{t(`trSt${status}` as "trStOk")}</dd>
          <dt>{t("trBuilt")}</dt><dd>{day || "-"}</dd>
          <dt>{t("trSrc")}</dt><dd><ul>{srcs.map((s) => <li key={s}>{s}</li>)}</ul></dd>
          <dt>{t("trFix")}</dt><dd>{fixes.length ? <ul>{fixes.map((s) => <li key={s}>{s}</li>)}</ul> : t("trFixNone")}</dd>
          {warns.length > 0 && <><dt className="wdt">{t("trWarn")}</dt><dd><ul className="wl">{warns.map((s) => <li key={s}>{s}</li>)}</ul></dd></>}
        </dl>
        <p className="trust-links"><a href={`#/dinh-chinh/${encodeURIComponent(a.id)}`}>{t("trLCorr")}</a><a href="#/pro-score">{t("trLMeth")}</a><a href="/nguon/">{t("trLSrc")}</a></p>
      </div>}
    </section>
  );
}

export type WhyKey = "whyName" | "whyInst" | "whyOrcid" | "whyId" | "whyDisc" | "whyWork" | "whyJn";
export function WhyChips({ why }: { why: WhyKey[] }) {
  const { t } = useT();
  if (!why.length) return null;
  return <ul className="why" aria-label={t("why")}><li className="why-h">{t("why")}:</li>{why.map((k) => <li key={k} className="whyc">{t(k)}</li>)}</ul>;
}
