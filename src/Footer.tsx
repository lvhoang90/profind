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
  const apps: [App, string, string][] = [["edufind", t("appEdu"), t("eEduDesc")], ["ami", "Ami", t("eAmiDesc")], ["may", t("appMay"), t("eMayDesc")]];
  // Bốn nhóm liên kết cân đối (4 đến 6 mục mỗi nhóm). Mã không bắt đầu bằng "#" hoặc "/" là trang tĩnh/trang thông tin; xem href().
  const groups: [string, string, [string, string][]][] = [
    ["sf-h1", "fExplore", [["#/", "fSearch"], ["#/tai-khoan", "mySpace"], ["#/dinh-chinh", "fSuggest"], ["#/dinh-chinh", "fCorrect"]]],
    ["sf-h5", "fData", [["bang-xep-hang", "fRank"], ["pro-score", "fProScore"], ["top-2-phan-tram", "fTop2"], ["don-vi", "fUnits"], ["nganh", "fFields"], ["tinh-thanh", "fCities"]]],
    ["sf-h6", "fOrg", [["nha-truong", "fSchool"], ["doanh-nghiep", "fBiz"], ["hop-tac", "fCollab"]]],
    ["sf-h3", "fInfo", [["gioi-thieu", "fAbout2"], ["nguon", "fSrc"], ["giay-phep", "fLic"], ["rieng-tu", "fPriv"], ["lien-he", "fContact"]]],
  ];
  const href = (s: string) => s.startsWith("#") ? s : ({ "gioi-thieu": "#/gioi-thieu", "doanh-nghiep": "#/doanh-nghiep", "nha-truong": "#/nha-truong", "hop-tac": "#/hop-tac", "pro-score": "#/pro-score", "bang-xep-hang": "#/bang-xep-hang", "don-vi": "/don-vi/", "nganh": "/nganh/", "tinh-thanh": "/tinh-thanh/", "top-2-phan-tram": "/top-2-phan-tram/" } as Record<string, string>)[s] ?? `#/gioi-thieu?m=${s}`;
  return (
    <footer className="sf">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <a className="brand" href="#/" aria-label="ProFind"><img className="logo" src="./logo-disc.svg" alt="" width="40" height="40" /><b>Pro<i>Find</i></b></a>
            <p>{t("fAbout")}</p>
            <section className="sf-who" aria-label={t("sfWho")}>
              <b>Lương Việt Hoàng</b><span>ISA Vietnam</span>
              <a href="mailto:vienisavietnam@gmail.com">vienisavietnam@gmail.com</a>
              <a href="https://zalo.me/0932956067" target="_blank" rel="noopener noreferrer">Zalo +84 932 956 067</a>
            </section>
          </div>
          {groups.map(([hid, hk, items]) => (
            <nav key={hid} aria-labelledby={hid}>
              <h2 id={hid}>{t(hk as "fInfo")}</h2>
              <ul>{items.map(([s, k]) => <li key={`${s}-${k}`}><a href={href(s)}>{t(k as "fAbout2")}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <nav className="sf-ecow" aria-labelledby="sf-h2">
          <h2 id="sf-h2">{t("fEco")}</h2>
          <ul className="sf-eco">
            {apps.map(([a, n, d]) => <li key={a}><EcoLink app={a} place="footer"><b>{n}</b><span>{d}</span><Icon n="external" size={14} /><span className="sr"> {t("newTab")}</span></EcoLink></li>)}
          </ul>
        </nav>
        <div className="sf-bottom">
          <div><p>© 2026 Lương Việt Hoàng (ISA Vietnam). {t("sfCopy")}</p><p className="sf-disc">{t("sfOwner")} <a href="#/gioi-thieu?m=rieng-tu">{t("sfPriv")}</a></p><p className="sf-disc">{t("sfDisc")} {t("notRankShort")}</p></div>
          <a href="#main" className="sf-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("fTop")} ↑</a>
        </div>
      </div>
    </footer>
  );
}
