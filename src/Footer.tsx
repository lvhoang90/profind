import { useT } from "./i18n";
import { Icon } from "./icons";
import { useAccount, api } from "./accountStore";
import { ecoUrl, evt, type App } from "./analytics";
import type { Data } from "./types";

const TOP2_DOI = "https://doi.org/10.17632/btchxktzyw.8", TOP2_LIC = "https://creativecommons.org/licenses/by-nc/3.0/";
const CONTACT = "luongviethoang.hcm@gmail.com";

/** Liên kết sang hệ sinh thái ISA: ghi sự kiện ẩn danh go_<đích>_<vị trí> và, nếu đã đăng nhập, lượt của người dùng. */
export function EcoLink({ app, place, to, className, children }: { app: App; place: string; to?: string; className?: string; children: React.ReactNode }) {
  const { user } = useAccount();
  return <a className={className} href={ecoUrl(app, place, to)} target="_blank" rel="noopener" onClick={() => { evt(`go_${app}_${place}`); if (user) api("hop", { to: app, place }).catch(() => {}); }}>{children}</a>;
}

export function Footer({ data }: { data: Data | null }) {
  const { t } = useT();
  const apps: [App, string, string][] = [["edufind", "EduFind", t("eEduDesc")], ["ami", "Ami", t("eAmiDesc")], ["may", "Mây", t("eMayDesc")]];
  return (
    <footer className="sf">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
            <p>{t("fAbout")}</p>
            <p className="sf-tag"><span className="beta">Beta</span> <span>v0.1</span></p>
          </div>
          <nav aria-labelledby="sf-h1">
            <h2 id="sf-h1">{t("fExplore")}</h2>
            <ul>
              <li><a href="#/">{t("fSearch")}</a></li>
              <li><a href="#/tai-khoan">{t("mySpace")}</a></li>
              <li><a href="#/dinh-chinh">{t("fSuggest")}</a></li>
              <li><a href="#/dinh-chinh">{t("fCorrect")}</a></li>
            </ul>
          </nav>
          <nav aria-labelledby="sf-h2">
            <h2 id="sf-h2">{t("fEco")}</h2>
            <ul className="sf-eco">
              {apps.map(([a, n, d]) => <li key={a}><EcoLink app={a} place="footer"><b>{n}</b><span>{d}</span><Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink></li>)}
            </ul>
          </nav>
          <div>
            <h2>{t("fLegal")}</h2>
            <ul>
              <li><a href="https://github.com/lvhoang90/profind/blob/main/LICENSE" target="_blank" rel="noopener">{t("fCodeLic")}</a></li>
              <li><a href="https://github.com/lvhoang90/profind/blob/main/LICENSE-CONTENT.md" target="_blank" rel="noopener">{t("fDataLic")}</a></li>
              <li><a href={`mailto:${CONTACT}`}>{t("fContact")}: {CONTACT}</a></li>
            </ul>
          </div>
        </div>
        <aside className="banner note sf-note" aria-label={t("notRankShort")}><Icon n="shield" /><p><b>{t("notRankShort")}</b> {t("notRank")}</p></aside>
        <p className="sf-src">{t("fSources")}{data && !data.meta.demo && data.meta.fetched && <> {t("srcLine", { d: data.meta.fetched })}</>}</p>
        {data?.authors.some((a) => a.top2) && (
          <details className="sf-credit"><summary>{t("fCredits")}</summary>
            <p>{t("top2Credit")} <a href={TOP2_DOI} target="_blank" rel="noopener">DOI 10.17632/btchxktzyw.8</a> · <a href={TOP2_LIC} target="_blank" rel="noopener">{t("top2Lic")}</a> · <a href="./LICENSE-NC.md" target="_blank" rel="noopener">LICENSE-NC</a></p>
          </details>)}
        <div className="sf-bottom"><p>{t("fCopy")}</p><a href="#main" className="sf-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("fTop")} ↑</a></div>
      </div>
    </footer>
  );
}
