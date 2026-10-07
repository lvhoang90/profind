import { useT } from "./i18n";
import { Icon } from "./icons";
import { useAccount, api } from "./accountStore";
import { ecoUrl, evt, type App } from "./analytics";
import type { Data } from "./types";


/** Liên kết sang hệ sinh thái ISA: ghi sự kiện ẩn danh go_<đích>_<vị trí> và, nếu đã đăng nhập, lượt của người dùng. */
export function EcoLink({ app, place, to, className, children }: { app: App; place: string; to?: string; className?: string; children: React.ReactNode }) {
  const { user } = useAccount();
  return <a className={className} href={ecoUrl(app, place, to)} target="_blank" rel="noopener" onClick={() => { evt(`go_${app}_${place}`); if (user) api("hop", { to: app, place }).catch(() => {}); }}>{children}</a>;
}

export function Footer({ data: _data }: { data: Data | null }) {
  const { t } = useT();
  const apps: [App, string, string][] = [["edufind", "EduFind", t("eEduDesc")], ["ami", "Ami", t("eAmiDesc")], ["may", "Mây", t("eMayDesc")]];
  const info: [string, string][] = [["gioi-thieu", "fAbout2"], ["nguon", "fSrc"], ["diem", "fScore"], ["giay-phep", "fLic"], ["rieng-tu", "fPriv"], ["lien-he", "fContact"]];
  return (
    <footer className="sf">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
            <p>{t("fAbout")}</p>
            <p className="sf-tag"><span className="beta">Beta 1.0</span></p>
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
          <nav aria-labelledby="sf-h3">
            <h2 id="sf-h3">{t("fInfo")}</h2>
            <ul>{info.map(([s, k]) => <li key={s}><a href={s === "gioi-thieu" ? "#/gioi-thieu" : `#/gioi-thieu?m=${s}`}>{t(k as "fAbout2")}</a></li>)}</ul>
          </nav>
        </div>
        <nav className="sf-ecow" aria-labelledby="sf-h2">
          <h2 id="sf-h2">{t("fEco")}</h2>
          <ul className="sf-eco">
            {apps.map(([a, n, d]) => <li key={a}><EcoLink app={a} place="footer"><b>{n}</b><span>{d}</span><Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink></li>)}
          </ul>
        </nav>
        <div className="sf-bottom"><p>© 2026 Lương Việt Hoàng, ISA Vietnam. {t("notRankShort")}</p><a href="#main" className="sf-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("fTop")} ↑</a></div>
      </div>
    </footer>
  );
}
