import { Icon } from "./icons";
import { useAccount } from "./accountStore";
import { useT } from "./i18n";
import { evt } from "./analytics";

/** Nút ngôi sao lưu nhà khoa học (k = "a|<mã>") hoặc công trình (k = "w|<mã>") vào Không gian của tôi. Chưa đăng nhập thì chuyển sang trang đăng nhập rồi quay lại. */
export function StarBtn({ k, meta, className = "" }: { k: string; meta: { t: string; s?: string; sc?: number; rk?: number; u?: string }; className?: string }) {
  const { t } = useT();
  const { cfg, user, favs, toggleFav } = useAccount();
  if (cfg?.enabled === false) return null;
  const on = favs.has(k);
  const go = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { try { sessionStorage.setItem("profind.ret", location.hash); sessionStorage.setItem("profind.reason", "fav"); } catch { /* bỏ qua */ } evt("save_gate"); location.hash = "#/tai-khoan"; return; }
    try { await toggleFav(k, meta); } catch (err: any) { alert(err?.message || t("saveFail")); }
  };
  const label = on ? t("unsaveStar") : t("saveStar");
  return <button type="button" className={`starbtn${on ? " on" : ""} ${className}`} aria-pressed={on} aria-label={label} title={label} onClick={(e) => void go(e)}><Icon n="star" size={18} /></button>;
}
