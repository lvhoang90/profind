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
  const info: [string, string][] = [["gioi-thieu", "fAbout2"], ["nguon", "fSrc"], ["pro-score", "fProScore"], ["giay-phep", "fLic"], ["rieng-tu", "fPriv"], ["lien-he", "fContact"]];
  return (
    <footer className="sf">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
            <p>{t("fAbout")}</p>
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
            <ul>{info.map(([s, k]) => <li key={s}><a href={s === "gioi-thieu" ? "#/gioi-thieu" : s === "pro-score" ? "#/pro-score" : `#/gioi-thieu?m=${s}`}>{t(k as "fAbout2")}</a></li>)}</ul>
          </nav>
          <section className="sf-who" aria-labelledby="sf-h4">
            <h2 id="sf-h4">{t("sfWho")}</h2>
            <b>Lương Việt Hoàng</b><span>ISA Vietnam</span>
              <ul><li><a href="mailto:luongviethoang.hcm@gmail.com">luongviethoang.hcm@gmail.com</a></li><li><a href="https://zalo.me/0932956067" target="_blank" rel="noopener noreferrer">Zalo +84 932 956 067</a></li></ul>
          </section>
        </div>
        <nav className="sf-ecow" aria-labelledby="sf-h2">
          <h2 id="sf-h2">{t("fEco")}</h2>
          <ul className="sf-eco">
            {apps.map(([a, n, d]) => <li key={a}><EcoLink app={a} place="footer"><b>{n}</b><span>{d}</span><Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink></li>)}
          </ul>
        </nav>
        <div className="sf-bottom">
          <div><p>© 2026 Lương Việt Hoàng (ISA Vietnam). {t("sfCopy")}</p><p className="sf-disc">{t("sfDisc")} {t("notRankShort")}</p></div>
          <a href="#main" className="sf-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("fTop")} ↑</a>
        </div>
      </div>
    </footer>
  );
}
