import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { Icon } from "./icons";

/** Chức danh (học hàm, học vị) lấy từ hồ sơ nhà khoa học công khai của cổng STI.gov.vn, chỉ cho hồ sơ khớp chắc (public/data/sti-titles.json, dựng bằng scripts/build-sti-titles.mjs). Chưa xác thực, không tính vào PRO-SCORE1000™. */
type Titles = { by: Record<string, string> };
let cache: Promise<Titles> | null = null;
const load = () => (cache ??= fetch("./data/sti-titles.json").then((r) => { if (!r.ok) throw new Error("sti-titles"); return r.json() as Promise<Titles>; }).catch((e) => { cache = null; throw e; }));
const VALID = /^(GS|PGS)(\.(TS|TSKH|ThS))?$|^(TS|TSKH|ThS)$/;

/** Dòng "PGS.TS · theo STI.gov.vn" cạnh tên; `hidden` (hồ sơ đã ẩn/gỡ theo yêu cầu) thì không hiện. Không có kết quả hoặc lỗi mạng thì không hiện gì. */
export function StiTitle({ id, hidden }: { id: string; hidden: boolean }) {
  const { t } = useT();
  const [title, setTitle] = useState<string>("");
  useEffect(() => {
    let live = true; setTitle("");
    if (!hidden) load().then((d) => { const v = d.by[id]; if (live && v && VALID.test(v)) setTitle(v); }).catch(() => undefined);
    return () => { live = false; };
  }, [id, hidden]);
  if (hidden || !title) return null;
  return (
    <p className="sti-title meta" title={t("stiTitleTip")}>
      <b>{title}</b> · <span>{t("stiTitleSrc")}</span>
      {" "}<a href={`#/dinh-chinh/${encodeURIComponent(id)}`} title={t("stiTitleBadTip")}><Icon n="info" size={14} /> {t("stiTitleBad")}</a>
    </p>
  );
}
